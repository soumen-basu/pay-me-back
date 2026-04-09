import uuid
from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlmodel import Session

from app.core import config
from app.db.session import get_session
from app.models.user import User

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{config.settings.API_V1_STR}/auth/access-token"
)

def get_db() -> Generator:
    try:
        db = next(get_session())
        yield db
    finally:
        db.close()

from sqlalchemy import text
from datetime import datetime

def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(reusable_oauth2)
) -> User:
    try:
        payload = jwt.decode(
            token, config.settings.SECRET_KEY, algorithms=["HS256"]
        )
        token_data = payload.get("sub")
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = db.get(User, token_data)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Track daily active user on every successful auth
    today = datetime.utcnow().date()
    db.exec(
        text(
            "INSERT INTO useractivity (id, user_id, date, request_count) "
            "VALUES (:uuid, :user_id, :date, 1) "
            "ON CONFLICT (user_id, date) DO UPDATE "
            "SET request_count = useractivity.request_count + 1"
        ),
        params={
            "uuid": str(uuid.uuid4()),
            "user_id": user.id,
            "date": today
        }
    )
    db.commit()
    
    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user

from app.core.tiers import get_tier_config

def require_capability(capability_name: str):
    def dependency(user: User = Depends(get_current_active_user)):
        tier_config = get_tier_config(user.tier)
        if not getattr(tier_config.capabilities, capability_name, False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=f"Your tier ({user.tier}) does not support the {capability_name} feature."
            )
        return user
    return dependency
