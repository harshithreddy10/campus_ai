import json
import os
import re
import shutil
import uuid

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_admin
from app.core.config import settings
from app.database.connection import get_db
from app.models.db_models import AuditLog, Setting, Syllabus, User
from app.schemas.schemas import SyllabusResponse
from app.services.ai.llm import query_local_llm
from app.services.materials.extractor import extract_content

router = APIRouter(prefix="/syllabus", tags=["Syllabus Management"])


async def query_syllabus_from_llm(text_content: str) -> dict:
    """Send syllabus text to local Ollama and return structured details."""
    system_prompt = (
        "You are an academic curriculum parser. Extract the syllabus structure from the provided text and return ONLY a valid JSON object matching this schema. Do not output reasoning steps. Do not include markdown wraps.\n"  # noqa: E501
        "Schema:\n"
        "{\n"
        '  "subject": "String representing the subject name",\n'
        '  "code": "Subject code (e.g. CS-302, ME-201, etc.)",\n'
        '  "semester": "Semester number",\n'
        '  "department": "Department (e.g. CSE, Mechanical, etc.)",\n'
        '  "units": "A formatted text detailing each Unit and its topics. E.g. Unit 1: Introduction (topics: normal forms, schema mapping). Unit 2: Query plans...",\n'  # noqa: E501
        '  "learning_outcomes": "Key course learning outcomes",\n'
        '  "reference_books": "Recommended reference books and textbooks"\n'
        "}"
    )

    truncated_text = text_content[:4000]
    prompt = f"Analyze the syllabus text and extract structure:\n\n{truncated_text}"

    raw_output = await query_local_llm(prompt, system_prompt)

    try:
        json_match = re.search(r"\{.*\}", raw_output, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(0))
        return json.loads(raw_output)
    except Exception as e:
        print(f"Failed parsing syllabus JSON from LLM: {e}. Raw: {raw_output}")
        return {
            "subject": "Unknown Subject",
            "code": f"UNKNOWN-{uuid.uuid4().hex[:4].upper()}",
            "semester": "Unknown",
            "department": "Unknown",
            "units": text_content[:1000],
            "learning_outcomes": "None",
            "reference_books": "None",
        }


async def process_syllabus_async(syllabus_id: int, file_path: str, ocr_enabled: bool):
    """Background task to extract syllabus text, analyze it via Ollama, and save it to SQLite and FTS5."""
    db = next(get_db())
    try:
        syllabus = db.query(Syllabus).filter(Syllabus.id == syllabus_id).first()
        if not syllabus:
            return

        # 1. Extract raw text from PDF
        extracted_text = extract_content(file_path, "PDF", ocr_enabled)
        if not extracted_text:
            syllabus.units = "Processing failed: Could not read syllabus text."
            db.commit()
            return

        # 2. Structure syllabus using local LLM
        curriculum = await query_syllabus_from_llm(extracted_text)

        # 3. Update database record
        # Use values parsed from document, falling back to what we had
        syllabus.subject = curriculum.get("subject", syllabus.subject)
        # Handle code uniqueness collision if code already exists in DB
        code = curriculum.get("code", syllabus.code)
        existing_code = db.query(Syllabus).filter(Syllabus.code == code, Syllabus.id != syllabus_id).first()
        if existing_code:
            syllabus.code = f"{code}-{uuid.uuid4().hex[:4].upper()}"
        else:
            syllabus.code = code

        syllabus.semester = str(curriculum.get("semester", "Unknown"))
        syllabus.department = curriculum.get("department", "Unknown")
        syllabus.units = curriculum.get("units", "None")
        syllabus.learning_outcomes = curriculum.get("learning_outcomes", "None")
        syllabus.reference_books = curriculum.get("reference_books", "None")
        db.commit()

        # 4. Save to FTS5 virtual table
        db.execute(
            text("INSERT INTO fts_syllabus (id, subject, code, content) VALUES (:id, :subject, :code, :content)"),
            {
                "id": syllabus.id,
                "subject": syllabus.subject,
                "code": syllabus.code,
                "content": f"{syllabus.units} {syllabus.learning_outcomes} {syllabus.reference_books}",
            },
        )
        db.commit()

        # Log audit
        log = AuditLog(
            action="AI_PROCESS_SYLLABUS_SUCCESS",
            details=f"Successfully structured syllabus {syllabus.subject} ({syllabus.code}) via local AI.",
        )
        db.add(log)
        db.commit()

    except Exception as e:
        print(f"Error processing syllabus {syllabus_id}: {e}")
        db.rollback()
    finally:
        db.close()


@router.post("/upload", response_model=SyllabusResponse, status_code=status.HTTP_202_ACCEPTED)
def upload_syllabus(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Upload syllabus PDF and start local curriculum parsing in background (Admin only)."""
    # 1. Validate extension
    filename = file.filename
    if filename is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is missing.",
        )
    ext = os.path.splitext(filename)[1].replace(".", "").upper()
    if ext != "PDF":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported format: Only syllabus files in PDF format are allowed.",
        )

    # 2. Save file locally
    unique_filename = f"{uuid.uuid4().hex}_{filename}"
    dest_path = os.path.join(settings.STORAGE_DIR, "syllabus", unique_filename)

    try:
        with open(dest_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save syllabus: {e}",
        ) from e

    # 3. Create placeholder database record
    new_syllabus = Syllabus(
        subject=filename,
        code=f"PENDING-{uuid.uuid4().hex[:6].upper()}",
        units="Parsing syllabus content and topics...",
        file_path=dest_path,
    )
    db.add(new_syllabus)
    db.commit()
    db.refresh(new_syllabus)

    # 4. Fetch settings to check if OCR is enabled
    ocr_enabled_val = True
    ocr_setting = db.query(Setting).filter(Setting.key == "ocr_enabled").first()
    if ocr_setting:
        ocr_enabled_val = ocr_setting.value.lower() == "true"

    # 5. Launch background parsing task
    background_tasks.add_task(process_syllabus_async, new_syllabus.id, dest_path, ocr_enabled_val)

    # Log upload action
    log = AuditLog(
        action="UPLOAD_SYLLABUS",
        details=f"Admin {current_user.username} uploaded syllabus PDF {filename} (ID {new_syllabus.id})",
    )
    db.add(log)
    db.commit()

    return new_syllabus


@router.get("", response_model=list[SyllabusResponse])
def get_all_syllabi(_current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List all courses syllabi."""
    return db.query(Syllabus).all()


@router.get("/{id}/download")
def download_syllabus(
    id: int,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download syllabus file (PDF)."""
    from fastapi.responses import FileResponse

    syllabus = db.query(Syllabus).filter(Syllabus.id == id).first()
    if not syllabus:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Syllabus not found")
    if not os.path.exists(syllabus.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Syllabus file not found on server",
        )
    return FileResponse(syllabus.file_path, filename=os.path.basename(syllabus.file_path))
