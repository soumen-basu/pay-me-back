from typing import Any, List, Optional, Union
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func

from app.api import deps
from app.core import config
from app.models.user import User, UserCreate, UserRead, UserUpdateAdmin, UserAdminView, Session as UserSession
from app.core.security import get_password_hash, validate_password_complexity

router = APIRouter()

@router.post("/users", response_model=UserRead)
def create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Create a new user. Restricted to admin only.
    Allows specifying role and is_active status directly.
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

    # Default display_name to email if not provided
    display_name = user_in.display_name if user_in.display_name is not None else user_in.email

    user_data = user_in.model_dump()
    user_data['display_name'] = display_name
    user_data['password_hash'] = get_password_hash(user_in.password)
    del user_data['password']

    db_user = User(**user_data)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/users/active", response_model=List[UserAdminView])
def read_active_users(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Retrieve all active users along with their session count and last active time.
    """
    users = db.query(User).filter(User.is_active == True).offset(skip).limit(limit).all()
    
    result = []
    for user in users:
        # Calculate session metadata
        sessions = db.query(UserSession).filter(UserSession.user_id == user.id).all()
        session_count = len(sessions)
        last_active = None
        if sessions:
            last_active = max(sessions, key=lambda s: s.created_at).created_at
            
        view = UserAdminView.model_validate(user, update={
            "session_count": session_count,
            "last_active_time": last_active
        })
        result.append(view)
        
    return result

@router.get("/users/{user_ident}", response_model=UserRead)
def read_user(
    user_ident: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Get a specific user by ID or Email.
    """
    # Try parsing as ID first
    if user_ident.isdigit():
        user = db.get(User, int(user_ident))
    else:
        user = db.query(User).filter(User.email == user_ident).first()
        
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return user

@router.patch("/users/{user_id}", response_model=UserRead)
def update_user(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    user_in: UserUpdateAdmin,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Update a user. Update only if there is at least one field to update.
    """
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    update_data = user_in.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided to update")
        
    if "password" in update_data:
        if config.settings.ENFORCE_PASSWORD_COMPLEXITY and not validate_password_complexity(update_data["password"]):
            raise HTTPException(
                status_code=400,
                detail="Password must be 8-32 characters, with at least one uppercase, lowercase, number, and special character.",
            )
        user.password_hash = get_password_hash(update_data["password"])
        del update_data["password"]
        
    for field, value in update_data.items():
        setattr(user, field, value)
        
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Deactivate a user.
    """
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_active = False
    db.add(user)
    db.commit()
    return {"msg": f"User {user_id} deactivated successfully"}

@router.post("/users/{user_id}/sessions/invalidate")
def invalidate_user_sessions(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Invalidate all sessions for a specific user (Global Logout).
    """
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Delete all sessions for this user
    deleted_count = db.query(UserSession).filter(UserSession.user_id == user_id).delete()
    db.commit()
    
    return {"msg": f"Successfully invalidated {deleted_count} sessions for user {user_id}"}
