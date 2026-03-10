import uuid
from datetime import datetime
from sqlmodel import Field, SQLModel

class Notification(SQLModel, table=True):
    """
    Model representing an in-app notification sent to a user.
    """
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    title: str = Field(index=False)
    content: str = Field(index=False)
    is_read: bool = Field(default=False, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
