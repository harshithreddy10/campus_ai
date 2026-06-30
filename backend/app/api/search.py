from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.connection import get_db
from app.models.db_models import AuditLog, User
from app.services.search.engine import (
    sanitize_fts_query,
    search_students_records,
    search_study_materials,
    search_syllabus_records,
    search_video_lectures,
)

router = APIRouter(prefix="/search", tags=["AI Search Engine"])


@router.get("")
def academic_search(
    q: str = Query(..., min_length=1, description="Search query string"),
    category: str | None = Query(None, description="Filter search by: materials, videos, syllabus, students"),
    subject: str | None = Query(None, description="Metadata subject filter"),
    semester: str | None = Query(None, description="Metadata semester filter"),
    department: str | None = Query(None, description="Metadata department filter"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fuzzy search across study materials, video transcripts, syllabi, and student records offline using FTS5."""
    sanitized_q = sanitize_fts_query(q)

    # Store standard filters
    filters = {
        "raw_query": q,
        "subject": subject,
        "semester": semester,
        "department": department,
    }

    results = {}

    # Run search queries based on category filter
    if not category or category == "materials":
        results["materials"] = search_study_materials(db, sanitized_q, filters)
    if not category or category == "videos":
        results["videos"] = search_video_lectures(db, sanitized_q, filters)
    if not category or category == "syllabus":
        results["syllabus"] = search_syllabus_records(db, sanitized_q, filters)
    if not category or category == "students":
        results["students"] = search_students_records(db, q, filters)

    # Log search query in AuditLogs
    log = AuditLog(
        action="SEARCH",
        details=f"User {current_user.username} searched for query: '{q}' (Category: {category or 'All'})",
    )
    db.add(log)
    db.commit()

    return {"query": q, "category_filtered": category, "results": results}
