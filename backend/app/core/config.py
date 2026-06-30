import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directory of the backend folder
BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "CampusAI"
    API_V1_STR: str = "/api"

    # Security Settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "campusai-super-secret-key-for-local-offline-academic-hub")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days for ease of offline use

    # Database Settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/campusai.db")

    # AI & Services Settings
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3:latest")
    TESSERACT_CMD: str = os.getenv("TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe")
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "tiny")  # tiny/base/small

    # Storage Settings
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", str(BASE_DIR / "storage"))

    # File limits
    MAX_UPLOAD_SIZE: int = 100 * 1024 * 1024  # 100MB (for video uploads)

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()

# Ensure directories exist
os.makedirs(settings.STORAGE_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.STORAGE_DIR, "materials"), exist_ok=True)
os.makedirs(os.path.join(settings.STORAGE_DIR, "videos"), exist_ok=True)
os.makedirs(os.path.join(settings.STORAGE_DIR, "syllabus"), exist_ok=True)
os.makedirs(os.path.join(settings.STORAGE_DIR, "transcripts"), exist_ok=True)
os.makedirs(os.path.join(settings.STORAGE_DIR, "thumbnails"), exist_ok=True)
