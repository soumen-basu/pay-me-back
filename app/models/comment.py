import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel

class CommentBase(SQLModel):
    text: str
    user_id: int = Field(foreign_key="user.id", index=True)
    expense_id: Optional[uuid.UUID] = Field(default=None, foreign_key="expense.id", index=True)
    claim_id: Optional[uuid.UUID] = Field(default=None, foreign_key="claim.id", index=True)

class Comment(CommentBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CommentCreate(SQLModel):
    text: str
    expense_id: Optional[uuid.UUID] = None
    claim_id: Optional[uuid.UUID] = None

class CommentRead(CommentBase):
    id: uuid.UUID
    created_at: datetime
