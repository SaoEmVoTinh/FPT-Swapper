import uuid

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.common.enums import AccountStatus
from app.core.config import settings
from app.core.dependencies import get_current_staff, get_current_student
from app.core.rate_limit import check_rate_limit
from app.core.security import create_access_token, create_ws_ticket, decode_token
from app.core.totp import build_otpauth_uri, generate_totp_secret, verify_totp
from app.database.models import AuditLog, Campus, Student
from app.database.session import get_db
from app.modules.auth.schemas import (
    LoginRequest,
    RegisterRequest,
    RestoreAccountRequest,
    StudentPublicResponse,
    TokenResponse,
    TwoFactorCodeRequest,
    TwoFactorDisableRequest,
    TwoFactorSetupResponse,
    TwoFactorStatusResponse,
)
from app.modules.auth.service import AuthService, _as_utc, _utcnow

router = APIRouter(prefix="/auth", tags=["Authentication"])

COOKIE_MAX_AGE = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


def _student_to_response(student: Student, db: Session) -> StudentPublicResponse:
    profile = student.profile
    campus = db.get(Campus, student.campus_id) if student.campus_id else None
    return StudentPublicResponse(
        id=student.id,
        email=student.email,
        student_code=student.student_code,
        role=student.role.value,
        status=student.status.value,
        full_name=profile.full_name if profile else None,
        major=profile.major if profile else None,
        class_name=profile.class_name if profile else None,
        campus_id=student.campus_id,
        campus_code=campus.code if campus else None,
        campus_name=campus.name if campus else None,
        avatar_url=profile.avatar_url if profile else None,
        bio=profile.bio if profile else None,
        totp_enabled=bool(student.totp_enabled),
        share_contact_after_match=bool(profile.share_contact_after_match) if profile else False,
        share_email_after_match=bool(profile.share_email_after_match) if profile else False,
        share_student_code_after_match=bool(profile.share_student_code_after_match) if profile else False,
        notify_email=bool(profile.notify_email) if profile else True,
        notify_push=bool(profile.notify_push) if profile else True,
        trust_score=float(profile.trust_score) if profile else 5.0,
        completed_swaps_count=int(profile.completed_swaps_count) if profile else 0,
        no_show_count=int(profile.no_show_count) if profile else 0,
    )


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        secure=settings.ENVIRONMENT != "development",
        path="/",
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


@router.post("/register", response_model=StudentPublicResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> StudentPublicResponse:
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"register:{client_ip}", max_requests=20, window_seconds=60)

    svc = AuthService(db)
    try:
        student = svc.register(
            email=payload.email,
            student_code=payload.student_code,
            full_name=payload.full_name,
            major=payload.major,
            campus_id=payload.campus_id,
            password=payload.password,
            class_name=payload.class_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    access_token = create_access_token(
        str(student.id), token_version=int(student.token_version)
    )
    refresh_token = svc.issue_refresh_token(student)
    _set_auth_cookies(response, access_token, refresh_token)
    return _student_to_response(student, db)


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenResponse:
    client_ip = request.client.host if request.client else "unknown"
    ident_key = payload.email.strip().lower()
    check_rate_limit(f"login:{client_ip}:{ident_key}", max_requests=10, window_seconds=60)

    svc = AuthService(db)
    student = svc.authenticate(payload.email, payload.password, totp_code=payload.totp_code)
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email/Mã sinh viên hoặc mật khẩu không đúng.",
        )

    access_token = create_access_token(
        str(student.id), token_version=int(student.token_version)
    )
    refresh_token = svc.issue_refresh_token(student)
    _set_auth_cookies(response, access_token, refresh_token)
    return TokenResponse(
        access_token=access_token,
        expires_in=COOKIE_MAX_AGE,
        user=_student_to_response(student, db),
    )


