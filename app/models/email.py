import uuid
from datetime import datetime
from sqlmodel import Field, SQLModel, UniqueConstraint

class EmailDailyLog(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("email", "date", name="uix_email_date"),)
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(index=True)
    date: datetime = Field(index=True) # Normalized to exactly 00:00:00 UTC
    sent_count: int = Field(default=0)
