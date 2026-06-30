from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database.connection import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="student")  # 'admin' or 'student'
    created_at = Column(DateTime, default=datetime.utcnow)

    student_profile = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    roll_number = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    department = Column(String, nullable=True)
    branch = Column(String, nullable=True)
    academic_year = Column(String, nullable=True)
    dob = Column(String, nullable=True)
    contact = Column(String, nullable=True)
    doc_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="student_profile")


class StudyMaterial(Base):
    __tablename__ = "study_materials"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    subject = Column(String, nullable=True)
    semester = Column(String, nullable=True)
    department = Column(String, nullable=True)
    unit = Column(String, nullable=True)
    topics = Column(Text, nullable=True)  # JSON or comma-separated list
    keywords = Column(Text, nullable=True)  # JSON or comma-separated list
    summary = Column(Text, nullable=True)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # 'PDF', 'DOCX', 'TXT', 'PPTX'
    created_at = Column(DateTime, default=datetime.utcnow)


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    subject = Column(String, nullable=True)
    semester = Column(String, nullable=True)
    department = Column(String, nullable=True)
    unit = Column(String, nullable=True)
    topics = Column(Text, nullable=True)  # JSON/list
    keywords = Column(Text, nullable=True)  # JSON/list
    summary = Column(Text, nullable=True)
    video_path = Column(String, nullable=False)
    audio_path = Column(String, nullable=True)
    transcript_path = Column(String, nullable=True)
    status = Column(String, nullable=False, default="processing")  # 'processing', 'completed', 'failed'
    created_at = Column(DateTime, default=datetime.utcnow)


class Syllabus(Base):
    __tablename__ = "syllabus"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, nullable=False)
    code = Column(String, unique=True, index=True, nullable=False)
    semester = Column(String, nullable=True)
    department = Column(String, nullable=True)
    units = Column(Text, nullable=True)  # JSON representation of units & topics
    learning_outcomes = Column(Text, nullable=True)
    reference_books = Column(Text, nullable=True)
    file_path = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(String, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False)  # 'LOGIN', 'UPLOAD_MATERIAL', 'SEARCH', etc.
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