@router.post("/restore-account", response_model=TokenResponse)
def restore_account(
    payload: RestoreAccountRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenResponse:
    svc = AuthService(db)
    student = svc.authenticate(
        payload.email,
        payload.password,
        totp_code=payload.totp_code,
        allow_pending_restore=True,
    )
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email/Mã sinh viên hoặc mật khẩu không đúng.",
        )
    if student.status != AccountStatus.CLOSED or student.scheduled_purge_at is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản không ở trạng thái chờ xóa.",
        )
    if _as_utc(student.scheduled_purge_at) <= _utcnow():
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Thời hạn khôi phục tài khoản (14 ngày) đã kết thúc.",
        )

    student.status = AccountStatus.ACTIVE
    student.scheduled_purge_at = None
    db.add(
        AuditLog(
            actor_id=student.id,
            action="SELF_RESTORE_ACCOUNT",
            entity_type="student",
            entity_id=student.id,
            details={"email": student.email},
        )
    )
    db.commit()
    db.refresh(student)

    access_token = create_access_token(
        str(student.id), token_version=int(student.token_version)
    )
    refresh_token = svc.issue_refresh_token(student)
    _set_auth_cookies(response, access_token, refresh_token)
    return TokenResponse(
        access_token=access_token,
        expires_in=COOKIE_MAX_AGE,
        user=_student_to_response(student, db),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias="refresh_token"),
    db: Session = Depends(get_db),
) -> TokenResponse:
    if refresh_token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token.")
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError
        student_id = payload["sub"]
        jti = payload.get("jti")
        tv = payload.get("tv")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")

    svc = AuthService(db)
    student = svc.get_by_id(uuid.UUID(student_id))
    if student is None or student.status != AccountStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Student not found or inactive.")
    if tv is not None and int(tv) != int(student.token_version):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revoked.")

    new_refresh = svc.rotate_refresh_token(student, jti)
    access_token = create_access_token(
        str(student.id), token_version=int(student.token_version)
    )
    _set_auth_cookies(response, access_token, new_refresh)
    return TokenResponse(access_token=access_token, expires_in=COOKIE_MAX_AGE)


@router.post("/logout")
def logout(
    response: Response,
    access_token: str | None = Cookie(default=None, alias="access_token"),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    if access_token:
        try:
            payload = decode_token(access_token)
            if payload.get("type") == "access":
                svc = AuthService(db)
                student = svc.get_by_id(uuid.UUID(payload["sub"]))
                if student is not None:
                    svc.revoke_all_tokens(student)
        except Exception:
            pass
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/v1/auth/refresh")
    return {"message": "Đã đăng xuất."}


@router.get("/me", response_model=StudentPublicResponse)
def me(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
) -> StudentPublicResponse:
    return _student_to_response(student, db)


@router.get("/2fa/status", response_model=TwoFactorStatusResponse)
def get_2fa_status(
    student: Student = Depends(get_current_staff),
) -> TwoFactorStatusResponse:
    return TwoFactorStatusResponse(totp_enabled=bool(student.totp_enabled))


@router.post("/2fa/setup", response_model=TwoFactorSetupResponse)
def setup_2fa(
    student: Student = Depends(get_current_staff),
    db: Session = Depends(get_db),
) -> TwoFactorSetupResponse:
    secret = generate_totp_secret()
    student.totp_secret = secret
    student.totp_enabled = False
    db.commit()
    return TwoFactorSetupResponse(
        secret=secret,
        otpauth_uri=build_otpauth_uri(student.email, secret),
    )


@router.post("/2fa/enable", response_model=TwoFactorStatusResponse)
def enable_2fa(
    payload: TwoFactorCodeRequest,
    student: Student = Depends(get_current_staff),
    db: Session = Depends(get_db),
) -> TwoFactorStatusResponse:
    if not student.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng tạo mã bí mật 2FA trước.",
        )
    if not verify_totp(student.totp_secret, payload.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã OTP 2FA không hợp lệ.",
        )
    student.totp_enabled = True
    db.add(
        AuditLog(
            actor_id=student.id,
            action="ADMIN_ENABLE_2FA",
            entity_type="student",
            entity_id=student.id,
            details={"email": student.email},
        )
    )
    db.commit()
    return TwoFactorStatusResponse(totp_enabled=True)


@router.post("/2fa/disable", response_model=TwoFactorStatusResponse)
def disable_2fa(
    payload: TwoFactorDisableRequest,
    student: Student = Depends(get_current_staff),
    db: Session = Depends(get_db),
) -> TwoFactorStatusResponse:
    from app.core.security import verify_password

    if not verify_password(payload.password, student.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu không chính xác.",
        )
    if student.totp_enabled and student.totp_secret and not verify_totp(student.totp_secret, payload.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã OTP 2FA không chính xác.",
        )
    student.totp_enabled = False
    student.totp_secret = None
    db.add(
        AuditLog(
            actor_id=student.id,
            action="ADMIN_DISABLE_2FA",
            entity_type="student",
            entity_id=student.id,
            details={"email": student.email},
        )
    )
    db.commit()
    return TwoFactorStatusResponse(totp_enabled=False)


@router.get("/ws-ticket")
def ws_ticket(student: Student = Depends(get_current_student)) -> dict[str, str | int]:
    """Issue a short-lived WebSocket handshake ticket for the authenticated student."""
    return {"ticket": create_ws_ticket(str(student.id)), "expires_in": 60}
