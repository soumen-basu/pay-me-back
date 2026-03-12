import uuid
from datetime import datetime, date
from typing import Optional
from sqlmodel import Field, SQLModel

class ExpenseBase(SQLModel):
    amount: float
    description: str
    date: date
    category_name: str
    status: str = Field(default="OPEN") # OPEN, APPROVED, REJECTED
    owner_id: int = Field(foreign_key="user.id", index=True)
    claim_id: Optional[uuid.UUID] = Field(default=None, foreign_key="claim.id", index=True)

class Expense(ExpenseBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ExpenseCreate(SQLModel):
    amount: float
    description: str
    date: date
    category_name: str
    claim_id: Optional[uuid.UUID] = None

class ExpenseRead(ExpenseBase):
    id: uuid.UUID
    created_at: datetime

class ExpenseUpdate(SQLModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    date: Optional[date] = None
    category_name: Optional[str] = None
    status: Optional[str] = None
    claim_id: Optional[uuid.UUID] = None
