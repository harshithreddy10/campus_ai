import json
import os
import re
import shutil
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_admin
from app.auth.security import hash_password
from app.core.config import settings
from app.database.connection import get_db
from app.models.db_models import AuditLog, Setting, Student, User
from app.schemas.schemas import StudentCreate, StudentResponse, StudentUpdate
from app.services.ai.llm import query_local_llm
from app.services.materials.extractor import extract_content

router = APIRouter(prefix="/students", tags=["Student Management"])


async def query_student_details_from_llm(text_content: str) -> dict:
    """Send student document text to Ollama to extract Name, Roll, and Department."""
    system_prompt = (
        "You are an academic student registration assistant. Analyze the text extracted from a student document "
        "and return a valid JSON object matching the schema below. Do not output reasoning steps. Do not include markdown wraps.\n"
        "Schema:\n"
        "{\n"
        '  "name": "Student Full Name",\n'
        '  "roll_number": "Student Roll Number or ID",\n'
        '  "department": "Department (e.g. CSE, ECE, Mechanical)"\n'
        "}"
    )

    truncated_text = text_content[:2000]
    prompt = f"Extract student details from this document text:\n\n{truncated_text}"

    raw_output = await query_local_llm(prompt, system_prompt)

    try:
        json_match = re.search(r"\{.*\}", raw_output, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(0))
        return json.loads(raw_output)
    except Exception as e:
        print(f"Failed parsing student JSON from LLM: {e}. Raw: {raw_output}")
        # Default fallback values for testing
        return {
            "name": "Unknown Student",
            "roll_number": f"STU-{uuid.uuid4().hex[:6].upper()}",
            "department": "General",
        }


@router.post("/register")
async def register_student_ocr(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Register a student by uploading their ID or Aadhaar card using local OCR and LLM (Public/Admin)."""
    # 1. Save file locally
    filename = file.filename
    if filename is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is missing.",
        )
    ext = os.path.splitext(filename)[1].replace(".", "").upper()

    unique_filename = f"{uuid.uuid4().hex}_{filename}"
    dest_path = os.path.join(settings.STORAGE_DIR, "materials", unique_filename)

    try:
        with open(dest_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save document: {e}",
        ) from e

    # 2. Check if OCR is enabled
    ocr_enabled_val = True
    ocr_setting = db.query(Setting).filter(Setting.key == "ocr_enabled").first()
    if ocr_setting:
        ocr_enabled_val = ocr_setting.value.lower() == "true"

    # 3. Extract text content
    extracted_text = ""
    try:
        # Route to extractor
        extracted_text = extract_content(dest_path, ext, ocr_enabled_val)
    except Exception as e:
        print(f"Failed to extract text during student registration: {e}")

    # 4. Use LLM to extract fields from text (or fallback if empty)
    student_info = {
        "name": "Unknown Student",
        "roll_number": f"STU-{uuid.uuid4().hex[:6].upper()}",
        "department": "General",
    }

    if extracted_text.strip():
        student_info = await query_student_details_from_llm(extracted_text)
    else:
        # If extraction was empty, try to parse from filename
        name_part = os.path.splitext(filename)[0].replace("_", " ").title()
        student_info["name"] = name_part

    # Standardize values
    name = student_info.get("name", "Unknown Student") or "Unknown Student"
    roll_number = student_info.get("roll_number", f"STU-{uuid.uuid4().hex[:6].upper()}") or f"STU-{uuid.uuid4().hex[:6].upper()}"
    department = student_info.get("department", "General") or "General"

    # 5. Check if user already exists
    existing_user = db.query(User).filter(User.username == roll_number).first()
    if not existing_user:
        new_user = User(
            username=roll_number,
            hashed_password=hash_password(roll_number),  # Default password is their roll number
            role="student",
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        user_id = new_user.id
    else:
        user_id = existing_user.id

    # 6. Check if student profile exists
    student = db.query(Student).filter(Student.roll_number == roll_number).first()
    if not student:
        student = Student(
            user_id=user_id,
            roll_number=roll_number,
            name=name,
            department=department,
            branch="General",
            academic_year="2026-27",
            doc_path=dest_path,
        )
        db.add(student)
        db.commit()
        db.refresh(student)

    # Log audit
    log = AuditLog(
        action="OCR_REGISTER_STUDENT",
        details=f"Student {student.name} ({student.roll_number}) registered via OCR pipeline.",
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "student": {
            "id": student.id,
            "name": student.name,
            "roll_number": student.roll_number,
            "department": student.department,
            "branch": student.branch,
            "academic_year": student.academic_year,
            "doc_path": student.doc_path,
        },
    }


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    request: StudentCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new student profile and corresponding login credentials (Admin only)."""
    existing_student = db.query(Student).filter(Student.roll_number == request.roll_number).first()
    if existing_student:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Student with roll number {request.roll_number} already exists",
        )

    existing_user = db.query(User).filter(User.username == request.roll_number).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username {request.roll_number} is already taken",
        )

    new_user = User(
        username=request.roll_number,
        hashed_password=hash_password(request.password),
        role="student",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    new_student = Student(
        user_id=new_user.id,
        roll_number=request.roll_number,
        name=request.name,
        department=request.department,
        branch=request.branch,
        academic_year=request.academic_year,
        dob=request.dob,
        contact=request.contact,
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    log = AuditLog(
        action="CREATE_STUDENT",
        details=f"Admin {current_user.username} created student {new_student.name} ({new_student.roll_number})",
    )
    db.add(log)
    db.commit()

    return new_student


@router.get("")
def get_all_students(
    department: str | None = None,
    academic_year: str | None = None,
    db: Session = Depends(get_db),
):
    """List all registered student profiles (Public/Admin for integration)."""
    query = db.query(Student)
    if department:
        query = query.filter(Student.department == department)
    if academic_year:
        query = query.filter(Student.academic_year == academic_year)

    students_list = query.all()
    # Wrap under "students" key to match the frontend expectations!
    return {
        "students": [
            {
                "id": s.id,
                "roll_number": s.roll_number,
                "name": s.name,
                "department": s.department,
                "branch": s.branch,
                "academic_year": s.academic_year,
                "dob": s.dob,
                "contact": s.contact,
                "doc_path": s.doc_path,
            }
            for s in students_list
        ]
    }


@router.get("/{id}", response_model=StudentResponse)
def get_student_by_id(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """View details of a student profile (Admin or matching Student)."""
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    if current_user.role != "admin" and student.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permissions to view this student profile",
        )

    return student


@router.put("/{id}", response_model=StudentResponse)
def update_student(
    id: int,
    request: StudentUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update details of an existing student profile (Admin only)."""
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(student, key, value)

    db.commit()
    db.refresh(student)

    log = AuditLog(
        action="UPDATE_STUDENT",
        details=f"Admin {current_user.username} updated student profile {student.name} ({student.roll_number})",
    )
    db.add(log)
    db.commit()

    return student


@router.delete("/{id}")
def delete_student(id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Delete a student profile and their associated User credentials (Admin only)."""
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    roll_number = student.roll_number
    name = student.name

    associated_user = db.query(User).filter(User.id == student.user_id).first()

    db.delete(student)
    if associated_user:
        db.delete(associated_user)

    db.commit()

    log = AuditLog(
        action="DELETE_STUDENT",
        details=f"Admin {current_user.username} deleted student {name} ({roll_number})",
    )
    db.add(log)
    db.commit()

    return {"message": f"Student {name} successfully deleted"}
