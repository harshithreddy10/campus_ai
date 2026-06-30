import os
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
from app.models.db_models import AuditLog, Setting, StudyMaterial, User
from app.schemas.schemas import StudyMaterialResponse
from app.services.ai.llm import extract_metadata_from_text
from app.services.materials.extractor import extract_content

router = APIRouter(prefix="/materials", tags=["Study Material Management"])


async def process_material_async(material_id: int, file_path: str, file_type: str, ocr_enabled: bool):
    """Background task to extract text, query Ollama for metadata, and save details to DB and FTS5."""
    db = next(get_db())
    try:
        material = db.query(StudyMaterial).filter(StudyMaterial.id == material_id).first()
        if not material:
            return

        # 1. Extract content from the file
        extracted_text = extract_content(file_path, file_type, ocr_enabled)
        if not extracted_text:
            material.summary = "Processing failed: Could not extract text from document."
            db.commit()
            return

        # 2. Extract structured metadata using the local LLM
        metadata = await extract_metadata_from_text(extracted_text)

        # 3. Update database model
        material.subject = metadata.get("subject", "Unknown")
        material.semester = str(metadata.get("semester", "Unknown"))
        material.department = metadata.get("department", "Unknown")
        material.unit = str(metadata.get("unit")) if metadata.get("unit") else None

        # Convert lists to comma-separated strings or JSON strings
        topics_list = metadata.get("topics", [])
        keywords_list = metadata.get("keywords", [])

        material.topics = ", ".join(topics_list) if isinstance(topics_list, list) else str(topics_list)
        material.keywords = ", ".join(keywords_list) if isinstance(keywords_list, list) else str(keywords_list)
        material.summary = metadata.get("summary", "No summary generated.")

        db.commit()

        # 4. Insert into SQLite FTS5 virtual table
        db.execute(
            text("INSERT INTO fts_materials (id, title, content, summary, keywords) VALUES (:id, :title, :content, :summary, :keywords)"),
            {
                "id": material.id,
                "title": material.title,
                "content": extracted_text,
                "summary": material.summary,
                "keywords": material.keywords,
            },
        )
        db.commit()

        # Log successful audit
        log = AuditLog(
            action="AI_PROCESS_MATERIAL_SUCCESS",
            details=f"Successfully processed material {material.title} (ID {material.id}) via local AI.",
        )
        db.add(log)
        db.commit()

    except Exception as e:
        print(f"Error executing asynchronous background material process: {e}")
        db.rollback()
    finally:
        db.close()


@router.post(
    "/upload",
    response_model=StudyMaterialResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def upload_study_material(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Upload study material (PDF, DOCX, TXT, PPTX) and launch local AI analysis in background (Admin only)."""
    # 1. Validate file extension
    filename = file.filename
    if filename is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is missing.",
        )
    ext = os.path.splitext(filename)[1].replace(".", "").upper()
    if ext not in ["PDF", "DOCX", "TXT", "PPT", "PPTX"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format: {ext}. Only PDF, DOCX, TXT, PPT, and PPTX files are allowed.",
        )

    # 2. Save physical file locally
    unique_filename = f"{uuid.uuid4().hex}_{filename}"
    dest_path = os.path.join(settings.STORAGE_DIR, "materials", unique_filename)

    try:
        with open(dest_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {e}",
        ) from e

    # 3. Create placeholder database record
    new_material = StudyMaterial(
        title=filename,
        file_path=dest_path,
        file_type=ext,
        summary="Processing AI Analysis...",
    )
    db.add(new_material)
    db.commit()
    db.refresh(new_material)

    # 4. Fetch settings to check if OCR is enabled
    ocr_enabled_val = True
    ocr_setting = db.query(Setting).filter(Setting.key == "ocr_enabled").first()
    if ocr_setting:
        ocr_enabled_val = ocr_setting.value.lower() == "true"

    # 5. Launch background parsing task
    background_tasks.add_task(process_material_async, new_material.id, dest_path, ext, ocr_enabled_val)

    # Log upload action
    log = AuditLog(
        action="UPLOAD_MATERIAL",
        details=f"Admin {current_user.username} uploaded study material {filename} (ID {new_material.id})",
    )
    db.add(log)
    db.commit()

    return new_material


@router.get("", response_model=list[StudyMaterialResponse])
def get_all_materials(_current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List all study materials."""
    return db.query(StudyMaterial).all()


@router.get("/{id}", response_model=StudyMaterialResponse)
def get_material_by_id(
    id: int,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get single study material details."""
    material = db.query(StudyMaterial).filter(StudyMaterial.id == id).first()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study material not found")
    return material


@router.get("/{id}/download")
def download_material(
    id: int,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download the actual material file."""
    from fastapi.responses import FileResponse

    material = db.query(StudyMaterial).filter(StudyMaterial.id == id).first()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study material not found")
    if not os.path.exists(material.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical file not found on server",
        )
    return FileResponse(material.file_path, filename=material.title)


@router.delete("/{id}")
def delete_study_material(id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Delete a study material, its FTS5 index, and its local file (Admin only)."""
    material = db.query(StudyMaterial).filter(StudyMaterial.id == id).first()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study material not found")

    # Remove physical file if it exists
    if os.path.exists(material.file_path):
        try:
            os.remove(material.file_path)
        except Exception as e:
            print(f"Warning: Failed to delete physical file {material.file_path}: {e}")

    # Delete database record
    db.delete(material)

    # Remove from FTS5 index
    try:
        db.execute(text("DELETE FROM fts_materials WHERE id = :id"), {"id": id})
    except Exception as e:
        print(f"Warning: Failed to remove material {id} from FTS index: {e}")

    db.commit()

    # Log delete action
    log = AuditLog(
        action="DELETE_MATERIAL",
        details=f"Admin {current_user.username} deleted study material {material.title} (ID {id})",
    )
    db.add(log)
    db.commit()

    return {"message": f"Study material {material.title} successfully deleted"}
