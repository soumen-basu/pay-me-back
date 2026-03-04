from datetime import datetime, timedelta
from typing import Any
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session
from pydantic import BaseModel, EmailStr

from app.api import deps
from app.core import config
from app.core.security import create_access_token, verify_password
from app.models.user import User, Session as UserSession
from app.services.email import send_email

router = APIRouter()

class MagicLinkRequest(BaseModel):
    email: EmailStr


@router.post("/access-token")
def login_access_token(
    db: Session = Depends(deps.get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    access_token_expires = timedelta(minutes=config.settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    if config.settings.USE_DB_SESSIONS:
        db_session = UserSession(
            user_id=user.id,
            expires_at=datetime.utcnow() + access_token_expires
        )
        db.add(db_session)
        db.commit()
        
    return {
        "access_token": create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.post("/magic-link")
def request_magic_link(
    request: MagicLinkRequest,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Request a magic link to be sent to the user's email.
    """
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        # Create a new user with no password
        user = User(email=request.email)
        db.add(user)
        db.commit()
        db.refresh(user)
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
        
    token = secrets.token_urlsafe(32)
    user.magic_token = token
    user.magic_token_expires_at = datetime.utcnow() + timedelta(minutes=config.settings.MAGIC_LINK_EXPIRE_MINUTES)
    db.commit()
    
    magic_link = f"http://localhost:8000/verify?email={user.email}&token={token}"
    subject = f"Your Magic Link to log in to {config.settings.PROJECT_NAME}"
    body_text = f"Login here: {magic_link}\nThis link expires in {config.settings.MAGIC_LINK_EXPIRE_MINUTES} minutes."
    body_html = f"<p>Login to {config.settings.PROJECT_NAME} by clicking <a href='{magic_link}'>here</a>.</p><p>This link expires in {config.settings.MAGIC_LINK_EXPIRE_MINUTES} minutes.</p>"
    
    send_email(db, user.email, subject, body_text, body_html)
    
    return {"msg": "If the email is valid, a magic link has been sent."}

@router.get("/verify")
def verify_magic_link(
    email: str,
    token: str,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Verify a magic link token and log the user in.
    """
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired magic link"
        )
        
    if not user.magic_token or user.magic_token != token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired magic link"
        )
        
    if not user.magic_token_expires_at or user.magic_token_expires_at < datetime.utcnow():
        # Clear expired token
        user.magic_token = None
        user.magic_token_expires_at = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired magic link"
        )
        
    # Valid token: clear it and proceed
    user.magic_token = None
    user.magic_token_expires_at = None
    db.commit()
    
    access_token_expires = timedelta(minutes=config.settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        user.id, expires_delta=access_token_expires
    )
    
    if config.settings.USE_DB_SESSIONS:
        db_session = UserSession(
            user_id=user.id,
            expires_at=datetime.utcnow() + access_token_expires
        )
        db.add(db_session)
        db.commit()

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }
