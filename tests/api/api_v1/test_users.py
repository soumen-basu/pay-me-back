import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session
from unittest.mock import patch

from app.models.user import User
from app.core import config
from app.core.security import get_password_hash

def test_update_user_me(client: TestClient, session: Session):
    password_hash = get_password_hash("oldPassword1!")
    user = User(email="test_me@example.com", password_hash=password_hash, is_active=True)
    session.add(user)
    session.commit()
    
    login_response = client.post(
        "/api/v1/auth/access-token",
        data={"username": "test_me@example.com", "password": "oldPassword1!"}
    )
    token = login_response.json()["access_token"]
    
    # Test valid update
    update_response = client.patch(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"display_name": "New Name", "password": "newPassword1!"}
    )
    assert update_response.status_code == 200
    assert update_response.json()["display_name"] == "New Name"
    assert update_response.json()["has_password"] is True
    assert update_response.json()["preferred_currency"] == "INR"  # default unchanged
    
    # Test updating preferred currency
    currency_response = client.patch(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"preferred_currency": "USD"}
    )
    assert currency_response.status_code == 200
    assert currency_response.json()["preferred_currency"] == "USD"
    
    # Test logging in with new password
    login_response2 = client.post(
        "/api/v1/auth/access-token",
        data={"username": "test_me@example.com", "password": "newPassword1!"}
    )
    assert login_response2.status_code == 200
    
def test_read_user_me(client: TestClient, session: Session):
    password_hash = get_password_hash("testPass1!")
    user = User(email="read_me@example.com", password_hash=password_hash, is_active=True, display_name="Read Me")
    session.add(user)
    session.commit()
    
    login_response = client.post(
        "/api/v1/auth/access-token",
        data={"username": "read_me@example.com", "password": "testPass1!"}
    )
    token = login_response.json()["access_token"]
    
    response = client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "read_me@example.com"
    assert data["display_name"] == "Read Me"
    assert data["has_password"] is True
    assert data["preferred_currency"] == "INR"  # default value

def test_update_user_me_complexity_enforced(client: TestClient, session: Session):
    password_hash = get_password_hash("oldPassword1!")
    user = User(email="complex@example.com", password_hash=password_hash, is_active=True)
    session.add(user)
    session.commit()
    
    login_response = client.post(
        "/api/v1/auth/access-token",
        data={"username": "complex@example.com", "password": "oldPassword1!"}
    )
    token = login_response.json()["access_token"]
    
    with patch.object(config.settings, "ENFORCE_PASSWORD_COMPLEXITY", True):
        # Test invalid weak password update
        update_response = client.patch(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {token}"},
            json={"password": "weak"}
        )
        assert update_response.status_code == 400
        assert "Password must be 8-32 characters" in update_response.json()["detail"]

def test_update_user_admin(client: TestClient, session: Session):
    admin = User(email="admin_patch@example.com", password_hash=get_password_hash("adminPass"), role="admin", is_active=True)
    target_user = User(email="target@example.com", password_hash=get_password_hash("targetPass"), is_active=True)
    session.add(admin)
    session.add(target_user)
    session.commit()
    
    login_response = client.post(
        "/api/v1/auth/access-token",
        data={"username": "admin_patch@example.com", "password": "adminPass"}
    )
    admin_token = login_response.json()["access_token"]
    
    # Admin updates target user
    update_response = client.patch(
        f"/api/v1/admin/users/{target_user.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "display_name": "Target New",
            "role": "admin",
            "is_active": False
        }
    )
    assert update_response.status_code == 200
    data = update_response.json()
    assert data["display_name"] == "Target New"
    assert data["role"] == "admin"
    assert data["is_active"] is False
    
    # Verify changes persisted
    session.refresh(target_user)
    assert target_user.display_name == "Target New"
    assert target_user.role == "admin"
    assert target_user.is_active is False

def test_read_users_as_normal_user_fails(client: TestClient, session: Session):
    normal_user = User(email="normal_read@example.com", password_hash=get_password_hash("normalPass1!"), role="user", is_active=True)
    session.add(normal_user)
    session.commit()
    
    login_response = client.post(
        "/api/v1/auth/access-token",
        data={"username": "normal_read@example.com", "password": "normalPass1!"}
    )
    token = login_response.json()["access_token"]
    
    # Attempt to list all users
    response = client.get(
        "/api/v1/users/",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 403
    assert "The user doesn't have enough privileges" in response.json()["detail"]
