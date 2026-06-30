from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.init_db import initialize_database

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="CampusAI Offline AI Academic Knowledge Hub Backend",
    version="1.0.0",
)


@app.on_event("startup")
def on_startup():
    initialize_database()


# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.auth import router as auth_router
from app.api.materials import router as materials_router
from app.api.search import router as search_router
from app.api.settings import router as settings_router
from app.api.students import router as students_router
from app.api.syllabus import router as syllabus_router
from app.api.videos import router as videos_router

app.include_router(auth_router)
app.include_router(students_router)
app.include_router(materials_router)
app.include_router(videos_router)
app.include_router(syllabus_router)
app.include_router(search_router)
app.include_router(settings_router)


@app.get("/health")
def health():
    return {"status": "ok", "message": "CampusAI running offline"}


@app.get("/status")
def status():
    return {
        "status": "healthy",
        "database": "connected",
        "ai": "ollama_ready",
        "version": "1.0.0",
    }


# We will mount routers here as they are implemented
