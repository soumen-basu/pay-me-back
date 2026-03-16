from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.api import deps
from app.models.user import User, UserContact, UserContactCreate, UserContactRead

router = APIRouter()


@router.get("/", response_model=List[UserContactRead])
def list_contacts(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    List all frequently-used contacts for the current user.
    """
    contacts: List[UserContact] = (
        db.query(UserContact)
        .filter(UserContact.user_id == current_user.id)
        .order_by(UserContact.created_at.desc())
        .all()
    )
    return contacts


@router.post("/", response_model=UserContactRead, status_code=status.HTTP_201_CREATED)
def add_contact(
    *,
    db: Session = Depends(deps.get_db),
    contact_in: UserContactCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Add a frequently-used contact. 409 if the email already exists for this user.
    """
    existing: UserContact | None = (
        db.query(UserContact)
        .filter(
            UserContact.user_id == current_user.id,
            UserContact.contact_email == contact_in.contact_email,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Contact '{contact_in.contact_email}' already exists.",
        )

    contact = UserContact(
        user_id=current_user.id,
        contact_email=contact_in.contact_email,
        label=contact_in.label,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/{contact_id}")
def delete_contact(
    contact_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Remove a frequently-used contact. Only the owning user can delete.
    """
    contact: UserContact | None = db.get(UserContact, contact_id)
    if not contact or contact.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found.",
        )
    db.delete(contact)
    db.commit()
    return {"msg": "Contact deleted successfully"}
