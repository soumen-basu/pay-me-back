import uuid
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.schemas.notification import NotificationCreate, NotificationUpdate
from app.core.config import settings
from fastapi.encoders import jsonable_encoder

def create_notification(db: Session, *, obj_in: NotificationCreate) -> Notification:
    """Create a new notification."""
    obj_in_data = jsonable_encoder(obj_in)
    db_obj = Notification(**obj_in_data)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    # Prune notifications if threshold exceeded
    prune_notifications(db, user_id=obj_in.user_id)
    return db_obj

def get_user_notifications(db: Session, *, user_id: int, skip: int = 0, limit: int = 100) -> List[Notification]:
    """Get all notifications for a specific user, ordered by newest first."""
    return db.query(Notification)\
        .filter(Notification.user_id == user_id)\
        .order_by(Notification.created_at.desc())\
        .offset(skip).limit(limit).all()

def get_notification(db: Session, *, notification_id: uuid.UUID) -> Optional[Notification]:
    """Get a specific notification by ID."""
    return db.query(Notification).filter(Notification.id == notification_id).first()

def mark_as_read(db: Session, *, notification_id: uuid.UUID) -> Optional[Notification]:
    """Mark a specific notification as read."""
    db_obj = get_notification(db, notification_id=notification_id)
    if db_obj:
        db_obj.is_read = True
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
    return db_obj

def delete_notification(db: Session, *, notification_id: uuid.UUID) -> bool:
    """Delete a specific notification."""
    db_obj = get_notification(db, notification_id=notification_id)
    if db_obj:
        db.delete(db_obj)
        db.commit()
        return True
    return False

def prune_notifications(db: Session, *, user_id: int) -> int:
    """
    Check if a user has exceeded the notification threshold, and delete the oldest ones 
    if necessary. Returns the number of notifications deleted.
    """
    threshold = settings.NOTIFICATION_AUTO_DELETE_THRESHOLD
    delete_amount = settings.NOTIFICATION_AUTO_DELETE_AMOUNT
    
    count = db.query(Notification).filter(Notification.user_id == user_id).count()
    if count > threshold:
        # Find the oldest N notifications to delete
        oldest_notifications = db.query(Notification)\
            .filter(Notification.user_id == user_id)\
            .order_by(Notification.created_at.asc())\
            .limit(delete_amount).all()
            
        deleted_count = 0
        for notif in oldest_notifications:
            db.delete(notif)
            deleted_count += 1
            
        if deleted_count > 0:
            db.commit()
        return deleted_count
    return 0
