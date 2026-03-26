import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session
from datetime import datetime, timedelta

from app.models.user import User, UserActivity
from app.models.claim import Claim
from app.models.expense import Expense
from app.core.security import get_password_hash

def test_get_ecosystem_performance(client: TestClient, session: Session):
    admin = User(email="admin_perf@example.com", password_hash=get_password_hash("adminPass"), role="admin", is_active=True)
    session.add(admin)
    
    # Add some activity
    activity = UserActivity(user_id=1, date=datetime.utcnow().date())
    session.add(activity)
    
    session.commit()
    
    login_response = client.post(
        "/api/v1/auth/access-token",
        data={"username": "admin_perf@example.com", "password": "adminPass"}
    )
    token = login_response.json()["access_token"]
    
    response = client.get(
        "/api/v1/admin/performance",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "mau" in data
    assert "dau" in data
    assert "transaction_efficiency" in data
    assert len(data["transaction_efficiency"]) == 4

def test_get_total_stats(client: TestClient, session: Session):
    admin = User(email="admin_stats@example.com", password_hash=get_password_hash("adminPass"), role="admin", is_active=True)
    session.add(admin)
    session.commit()
    
    login_response = client.post(
        "/api/v1/auth/access-token",
        data={"username": "admin_stats@example.com", "password": "adminPass"}
    )
    token = login_response.json()["access_token"]
    
    response = client.get(
        "/api/v1/admin/stats",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "total_payouts" in data
    assert "claims_processed" in data

def test_get_pending_magic_links(client: TestClient, session: Session):
    admin = User(email="admin_magic@example.com", password_hash=get_password_hash("adminPass"), role="admin", is_active=True)
    
    # User with active magic link
    user1 = User(email="magic1@example.com", magic_token="tk1", magic_token_expires_at=datetime.utcnow() + timedelta(hours=1))
    # User with expired magic link
    user2 = User(email="magic2@example.com", magic_token="tk2", magic_token_expires_at=datetime.utcnow() - timedelta(hours=1))
    
    session.add(admin)
    session.add(user1)
    session.add(user2)
    session.commit()
    
    login_response = client.post(
        "/api/v1/auth/access-token",
        data={"username": "admin_magic@example.com", "password": "adminPass"}
    )
    token = login_response.json()["access_token"]
    
    response = client.get(
        "/api/v1/admin/magic-links",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["email"] == "magic1@example.com"
