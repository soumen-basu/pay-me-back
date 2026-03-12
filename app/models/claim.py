import uuid
from datetime import datetime
from typing import Optional, List
from sqlmodel import Field, SQLModel
from sqlalchemy import Column, JSON

class ClaimBase(SQLModel):
    title: str = Field(index=True)
    description: Optional[str] = None
    status: str = Field(default="OPEN") # OPEN, APPROVED, REJECTED
    submitter_id: int = Field(foreign_key="user.id", index=True)
    approver_emails: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    viewer_emails: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))

class Claim(ClaimBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ClaimCreate(SQLModel):
    title: str
    description: Optional[str] = None
    approver_emails: Optional[List[str]] = None
    viewer_emails: Optional[List[str]] = None

class ClaimRead(ClaimBase):
    id: uuid.UUID
    created_at: datetime

class ClaimUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
