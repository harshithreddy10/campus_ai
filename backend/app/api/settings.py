import shutil

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_admin
from app.core.config import settings
from app.database.connection import get_db
from app.models.db_models import AuditLog, Setting, User
from app.schemas.schemas import SettingsResponse, SettingsUpdate

router = APIRouter(tags=["Settings & Health"])


@router.get("/settings", response_model=SettingsResponse)
def get_settings(_current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Fetch current system configuration settings."""

    def get_val(key: str, default: str) -> str:
        s = db.query(Setting).filter(Setting.key == key).first()
        return s.value if s else default

    return {
        "ollama_model": get_val("ollama_model", settings.OLLAMA_MODEL),
        "ocr_enabled": get_val("ocr_enabled", "true").lower() == "true",
        "whisper_model": get_val("whisper_model", settings.WHISPER_MODEL),
        "max_upload_size": int(get_val("max_upload_size", str(settings.MAX_UPLOAD_SIZE))),
    }


@router.put("/settings", response_model=SettingsResponse)
def update_settings(
    request: SettingsUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update system configuration settings (Admin only)."""
    update_data = request.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        # Stringify boolean/integer values
        val_str = str(value).lower() if isinstance(value, bool) else str(value)

        setting = db.query(Setting).filter(Setting.key == key).first()
        if setting:
            setting.value = val_str
        else:
            setting = Setting(key=key, value=val_str)
            db.add(setting)

    db.commit()

    # Log configuration updates
    log = AuditLog(
        action="UPDATE_SETTINGS",
        details=f"Admin {current_user.username} updated settings: {list(update_data.keys())}",
    )
    db.add(log)
    db.commit()

    return get_settings(current_user, db)


@router.get("/settings/language")
def get_user_language(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Fetch user's preferred language."""
    setting = db.query(Setting).filter(Setting.key == f"lang_{current_user.username}").first()
    return {"language": setting.value if setting else "en"}


@router.put("/settings/language")
def update_user_language(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update user's preferred language."""
    lang = payload.get("language", "en")
    if lang not in ["en", "hi", "te"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported language code. Use: en, hi, te",
        )
    setting = db.query(Setting).filter(Setting.key == f"lang_{current_user.username}").first()
    if setting:
        setting.value = lang
    else:
        setting = Setting(key=f"lang_{current_user.username}", value=lang)
        db.add(setting)
    db.commit()
    return {"success": True, "language": lang}


@router.get("/status")
async def system_status(db: Session = Depends(get_db)):
    """Check health and connectivity status of local services (database, Ollama, disk)."""
    # 1. Database check
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        print(f"Status check: database connection failed: {e}")

    # 2. Ollama check
    ollama_ok = False
    ollama_model_loaded = False
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                ollama_ok = True
                models = resp.json().get("models", [])

                # Fetch active model setting
                s_model = db.query(Setting).filter(Setting.key == "ollama_model").first()
                target_model = s_model.value if s_model else settings.OLLAMA_MODEL

                # Check if target model is pulled
                for m in models:
                    if m.get("name") == target_model or m.get("name").startswith(target_model):
                        ollama_model_loaded = True
                        break
    except Exception as e:
        print(f"Status check: Ollama service ping failed: {e}")

    # 3. Disk space check
    total, used, free = shutil.disk_usage(settings.STORAGE_DIR)
    free_gb = free / (1024**3)

    return {
        "status": "healthy" if (db_ok and ollama_ok) else "degraded",
        "database": {"status": "connected" if db_ok else "disconnected"},
        "ai": {
            "ollama_status": "online" if ollama_ok else "offline",
            "model_loaded": ollama_model_loaded,
            "target_model": settings.OLLAMA_MODEL,
        },
        "disk": {
            "storage_dir": settings.STORAGE_DIR,
            "free_space_gb": round(free_gb, 2),
        },
    }
