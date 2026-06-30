from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.security import create_access_token, hash_password, verify_password
from app.database.connection import get_db
from app.models.db_models import AuditLog, User
from app.schemas.schemas import ChangePasswordRequest, LoginRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])


class TeacherRegisterRequest(BaseModel):
    name: str
    username: str
    password: str
    institution_key: str


@router.post("/teacher/register")
def register_teacher(request: TeacherRegisterRequest, db: Session = Depends(get_db)):
    """Register a new teacher/admin user (offline)."""
    # 1. Validate institution key
    if request.institution_key != "CAMPUS-2024":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid institution key")

    # 2. Check duplicate username
    existing_user = db.query(User).filter(User.username == request.username).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")

    # 3. Create User with role 'admin'
    new_user = User(
        username=request.username,
        hashed_password=hash_password(request.password),
        role="admin",  # Maps to teacher
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Log audit
    log = AuditLog(
        action="TEACHER_REGISTER",
        details=f"Teacher registered with username: {request.username}",
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "teacher": {
            "id": str(new_user.id),
            "name": request.name,
            "username": new_user.username,
        },
    }


@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Log in user and issue access token aligned with frontend context."""
    user = db.query(User).filter(User.username == request.username).first()
    if not user or not verify_password(request.password, user.hashed_password):
        # Log failed attempt
        log = AuditLog(
            action="FAILED_LOGIN",
            details=f"Failed login attempt for username: {request.username}",
        )
        db.add(log)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    # Generate token
    token = create_access_token(data={"sub": user.username, "role": user.role})

    # Log successful login
    log = AuditLog(
        action="LOGIN",
        details=f"User {user.username} logged in successfully with role {user.role}",
    )
    db.add(log)
    db.commit()

    # Map 'admin' role in database to 'teacher' on the frontend
    frontend_role = "teacher" if user.role == "admin" else "student"

    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "username": user.username,
            "role": frontend_role,
            "name": user.username,
        },
    }


@router.post("/change-password")
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update current user's password."""
    if not verify_password(request.old_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")

    current_user.hashed_password = hash_password(request.new_password)
    db.commit()

    # Log password change
    log = AuditLog(
        action="CHANGE_PASSWORD",
        details=f"User {current_user.username} changed password",
    )
    db.add(log)
    db.commit()

    return {"message": "Password changed successfully"}
