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
from app.models.db_models import AuditLog, Setting, User, Video
from app.schemas.schemas import VideoResponse
from app.services.ai.llm import extract_metadata_from_text
from app.services.video.processor import (
    extract_audio_from_video,
    transcribe_audio_whisper,
)

router = APIRouter(prefix="/videos", tags=["Video Lecture Management"])


async def process_video_async(video_id: int, video_path: str, _filename: str, whisper_model_size: str):
    """Background task to extract audio, transcribe with Whisper, query Ollama and update FTS5."""
    db = next(get_db())
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            return

        # Define audio and transcript paths
        base_name = os.path.splitext(os.path.basename(video_path))[0]
        audio_path = os.path.join(settings.STORAGE_DIR, "videos", f"{base_name}.mp3")
        transcript_path = os.path.join(settings.STORAGE_DIR, "transcripts", f"{base_name}.txt")

        # 1. Extract audio via FFmpeg
        audio_success = extract_audio_from_video(video_path, audio_path)
        if not audio_success:
            video.status = "failed"
            video.summary = "Processing failed: Could not extract audio from video file."
            db.commit()
            return

        video.audio_path = audio_path
        db.commit()

        # 2. Transcribe via Faster-Whisper
        transcript_text = transcribe_audio_whisper(audio_path, whisper_model_size)

        # Save transcript to file
        with open(transcript_path, "w", encoding="utf-8") as tf:
            tf.write(transcript_text)

        video.transcript_path = transcript_path
        db.commit()

        # 3. Extract metadata using local LLM
        metadata = await extract_metadata_from_text(transcript_text)

        # 4. Save metadata to DB
        video.subject = metadata.get("subject", "Unknown")
        video.semester = str(metadata.get("semester", "Unknown"))
        video.department = metadata.get("department", "Unknown")
        video.unit = str(metadata.get("unit")) if metadata.get("unit") else None

        topics_list = metadata.get("topics", [])
        keywords_list = metadata.get("keywords", [])

        video.topics = ", ".join(topics_list) if isinstance(topics_list, list) else str(topics_list)
        video.keywords = ", ".join(keywords_list) if isinstance(keywords_list, list) else str(keywords_list)
        video.summary = metadata.get("summary", "No summary generated.")
        video.status = "completed"
        db.commit()

        # 5. Insert details to FTS5 virtual table
        db.execute(
            text("INSERT INTO fts_videos (id, title, content, summary, keywords) VALUES (:id, :title, :content, :summary, :keywords)"),
            {
                "id": video.id,
                "title": video.title,
                "content": transcript_text,
                "summary": video.summary,
                "keywords": video.keywords,
            },
        )
        db.commit()

        # Log successful audit
        log = AuditLog(
            action="AI_PROCESS_VIDEO_SUCCESS",
            details=f"Successfully processed video {video.title} (ID {video.id}) via local AI.",
        )
        db.add(log)
        db.commit()

    except Exception as e:
        print(f"Error processing video lecture {video_id}: {e}")
        db.rollback()
        # Mark as failed in DB
        try:
            video = db.query(Video).filter(Video.id == video_id).first()
            if video:
                video.status = "failed"
                video.summary = f"Processing failed: {e}"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.post("/upload", response_model=VideoResponse, status_code=status.HTTP_202_ACCEPTED)
def upload_video_lecture(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Upload video lecture file (MP4, MKV, MOV) and run background AI transcription/analysis (Admin only)."""
    # 1. Validate file extension
    filename = file.filename
    if filename is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is missing.",
        )
    ext = os.path.splitext(filename)[1].replace(".", "").upper()
    if ext not in ["MP4", "MKV", "MOV"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format: {ext}. Only MP4, MKV, and MOV video files are allowed.",
        )

    # 2. Save physical file locally
    unique_filename = f"{uuid.uuid4().hex}_{filename}"
    dest_path = os.path.join(settings.STORAGE_DIR, "videos", unique_filename)

    try:
        with open(dest_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save video: {e}",
        ) from e

    # 3. Create placeholder database record
    new_video = Video(
        title=filename,
        video_path=dest_path,
        status="processing",
        summary="Extracting audio and transcribing lecture...",
    )
    db.add(new_video)
    db.commit()
    db.refresh(new_video)

    # 4. Fetch settings to check whisper model size
    whisper_model_val = "tiny"
    whisper_setting = db.query(Setting).filter(Setting.key == "whisper_model").first()
    if whisper_setting:
        whisper_model_val = whisper_setting.value

    # 5. Launch background transcribing task
    background_tasks.add_task(process_video_async, new_video.id, dest_path, filename, whisper_model_val)

    # Log upload action
    log = AuditLog(
        action="UPLOAD_VIDEO",
        details=f"Admin {current_user.username} uploaded video lecture {filename} (ID {new_video.id})",
    )
    db.add(log)
    db.commit()

    return new_video


@router.get("", response_model=list[VideoResponse])
def get_all_videos(_current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List all video lectures."""
    videos = db.query(Video).all()
    for v in videos:
        if v.transcript_path and os.path.exists(v.transcript_path):
            try:
                with open(v.transcript_path, encoding="utf-8") as f:
                    v.transcript_content = f.read()
            except Exception:
                v.transcript_content = ""
    return videos


@router.get("/{id}", response_model=VideoResponse)
def get_video_by_id(
    id: int,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get single video lecture details."""
    video = db.query(Video).filter(Video.id == id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video lecture not found")
    if video.transcript_path and os.path.exists(video.transcript_path):
        try:
            with open(video.transcript_path, encoding="utf-8") as f:
                video.transcript_content = f.read()
        except Exception:
            video.transcript_content = ""
    return video


@router.get("/{id}/download")
def download_video(
    id: int,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stream/Download the video lecture file."""
    from fastapi.responses import FileResponse

    video = db.query(Video).filter(Video.id == id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video lecture not found")
    if not os.path.exists(video.video_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video file not found on server",
        )
    return FileResponse(video.video_path, filename=video.title)


@router.delete("/{id}")
def delete_video_lecture(id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Delete a video lecture, its associated files (audio, transcript), and its FTS5 index (Admin only)."""
    video = db.query(Video).filter(Video.id == id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video lecture not found")

    # Remove physical files
    for path_attr in ["video_path", "audio_path", "transcript_path"]:
        path = getattr(video, path_attr, None)
        if path and os.path.exists(path):
            try:
                os.remove(path)
            except Exception as e:
                print(f"Warning: Failed to delete file {path}: {e}")

    # Delete database record
    db.delete(video)

    # Remove from FTS5 index
    try:
        db.execute(text("DELETE FROM fts_videos WHERE id = :id"), {"id": id})
    except Exception as e:
        print(f"Warning: Failed to remove video {id} from FTS index: {e}")

    db.commit()

    # Log delete action
    log = AuditLog(
        action="DELETE_VIDEO",
        details=f"Admin {current_user.username} deleted video lecture {video.title} (ID {id})",
    )
    db.add(log)
    db.commit()

    return {"message": f"Video lecture {video.title} successfully deleted"}
