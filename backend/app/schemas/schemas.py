from datetime import datetime

from pydantic import BaseModel, ConfigDict


# ==========================================
# Authentication Schemas
# ==========================================
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


# ==========================================
# Student Schemas
# ==========================================
class StudentBase(BaseModel):
    roll_number: str
    name: str
    department: str | None = None
    branch: str | None = None
    academic_year: str | None = None
    dob: str | None = None
    contact: str | None = None


class StudentCreate(StudentBase):
    password: str  # Credentials to create corresponding User account


class StudentUpdate(BaseModel):
    name: str | None = None
    department: str | None = None
    branch: str | None = None
    academic_year: str | None = None
    dob: str | None = None
    contact: str | None = None


class StudentResponse(StudentBase):
    id: int
    user_id: int | None = None
    doc_path: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Study Material Schemas
# ==========================================
class StudyMaterialResponse(BaseModel):
    id: int
    title: str
    subject: str | None = None
    semester: str | None = None
    department: str | None = None
    unit: str | None = None
    topics: str | None = None
    keywords: str | None = None
    summary: str | None = None
    file_path: str
    file_type: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Video Schemas
# ==========================================
class VideoResponse(BaseModel):
    id: int
    title: str
    subject: str | None = None
    semester: str | None = None
    department: str | None = None
    unit: str | None = None
    topics: str | None = None
    keywords: str | None = None
    summary: str | None = None
    video_path: str
    audio_path: str | None = None
    transcript_path: str | None = None
    status: str
    transcript_content: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Syllabus Schemas
# ==========================================
class SyllabusResponse(BaseModel):
    id: int
    subject: str
    code: str
    semester: str | None = None
    department: str | None = None
    units: str | None = None
    learning_outcomes: str | None = None
    reference_books: str | None = None
    file_path: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Settings Schemas
# ==========================================
class SettingsResponse(BaseModel):
    ollama_model: str
    ocr_enabled: bool
    whisper_model: str
    max_upload_size: int


class SettingsUpdate(BaseModel):
    ollama_model: str | None = None
    ocr_enabled: bool | None = None
    whisper_model: str | None = None
    max_upload_size: int | None = None
