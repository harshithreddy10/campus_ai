from sqlalchemy import text

from app.auth.security import hash_password
from app.database.connection import Base, SessionLocal, engine
from app.models.db_models import Setting, User


def initialize_database():
    """Create tables if they do not exist, create FTS5 virtual tables, and seed default data."""
    # 1. Create standard SQLAlchemy tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 2. Create FTS5 Virtual Tables for full-text search
        # Wrap raw SQL statements in text() for SQLAlchemy 2.0 compatibility
        db.execute(text("CREATE VIRTUAL TABLE IF NOT EXISTS fts_materials USING fts5(id UNINDEXED, title, content, summary, keywords);"))
        db.execute(text("CREATE VIRTUAL TABLE IF NOT EXISTS fts_videos USING fts5(id UNINDEXED, title, content, summary, keywords);"))
        db.execute(text("CREATE VIRTUAL TABLE IF NOT EXISTS fts_syllabus USING fts5(id UNINDEXED, subject, code, content);"))

        # 3. Seed default Admin
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin_user = User(
                username="admin",
                hashed_password=hash_password("admin123"),
                role="admin",
            )
            db.add(admin_user)
            print("Database initialized: Default administrator seeded (admin/admin123).")

        # 4. Seed default settings
        default_settings = {
            "ollama_model": "deepseek-r1:1.5b",
            "ocr_enabled": "true",
            "whisper_model": "tiny",
            "max_upload_size": "104857600",  # 100MB
        }

        for key, val in default_settings.items():
            setting = db.query(Setting).filter(Setting.key == key).first()
            if not setting:
                setting = Setting(key=key, value=val)
                db.add(setting)

        db.commit()
        print("Database initialized: Default configuration settings and FTS5 tables setup successfully.")

    except Exception as e:
        print(f"Error during database initialization: {e}")
        db.rollback()
    finally:
        db.close()
