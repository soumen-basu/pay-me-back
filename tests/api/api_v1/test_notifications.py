import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User

@pytest.fixture
def superuser_token_headers(client: TestClient, session: Session) -> dict:
    # Ensure default admin exists
    admin_email = "admin_notif@example.com"
    admin = session.query(User).filter(User.email == admin_email).first()
    if not admin:
        admin = User(
            email=admin_email,
            password_hash=get_password_hash("spinner"),
            role="admin",
            is_active=True
        )
        session.add(admin)
        session.commit()
    
    r = client.post(
        f"{settings.API_V1_STR}/auth/access-token", 
        data={"username": admin_email, "password": "spinner"}
    )
    tokens = r.json()
    a_token = tokens["access_token"]
    return {"Authorization": f"Bearer {a_token}"}

@pytest.fixture
def normal_user_token_headers(client: TestClient, session: Session) -> dict:
    user_email = "user_notif@example.com"
    user = session.query(User).filter(User.email == user_email).first()
    if not user:
        user = User(
            email=user_email,
            password_hash=get_password_hash("spinner"),
            role="user",
            is_active=True
        )
        session.add(user)
        session.commit()
    
    r = client.post(
        f"{settings.API_V1_STR}/auth/access-token", 
        data={"username": user_email, "password": "spinner"}
    )
    tokens = r.json()
    a_token = tokens["access_token"]
    return {"Authorization": f"Bearer {a_token}"}

def test_admin_create_broadcast_notification(
    client: TestClient, superuser_token_headers: dict, session: Session
) -> None:
    data = {
        "title": "System Maintenance",
        "content": "The system will be down for 5 minutes."
    }
    r = client.post(
        f"{settings.API_V1_STR}/notifications/sys/broadcast", 
        headers=superuser_token_headers,
        params=data
    )
    assert r.status_code == 200
    response_data = r.json()
    assert "msg" in response_data
    assert response_data["count"] > 0
    assert response_data["msg"] == "Broadcast sent successfully"

def test_admin_create_targeted_notification(
    client: TestClient, superuser_token_headers: dict, session: Session, normal_user_token_headers: dict
) -> None:
    # First get the normal user's details to get their ID
    r = client.get(
        f"{settings.API_V1_STR}/users/me", headers=normal_user_token_headers
    )
    user_id = r.json()["id"]
    
    data = {
        "title": "Welcome bonus",
        "content": "You have received 500 points."
    }
    
    r = client.post(
        f"{settings.API_V1_STR}/notifications/sys/target/{user_id}",
        headers=superuser_token_headers,
        params=data
    )
    assert r.status_code == 200
    notification = r.json()
    assert notification["user_id"] == user_id
    assert notification["title"] == data["title"]

def test_read_notifications(
    client: TestClient, normal_user_token_headers: dict, superuser_token_headers: dict, session: Session
) -> None:
    # Get user id
    r = client.get(f"{settings.API_V1_STR}/users/me", headers=normal_user_token_headers)
    user_id = r.json()["id"]
    
    # Create a notification for them
    data = {"title": "Test Notification", "content": "Test content"}
    client.post(
        f"{settings.API_V1_STR}/notifications/sys/target/{user_id}",
        headers=superuser_token_headers,
        params=data
    )
    
    # Read as normal user
    r = client.get(
        f"{settings.API_V1_STR}/notifications/", headers=normal_user_token_headers
    )
    assert r.status_code == 200
    notifications = r.json()
    assert len(notifications) >= 1
    assert notifications[0]["is_read"] == False

def test_mark_notification_read(
    client: TestClient, normal_user_token_headers: dict, superuser_token_headers: dict, session: Session
) -> None:
    r = client.get(f"{settings.API_V1_STR}/users/me", headers=normal_user_token_headers)
    user_id = r.json()["id"]
    
    data = {"title": "Read Me", "content": "Test content"}
    r = client.post(
        f"{settings.API_V1_STR}/notifications/sys/target/{user_id}",
        headers=superuser_token_headers,
        params=data
    )
    created_notif = r.json()
    notif_id = created_notif["id"]
    
    # Mark as read
    r = client.patch(
        f"{settings.API_V1_STR}/notifications/{notif_id}/read",
        headers=normal_user_token_headers
    )
    assert r.status_code == 200
    updated_notif = r.json()
    assert updated_notif["is_read"] == True

def test_delete_notification(
    client: TestClient, normal_user_token_headers: dict, superuser_token_headers: dict, session: Session
) -> None:
    r = client.get(f"{settings.API_V1_STR}/users/me", headers=normal_user_token_headers)
    user_id = r.json()["id"]
    
    data = {"title": "Delete Me", "content": "Test content"}
    r = client.post(
        f"{settings.API_V1_STR}/notifications/sys/target/{user_id}",
        headers=superuser_token_headers,
        params=data
    )
    created_notif = r.json()
    notif_id = created_notif["id"]
    
    # Delete
    r = client.delete(
        f"{settings.API_V1_STR}/notifications/{notif_id}",
        headers=normal_user_token_headers
    )
    assert r.status_code == 200
    
    # Verify it's gone
    r = client.get(
        f"{settings.API_V1_STR}/notifications/", headers=normal_user_token_headers
    )
    notifications = r.json()
    for notif in notifications:
        assert notif["id"] != notif_id

def test_notification_pruning(
    client: TestClient, normal_user_token_headers: dict, superuser_token_headers: dict, session: Session
) -> None:
    r = client.get(f"{settings.API_V1_STR}/users/me", headers=normal_user_token_headers)
    user_id = r.json()["id"]
    
    # We set limits in core/config.py, let's artificially lower the threshold for this test
    # by modifying the settings directly before the spam.
    original_threshold = settings.NOTIFICATION_AUTO_DELETE_THRESHOLD
    original_amount = settings.NOTIFICATION_AUTO_DELETE_AMOUNT
    
    # Temporarily override settings
    settings.NOTIFICATION_AUTO_DELETE_THRESHOLD = 5
    settings.NOTIFICATION_AUTO_DELETE_AMOUNT = 3
    
    try:
        # Spam 6 notifications (threshold is 5)
        for i in range(6):
            data = {"title": f"Spam {i}", "content": "Spam"}
            client.post(
                f"{settings.API_V1_STR}/notifications/sys/target/{user_id}",
                headers=superuser_token_headers,
                params=data
            )
            
        # The 6th insertion should trigger pruning (count goes from 5 -> 6, which is > 5)
        # Pruning drops the oldest 3. So we should end up with 3 remaining overall.
        r = client.get(
            f"{settings.API_V1_STR}/notifications/", headers=normal_user_token_headers
        )
        notifications = r.json()
        assert len(notifications) <= settings.NOTIFICATION_AUTO_DELETE_THRESHOLD
        
    finally:
        # Restore original settings
        settings.NOTIFICATION_AUTO_DELETE_THRESHOLD = original_threshold
        settings.NOTIFICATION_AUTO_DELETE_AMOUNT = original_amount
