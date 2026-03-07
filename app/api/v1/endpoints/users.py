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
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve users.
    """
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.post("/", response_model=UserRead)
def create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
) -> Any:
    """
    Create new user.
    """
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    if config.settings.ENFORCE_PASSWORD_COMPLEXITY and not validate_password_complexity(user_in.password):
        raise HTTPException(
            status_code=400,
            detail="Password must be 8-32 characters, with at least one uppercase, lowercase, number, and special character.",
        )
    user = User.model_validate(user_in, update={"password_hash": get_password_hash(user_in.password)})
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

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

@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    user_in: UserUpdateAdmin,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Update a user (admin only).
    """
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )
        
    if user_in.password:
        if config.settings.ENFORCE_PASSWORD_COMPLEXITY and not validate_password_complexity(user_in.password):
            raise HTTPException(
                status_code=400,
                detail="Password must be 8-32 characters, with at least one uppercase, lowercase, number, and special character.",
            )
        user.password_hash = get_password_hash(user_in.password)
        
    if user_in.display_name is not None:
        user.display_name = user_in.display_name
    if user_in.role is not None:
        user.role = user_in.role
    if user_in.is_active is not None:
        user.is_active = user_in.is_active
        
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

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
