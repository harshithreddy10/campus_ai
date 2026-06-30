import re
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session


def sanitize_fts_query(query: str) -> str:
    """Sanitize the search query and format it for prefix matching in SQLite FTS5."""
    # Keep only alphanumeric characters and spaces
    cleaned = re.sub(r"[^\w\s]", " ", query)
    words = cleaned.split()
    if not words:
        return ""
    # Convert to prefix terms connected by AND: "term1* AND term2*"
    return " AND ".join(f"{word}*" for word in words)


def search_study_materials(db: Session, sanitized_q: str, filters: dict[str, Any]) -> list[dict[str, Any]]:
    """Search study materials via FTS5 virtual table."""
    sql = (
        "SELECT m.id, m.title, m.file_path, m.file_type, m.summary, m.subject, m.semester, m.department, m.unit "
        "FROM study_materials m "
        "JOIN fts_materials f ON m.id = f.id "
        "WHERE fts_materials MATCH :query"
    )

    # Add optional filters
    params = {"query": sanitized_q}
    for col in ["subject", "semester", "department"]:
        if filters.get(col):
            sql += f" AND m.{col} = :{col}"
            params[col] = filters[col]

    sql += " LIMIT 20"

    try:
        results = db.execute(text(sql), params).fetchall()
        return [
            {
                "id": r[0],
                "title": r[1],
                "file_path": r[2],
                "file_type": r[3],
                "summary": r[4],
                "subject": r[5],
                "semester": r[6],
                "department": r[7],
                "unit": r[8],
            }
            for r in results
        ]
    except Exception as e:
        print(f"FTS5 Study Material search failed, running fallback relational LIKE query: {e}")
        # Fallback to standard LIKE queries
        fallback_sql = (
            "SELECT id, title, file_path, file_type, summary, subject, semester, department, unit "
            "FROM study_materials WHERE (title LIKE :like_query OR summary LIKE :like_query)"
        )
        fallback_params = {"like_query": f"%{filters['raw_query']}%"}

        for col in ["subject", "semester", "department"]:
            if filters.get(col):
                fallback_sql += f" AND {col} = :{col}"
                fallback_params[col] = filters[col]

        results = db.execute(text(fallback_sql), fallback_params).fetchall()
        return [
            {
                "id": r[0],
                "title": r[1],
                "file_path": r[2],
                "file_type": r[3],
                "summary": r[4],
                "subject": r[5],
                "semester": r[6],
                "department": r[7],
                "unit": r[8],
            }
            for r in results
        ]


def search_video_lectures(db: Session, sanitized_q: str, filters: dict[str, Any]) -> list[dict[str, Any]]:
    """Search video transcripts via FTS5 virtual table."""
    sql = (
        "SELECT v.id, v.title, v.video_path, v.status, v.summary, v.subject, v.semester, v.department, v.unit "
        "FROM videos v "
        "JOIN fts_videos f ON v.id = f.id "
        "WHERE fts_videos MATCH :query"
    )

    params = {"query": sanitized_q}
    for col in ["subject", "semester", "department"]:
        if filters.get(col):
            sql += f" AND v.{col} = :{col}"
            params[col] = filters[col]

    sql += " LIMIT 20"

    try:
        results = db.execute(text(sql), params).fetchall()
        return [
            {
                "id": r[0],
                "title": r[1],
                "video_path": r[2],
                "status": r[3],
                "summary": r[4],
                "subject": r[5],
                "semester": r[6],
                "department": r[7],
                "unit": r[8],
            }
            for r in results
        ]
    except Exception as e:
        print(f"FTS5 Video search failed, running fallback relational LIKE query: {e}")
        fallback_sql = (
            "SELECT id, title, video_path, status, summary, subject, semester, department, unit "
            "FROM videos WHERE (title LIKE :like_query OR summary LIKE :like_query)"
        )
        fallback_params = {"like_query": f"%{filters['raw_query']}%"}

        for col in ["subject", "semester", "department"]:
            if filters.get(col):
                fallback_sql += f" AND {col} = :{col}"
                fallback_params[col] = filters[col]

        results = db.execute(text(fallback_sql), fallback_params).fetchall()
        return [
            {
                "id": r[0],
                "title": r[1],
                "video_path": r[2],
                "status": r[3],
                "summary": r[4],
                "subject": r[5],
                "semester": r[6],
                "department": r[7],
                "unit": r[8],
            }
            for r in results
        ]


def search_syllabus_records(db: Session, sanitized_q: str, filters: dict[str, Any]) -> list[dict[str, Any]]:
    """Search course syllabi via FTS5 virtual table."""
    sql = (
        "SELECT s.id, s.subject, s.code, s.semester, s.department, s.units, s.learning_outcomes, s.reference_books "
        "FROM syllabus s "
        "JOIN fts_syllabus f ON s.id = f.id "
        "WHERE fts_syllabus MATCH :query"
    )

    params = {"query": sanitized_q}
    for col in ["semester", "department"]:
        if filters.get(col):
            sql += f" AND s.{col} = :{col}"
            params[col] = filters[col]

    sql += " LIMIT 20"

    try:
        results = db.execute(text(sql), params).fetchall()
        return [
            {
                "id": r[0],
                "subject": r[1],
                "code": r[2],
                "semester": r[3],
                "department": r[4],
                "units": r[5],
                "learning_outcomes": r[6],
                "reference_books": r[7],
            }
            for r in results
        ]
    except Exception as e:
        print(f"FTS5 Syllabus search failed, running fallback relational LIKE query: {e}")
        fallback_sql = (
            "SELECT id, subject, code, semester, department, units, learning_outcomes, reference_books "
            "FROM syllabus WHERE (subject LIKE :like_query OR code LIKE :like_query OR units LIKE :like_query)"
        )
        fallback_params = {"like_query": f"%{filters['raw_query']}%"}

        for col in ["semester", "department"]:
            if filters.get(col):
                fallback_sql += f" AND {col} = :{col}"
                fallback_params[col] = filters[col]

        results = db.execute(text(fallback_sql), fallback_params).fetchall()
        return [
            {
                "id": r[0],
                "subject": r[1],
                "code": r[2],
                "semester": r[3],
                "department": r[4],
                "units": r[5],
                "learning_outcomes": r[6],
                "reference_books": r[7],
            }
            for r in results
        ]


def search_students_records(db: Session, query: str, filters: dict[str, Any]) -> list[dict[str, Any]]:
    """Search student profiles via standard SQL LIKE filters."""
    sql = (
        "SELECT id, roll_number, name, department, branch, academic_year, dob, contact "
        "FROM students WHERE (name LIKE :query OR roll_number LIKE :query)"
    )

    params = {"query": f"%{query}%"}
    if filters.get("department"):
        sql += " AND department = :department"
        params["department"] = filters["department"]

    sql += " LIMIT 20"

    results = db.execute(text(sql), params).fetchall()
    return [
        {
            "id": r[0],
            "roll_number": r[1],
            "name": r[2],
            "department": r[3],
            "branch": r[4],
            "academic_year": r[5],
            "dob": r[6],
            "contact": r[7],
        }
        for r in results
    ]
