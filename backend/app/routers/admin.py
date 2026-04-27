from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import require_admin
from ..db import get_db
from ..models import InviteCode, User, Widget
from ..schemas import InviteCodeCreateSchema, InviteCodeSchema, UserAdminSchema

router = APIRouter(prefix="/admin")


@router.get("/invite-codes", response_model=List[InviteCodeSchema])
async def list_invite_codes(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(InviteCode).order_by(InviteCode.created_at.desc()))
    return result.scalars().all()


@router.post("/invite-codes", response_model=InviteCodeSchema, status_code=201)
async def create_invite_code(
    body: InviteCodeCreateSchema,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(InviteCode).where(InviteCode.code == body.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Invite code already exists")

    code = InviteCode(
        code=body.code,
        created_by=admin.id,
        max_uses=body.max_uses,
        expires_at=body.expires_at,
    )
    db.add(code)
    await db.commit()
    await db.refresh(code)
    return code


@router.delete("/invite-codes/{code_id}", status_code=204)
async def delete_invite_code(
    code_id: int,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(InviteCode).where(InviteCode.id == code_id))
    code = result.scalar_one_or_none()
    if not code:
        raise HTTPException(status_code=404, detail="Invite code not found")
    await db.delete(code)
    await db.commit()


@router.get("/users", response_model=List[UserAdminSchema])
async def list_users(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            User.id,
            User.email,
            User.birth_date,
            User.is_admin,
            User.created_at,
            func.count(Widget.id).label("widget_count"),
        )
        .outerjoin(Widget, Widget.user_id == User.id)
        .group_by(User.id)
        .order_by(User.created_at.desc())
    )
    return [
        UserAdminSchema(
            id=row.id,
            email=row.email,
            birth_date=row.birth_date,
            is_admin=row.is_admin,
            created_at=row.created_at,
            widget_count=row.widget_count,
        )
        for row in result.all()
    ]
