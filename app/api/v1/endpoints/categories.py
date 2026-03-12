from typing import Any, List
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api import deps
from app.models.user import User
from app.models.category import Category, CategoryCreate, CategoryRead

router = APIRouter()

@router.get("/", response_model=List[CategoryRead])
def read_categories(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve user-specific categories.
    """
    categories = db.exec(
        select(Category)
        .where(Category.user_id == current_user.id)
        .where(Category.is_active == True)
    ).all()
    return categories

@router.post("/", response_model=CategoryRead)
def create_category(
    *,
    db: Session = Depends(deps.get_db),
    category_in: CategoryCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new category for the current user.
    """
    # Check if category with same name already exists
    existing = db.exec(
        select(Category)
        .where(Category.user_id == current_user.id)
        .where(Category.name == category_in.name)
    ).first()

    if existing:
        if existing.is_active:
            raise HTTPException(status_code=400, detail="Category already exists")
        else:
            # Reactivate soft-deleted category
            existing.is_active = True
            db.add(existing)
            db.commit()
            db.refresh(existing)
            return existing

    category = Category(
        name=category_in.name,
        user_id=current_user.id,
        is_active=True
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

@router.delete("/{name}")
def delete_category(
    name: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Soft delete a category by name.
    """
    category = db.exec(
        select(Category)
        .where(Category.user_id == current_user.id)
        .where(Category.name == name)
        .where(Category.is_active == True)
    ).first()
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
        
    category.is_active = False
    db.add(category)
    db.commit()
    return {"msg": "Category deleted (soft)"}
