from typing import Any, List, Optional
from datetime import datetime

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlmodel import Session

from app.api import deps
from app.core import config
from app.models.user import User, UserCreate, UserRead, UserUpdate, UserWithMagicLink, UserUpdateAdmin, UserProfileOut
from app.core.security import get_password_hash, validate_password_complexity

from typing import Optional

router = APIRouter()

@router.get("/", response_model=List[UserRead])
def read_users(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Retrieve users.
    """
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.get("/me", response_model=UserProfileOut)
def read_user_me(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user.
    """
    return UserProfileOut(
        email=current_user.email,
        display_name=current_user.display_name,
        role=current_user.role,
        is_active=current_user.is_active,
        id=current_user.id,
        created_at=current_user.created_at,
        has_password=bool(current_user.password_hash)
    )

@router.patch("/me", response_model=UserProfileOut)
def update_user_me(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update own user.
    """
    update_data = user_in.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided to update")
        

    if user_in.password:
        if config.settings.ENFORCE_PASSWORD_COMPLEXITY and not validate_password_complexity(user_in.password):
            raise HTTPException(
                status_code=400,
                detail="Password must be 8-32 characters, with at least one uppercase, lowercase, number, and special character.",
            )
        current_user.password_hash = get_password_hash(user_in.password)
        
    if user_in.display_name is not None:
        current_user.display_name = user_in.display_name
        
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return UserProfileOut(
        email=current_user.email,
        display_name=current_user.display_name,
        role=current_user.role,
        is_active=current_user.is_active,
        id=current_user.id,
        created_at=current_user.created_at,
        has_password=bool(current_user.password_hash)
    )

@router.delete("/me")
def delete_user_me(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Deactivate own user.
    """
    current_user.is_active = False
    db.add(current_user)
    db.commit()
    return {"msg": "User deactivated successfully"}

@router.post("/me/sessions/invalidate")
def invalidate_own_sessions(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Invalidate all sessions for the current user (Global Logout).
    """
    from app.models.user import Session as UserSession
    deleted_count = db.query(UserSession).filter(UserSession.user_id == current_user.id).delete()
    db.commit()
    return {"msg": f"Successfully invalidated {deleted_count} sessions"}
@router.get("/pending-magic-links", response_model=List[UserWithMagicLink])
def read_pending_magic_links(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Retrieve users with pending magic links.
    """
    users = db.query(User).filter(User.magic_token.isnot(None)).filter(User.magic_token_expires_at > datetime.utcnow()).all()
    return users

from sqlmodel import select

@router.get("/recent-contacts", response_model=List[str])
def get_recent_contacts(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve recently used contacts (or all active users for MVP).
    """
    users = db.exec(select(User).where(User.is_active == True)).all()
    emails = [u.email for u in users if u.id != current_user.id]
    return emails

