from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import (
    hash_password,
    verify_password,
    hash_token,
    create_access_token,
    create_refresh_token_value,
    get_current_user,
)
from ..config import settings
from ..db import get_db
from ..models import User, InviteCode, RefreshToken, PasswordResetToken
from ..schemas import (
    RegisterSchema, LoginSchema, TokenSchema, UserSchema,
    ForgotPasswordSchema, ResetPasswordSchema,
)
from ..services.default_widgets import seed_default_widgets
from ..services.email import send_reset_email

router = APIRouter(prefix="/auth")

REFRESH_COOKIE = "refresh_token"
REFRESH_MAX_AGE = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=REFRESH_MAX_AGE,
        path="/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=REFRESH_COOKIE, path="/auth")


async def _create_and_store_refresh(db: AsyncSession, user_id: int) -> str:
    raw_token = create_refresh_token_value()
    rt = RefreshToken(
        user_id=user_id,
        token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(rt)
    await db.flush()
    return raw_token


@router.post("/register", response_model=TokenSchema, status_code=201)
async def register(body: RegisterSchema, response: Response, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    invite = await db.execute(select(InviteCode).where(InviteCode.code == body.invite_code))
    invite_code = invite.scalar_one_or_none()
    if not invite_code:
        raise HTTPException(status_code=400, detail="Invalid invite code")
    if invite_code.expires_at and invite_code.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invite code expired")
    if invite_code.max_uses is not None and invite_code.use_count >= invite_code.max_uses:
        raise HTTPException(status_code=400, detail="Invite code fully used")

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        birth_date=body.birth_date,
    )
    db.add(user)
    await db.flush()

    invite_code.use_count += 1

    await seed_default_widgets(db, user.id)

    access = create_access_token(user.id, user.is_admin)
    refresh = await _create_and_store_refresh(db, user.id)
    await db.commit()

    _set_refresh_cookie(response, refresh)
    return TokenSchema(access_token=access)


@router.post("/login", response_model=TokenSchema)
async def login(body: LoginSchema, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access = create_access_token(user.id, user.is_admin)
    refresh = await _create_and_store_refresh(db, user.id)
    await db.commit()

    _set_refresh_cookie(response, refresh)
    return TokenSchema(access_token=access)


@router.post("/refresh", response_model=TokenSchema)
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(None, alias=REFRESH_COOKIE),
    db: AsyncSession = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")

    token_hash = hash_token(refresh_token)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked == False,
            RefreshToken.expires_at > datetime.now(timezone.utc),
        )
    )
    rt = result.scalar_one_or_none()
    if not rt:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    rt.revoked = True

    user_result = await db.execute(select(User).where(User.id == rt.user_id))
    user = user_result.scalar_one()

    access = create_access_token(user.id, user.is_admin)
    new_refresh = await _create_and_store_refresh(db, user.id)
    await db.commit()

    _set_refresh_cookie(response, new_refresh)
    return TokenSchema(access_token=access)


@router.post("/logout", status_code=204)
async def logout(
    response: Response,
    user: User = Depends(get_current_user),
    refresh_token: str | None = Cookie(None, alias=REFRESH_COOKIE),
    db: AsyncSession = Depends(get_db),
):
    if refresh_token:
        token_hash = hash_token(refresh_token)
        result = await db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        rt = result.scalar_one_or_none()
        if rt:
            rt.revoked = True
            await db.commit()

    _clear_refresh_cookie(response)


@router.post("/forgot-password", status_code=200)
async def forgot_password(body: ForgotPasswordSchema, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user:
        email = user.email
        raw_token = create_refresh_token_value()
        prt = PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(raw_token),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES),
        )
        db.add(prt)
        await db.commit()
        await send_reset_email(email, raw_token)

    return {"detail": "If that email exists, a reset link has been sent"}


@router.post("/reset-password", status_code=200)
async def reset_password(body: ResetPasswordSchema, db: AsyncSession = Depends(get_db)):
    token_hash = hash_token(body.token)
    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used == False,
            PasswordResetToken.expires_at > datetime.now(timezone.utc),
        )
    )
    prt = result.scalar_one_or_none()
    if not prt:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user_result = await db.execute(select(User).where(User.id == prt.user_id))
    user = user_result.scalar_one()
    user.hashed_password = hash_password(body.new_password)
    prt.used = True
    await db.commit()

    return {"detail": "Password has been reset"}


@router.get("/me", response_model=UserSchema)
async def me(user: User = Depends(get_current_user)):
    return user
