import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict

# Shared properties
class NotificationBase(BaseModel):
    title: str
    content: str
    is_read: bool = False

# Properties to receive via API on creation (e.g. from an internal worker)
class NotificationCreate(NotificationBase):
    user_id: int

# Properties to receive via API on update
class NotificationUpdate(BaseModel):
    is_read: bool

# Properties shared by models stored in DB
class NotificationInDBBase(NotificationBase):
    id: uuid.UUID
    user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Properties to return to client
class NotificationResponse(NotificationInDBBase):
    pass
