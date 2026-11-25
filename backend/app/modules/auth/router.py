from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_student
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.database.models import Student
from app.database.session import get_db
from app.modules.auth.schemas import (
    LoginRequest,
    RegisterRequest,
    StudentPublicResponse,
    TokenResponse,
)
from app.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])

COOKIE_MAX_AGE = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


def _student_to_response(student: Student) -> StudentPublicResponse:
    profile = student.profile
    return StudentPublicResponse(
        id=student.id,
        email=student.email,
        student_code=student.student_code,
        role=student.role.value,
        status=student.status.value,
        full_name=profile.full_name if profile else None,
        major=profile.major if profile else None,
        campus_id=student.campus_id,
        avatar_url=profile.avatar_url if profile else None,
    )


@router.post("/register", response_model=StudentPublicResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)) -> StudentPublicResponse:
    svc = AuthService(db)
    try:
        student = svc.register(
            email=payload.email,
            student_code=payload.student_code,
            full_name=payload.full_name,
            major=payload.major,
            campus_id=payload.campus_id,
            password=payload.password,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    access_token = create_access_token(str(student.id))
    refresh_token = create_refresh_token(str(student.id))

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        secure=settings.ENVIRONMENT != "development",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        secure=settings.ENVIRONMENT != "development",
        path="/api/v1/auth/refresh",
    )
    return _student_to_response(student)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> TokenResponse:
    svc = AuthService(db)
    student = svc.authenticate(payload.email, payload.password)
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng.",
        )
    if student.status.value != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị khoá hoặc đóng.",
        )

    access_token = create_access_token(str(student.id))
    refresh_token = create_refresh_token(str(student.id))

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        secure=settings.ENVIRONMENT != "development",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        secure=settings.ENVIRONMENT != "development",
        path="/api/v1/auth/refresh",
    )
    return TokenResponse(
        access_token=access_token,
        expires_in=COOKIE_MAX_AGE,
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    response: Response,
    refresh_token: str | None = None,
    db: Session = Depends(get_db),
) -> TokenResponse:
    from fastapi import Cookie
    if refresh_token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token.")
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError
        student_id = payload["sub"]
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")

    svc = AuthService(db)
    import uuid
    student = svc.get_by_id(uuid.UUID(student_id))
    if student is None or student.status.value != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Student not found or inactive.")

    access_token = create_access_token(str(student.id))
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        secure=settings.ENVIRONMENT != "development",
    )
    return TokenResponse(access_token=access_token, expires_in=COOKIE_MAX_AGE)


@router.post("/logout")
def logout(response: Response) -> dict[str, str]:
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token", path="/api/v1/auth/refresh")
    return {"message": "Đã đăng xuất."}


@router.get("/me", response_model=StudentPublicResponse)
def me(student: Student = Depends(get_current_student)) -> StudentPublicResponse:
    return _student_to_response(student)
