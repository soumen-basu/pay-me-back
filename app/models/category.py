import uuid
from typing import Optional
from sqlmodel import Field, SQLModel

class CategoryBase(SQLModel):
    name: str = Field(index=True)
    is_active: bool = Field(default=True)
    user_id: int = Field(foreign_key="user.id", index=True)

class Category(CategoryBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

class CategoryCreate(SQLModel):
    name: str

class CategoryRead(CategoryBase):
    id: uuid.UUID
