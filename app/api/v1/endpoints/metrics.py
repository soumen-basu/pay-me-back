from typing import Any, List, Dict
from datetime import datetime, timedelta
from sqlalchemy import text, func, distinct
from pydantic import BaseModel

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.api import deps
from app.models.user import User, UserActivity, Session as UserSession

router = APIRouter()

class MetricCount(BaseModel):
    count: int

class DailyMetric(BaseModel):
    date: str
    count: int

class SessionMetrics(BaseModel):
    total_active_sessions: int
    unique_users_logged_in: int

@router.get("/dau", response_model=MetricCount)
def get_daily_active_users(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Get Total Daily Active Users (DAU) for today.
    """
    today = datetime.utcnow().date()
    count = db.exec(select(func.count(distinct(UserActivity.user_id))).where(UserActivity.date == today)).one()
    return {"count": count}

@router.get("/mau", response_model=MetricCount)
def get_monthly_active_users(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Get Total Monthly Active Users (MAU) for the rolling 30 days.
    """
    thirty_days_ago = datetime.utcnow().date() - timedelta(days=30)
    count = db.exec(select(func.count(distinct(UserActivity.user_id))).where(UserActivity.date >= thirty_days_ago)).one()
    return {"count": count}

@router.get("/active-users", response_model=Dict[str, List[int]])
def get_active_users_by_day(
    days: int = 30,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Returns a dictionary grouping dates (YYYY-MM-DD) to a list of user_ids that were active on that date.
    """
    start_date = datetime.utcnow().date() - timedelta(days=days)
    activities = db.exec(select(UserActivity).where(UserActivity.date >= start_date).order_by(UserActivity.date.desc())).all()
    
    result = {}
    for activity in activities:
        date_str = activity.date.strftime("%Y-%m-%d")
        if date_str not in result:
            result[date_str] = []
        result[date_str].append(activity.user_id)
        
    return result

@router.get("/signups", response_model=List[DailyMetric])
def get_daily_signups(
    days: int = 30,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Returns the count of new user signups grouped by day for the last N days.
    """
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Query to group signups by the date part of created_at
    query_result = db.exec(
        select(
            func.date(User.created_at).label("date"), 
            func.count(User.id).label("count")
        )
        .where(User.created_at >= start_date)
        .group_by(func.date(User.created_at))
        .order_by(func.date(User.created_at).desc())
    ).all()
    
    metrics = []
    for row in query_result:
        metrics.append({"date": row[0].strftime("%Y-%m-%d") if isinstance(row[0], datetime) else str(row[0]), "count": row[1]})
    
    return metrics

@router.get("/sessions", response_model=SessionMetrics)
def get_session_metrics(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Returns metrics regarding active database sessions (if USE_DB_SESSIONS is true).
    """
    now = datetime.utcnow()
    
    total_sessions = db.exec(select(func.count(UserSession.id)).where(UserSession.expires_at > now)).one()
    unique_users = db.exec(select(func.count(distinct(UserSession.user_id))).where(UserSession.expires_at > now)).one()
    
    return {
        "total_active_sessions": total_sessions,
        "unique_users_logged_in": unique_users
    }
