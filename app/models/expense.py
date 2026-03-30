import uuid
import datetime
from typing import Optional
from sqlmodel import Field, SQLModel
from pydantic import field_validator

from app.core.currencies import VALID_CURRENCY_CODES

class ExpenseBase(SQLModel):
    amount: float
    description: str
    date: datetime.date
    category_name: str
    currency_code: str = Field(default="INR")  # ISO 4217 code
    status: str = Field(default="OPEN") # OPEN, APPROVED, REJECTED
    owner_id: int = Field(foreign_key="user.id", index=True)
    claim_id: Optional[uuid.UUID] = Field(default=None, foreign_key="claim.id", index=True)

class Expense(ExpenseBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)

class ExpenseCreate(SQLModel):
    amount: float
    description: str
    date: datetime.date
    category_name: str
    currency_code: str = "INR"
    claim_id: Optional[uuid.UUID] = None

    @field_validator("currency_code")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        if v not in VALID_CURRENCY_CODES:
            raise ValueError(f"Invalid currency code '{v}'. Must be one of: {sorted(VALID_CURRENCY_CODES)}")
        return v

class ExpenseRead(ExpenseBase):
    id: uuid.UUID
    created_at: datetime.datetime

class ExpenseUpdate(SQLModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    date: Optional[datetime.date] = None
    category_name: Optional[str] = None
    currency_code: Optional[str] = None
    status: Optional[str] = None
    claim_id: Optional[uuid.UUID] = None

    @field_validator("currency_code")
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_CURRENCY_CODES:
            raise ValueError(f"Invalid currency code '{v}'. Must be one of: {sorted(VALID_CURRENCY_CODES)}")
        return v
