import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlmodel import Session
from sqlalchemy import text

from app.models.user import User, UserActivity
from app.core.security import get_password_hash

def test_dau_tracking_on_auth(client: TestClient, session: Session):
    password_hash = get_password_hash("testPass1!")
    user = User(email="active_user@example.com", password_hash=password_hash, is_active=True)
    session.add(user)
    session.commit()
    
    # Hit login to trigger get_current_user middleware indirectly via another protected route
    # First get token
    login_response = client.post(
        "/api/v1/auth/access-token",
        data={"username": "active_user@example.com", "password": "testPass1!"}
    )
    token = login_response.json()["access_token"]
    
    # Hit /me which forces get_current_user evaluation -> triggers the upsert
    response1 = client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response1.status_code == 200
    
    # Request again to verify the UPSERT correctly increments
    response2 = client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response2.status_code == 200
    
    # Assert DB state
    today = datetime.utcnow().date()
    activity = session.exec(
        text("SELECT request_count FROM useractivity WHERE user_id = :uid AND date = :dt"),
        params={"uid": user.id, "dt": today}
    ).fetchone()
    
    assert activity is not None
    assert activity[0] == 2 # 2 requests to /me

def test_admin_metrics_endpoints(client: TestClient, session: Session):
    admin = User(email="metrics_admin@example.com", password_hash=get_password_hash("adminPass"), role="admin", is_active=True)
    session.add(admin)
    session.commit()
    
    login_response = client.post(
        "/api/v1/auth/access-token",
        data={"username": "metrics_admin@example.com", "password": "adminPass"}
    )
    admin_token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Seed historical DAU/MAU data manually
    test_user_id = 999
    session.add(UserActivity(user_id=test_user_id, date=datetime.utcnow().date()))
    session.add(UserActivity(user_id=test_user_id, date=datetime.utcnow().date() - timedelta(days=5)))
    session.add(UserActivity(user_id=888, date=datetime.utcnow().date() - timedelta(days=5)))
    session.commit()
    
    # Verify DAU (Today) -> 2 (the admin hit /me indirectly when checking roles + test_user_id)
    dau_resp = client.get("/api/v1/metrics/dau", headers=headers)
    assert dau_resp.status_code == 200
    
    # Verify Active Users aggregation
    active_resp = client.get("/api/v1/metrics/active-users?days=10", headers=headers)
    assert active_resp.status_code == 200
    data = active_resp.json()
    assert len(data) >= 2 # At least today and 5-days ago keys
    
    # Verify Signups
    signup_resp = client.get("/api/v1/metrics/signups?days=10", headers=headers)
    assert signup_resp.status_code == 200
    assert len(signup_resp.json()) >= 1
    
    # Verify Sessions
    session_resp = client.get("/api/v1/metrics/sessions", headers=headers)
    assert session_resp.status_code == 200
    assert "total_active_sessions" in session_resp.json()
