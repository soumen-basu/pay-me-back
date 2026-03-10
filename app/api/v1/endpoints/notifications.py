import uuid
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.crud import crud_notification
from app.schemas.notification import NotificationCreate, NotificationResponse, NotificationUpdate
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[NotificationResponse])
def read_notifications(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve notifications for the current authenticated user.
    """
    notifications = crud_notification.get_user_notifications(db, user_id=current_user.id, skip=skip, limit=limit)
    return notifications

@router.patch("/{id}/read", response_model=NotificationResponse)
def mark_notification_read(
    id: uuid.UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Mark a specific notification as read.
    """
    notification = crud_notification.get_notification(db, notification_id=id)
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    
    return crud_notification.mark_as_read(db, notification_id=id)

@router.delete("/{id}")
def delete_notification(
    id: uuid.UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete a specific notification.
    """
    notification = crud_notification.get_notification(db, notification_id=id)
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    
    crud_notification.delete_notification(db, notification_id=id)
    return {"msg": "Notification deleted"}

@router.post("/sys/broadcast", response_model=List[NotificationResponse])
def send_system_broadcast(
    *,
    db: Session = Depends(deps.get_db),
    title: str,
    content: str,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Send a system-wide broadcast to all users. (Admin only)
    """
    users = db.query(User).offset(0).limit(10000).all() # Simple implementation for MVP
    created_notifications = []
    
    for user in users:
        notif_in = NotificationCreate(
            title=title,
            content=content,
            user_id=user.id
        )
        notif = crud_notification.create_notification(db, obj_in=notif_in)
        created_notifications.append(notif)
        
    return created_notifications
    
@router.post("/sys/target/{user_id}", response_model=NotificationResponse)
def send_targeted_notification(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    title: str,
    content: str,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Send a notification to a specific user. (Admin only)
    """
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target User not found")
        
    notif_in = NotificationCreate(
        title=title,
        content=content,
        user_id=user_id
    )
    return crud_notification.create_notification(db, obj_in=notif_in)
