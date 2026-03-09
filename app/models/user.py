import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel

class UserBase(SQLModel):
    email: str = Field(unique=True, index=True)
    display_name: Optional[str] = None
    role: str = Field(default="user")
    is_active: bool = Field(default=True)

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    password_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Magic Link fields
    magic_token: Optional[str] = None
    magic_token_expires_at: Optional[datetime] = None

class Session(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    token: Optional[str] = None # Optional: Store token hash if needed
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)

from sqlmodel import Field, SQLModel, UniqueConstraint

class UserActivity(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("user_id", "date", name="uix_user_id_date"),)
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    date: datetime = Field(index=True) # Will store dates with 00:00:00 time
    request_count: int = Field(default=1)

# Pydantic models for API
class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: int
    created_at: datetime

class UserUpdate(SQLModel):
    display_name: Optional[str] = None
    password: Optional[str] = None

class UserUpdateAdmin(UserUpdate):
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserWithMagicLink(UserRead):
    magic_token: Optional[str] = None
    magic_token_expires_at: Optional[datetime] = None

class UserProfileOut(UserRead):
    has_password: bool

class UserAdminView(UserRead):
    session_count: int = 0
    last_active_time: Optional[datetime] = None
