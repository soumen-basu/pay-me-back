import datetime
from fastapi.testclient import TestClient
from sqlmodel import Session
from app.models.user import User
from app.core.security import get_password_hash

def test_request_magic_link(client: TestClient, session: Session):
    response = client.post(
        "/api/v1/auth/magic-link",
        json={"email": "test@example.com"}
    )
    assert response.status_code == 200
    assert response.json() == {"msg": "If the email is valid, a magic link has been sent."}
    
    user = session.query(User).filter(User.email == "test@example.com").first()
    assert user is not None
    assert user.magic_token is not None
    assert user.magic_token_expires_at is not None

def test_verify_magic_link_valid(client: TestClient, session: Session):
    client.post(
        "/api/v1/auth/magic-link",
        json={"email": "valid@example.com"}
    )
    user = session.query(User).filter(User.email == "valid@example.com").first()
    token = user.magic_token
    
    response = client.get(
        f"/api/v1/auth/verify?email=valid@example.com&token={token}"
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    
    session.refresh(user)
    assert user.magic_token is None

def test_verify_magic_link_invalid(client: TestClient, session: Session):
    response = client.get(
        "/api/v1/auth/verify?email=invalid@example.com&token=badtoken"
    )
    assert response.status_code == 401
    
    future_time = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)
    user = User(email="user@example.com", magic_token="goodtoken", magic_token_expires_at=future_time, is_active=True)
    session.add(user)
    session.commit()
    
    response2 = client.get(
        "/api/v1/auth/verify?email=user@example.com&token=badtoken"
    )
    assert response2.status_code == 401

def test_pending_magic_links_admin(client: TestClient, session: Session):
    admin = User(email="admin@example.com", password_hash=get_password_hash("testPass"), role="admin", is_active=True)
    session.add(admin)
    
    future_time = datetime.datetime.utcnow() + datetime.timedelta(days=1)
    pending_user = User(email="pending@example.com", magic_token="token123", magic_token_expires_at=future_time, is_active=True)
    session.add(pending_user)
    session.commit()
    
    login_response = client.post(
        "/api/v1/auth/access-token",
        data={"username": "admin@example.com", "password": "testPass"}
    )
    assert login_response.status_code == 200
    admin_token = login_response.json()["access_token"]
    
    response = client.get(
        "/api/v1/users/pending-magic-links",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["email"] == "pending@example.com"
    assert data[0]["magic_token"] == "token123"
    assert "magic_token_expires_at" in data[0]

def test_request_magic_link_rate_limit(client: TestClient, session: Session):
    email = "ratelimit@example.com"
    # Send 5 requests (allowed)
    for _ in range(5):
        response = client.post("/api/v1/auth/magic-link", json={"email": email})
        assert response.status_code == 200

    # 6th request should fail with 429
    response = client.post("/api/v1/auth/magic-link", json={"email": email})
    assert response.status_code == 429
    assert response.json()["detail"] == "User daily email limit reached."

def test_password_login_random_user(client: TestClient, session: Session):
    random_email = "randomuser@example.com"
    password = "RandomTestPassword1!"
    user = User(
        email=random_email, 
        password_hash=get_password_hash(password), 
        is_active=True
    )
    session.add(user)
    session.commit()
    
    response = client.post(
        "/api/v1/auth/access-token",
        data={"username": random_email, "password": password}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
