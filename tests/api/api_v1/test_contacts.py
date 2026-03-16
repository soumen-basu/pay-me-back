import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.user import User, UserContact
from app.core.security import get_password_hash


def _create_user_and_login(
    client: TestClient, session: Session, email: str, password: str = "TestPass1!"
) -> tuple[User, str]:
    """Helper: insert a user into the DB, log in, return (user, token)."""
    user = User(
        email=email,
        password_hash=get_password_hash(password),
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    login_resp = client.post(
        "/api/v1/auth/access-token",
        data={"username": email, "password": password},
    )
    assert login_resp.status_code == 200
    token: str = login_resp.json()["access_token"]
    return user, token


# ────────────────────────── list contacts ──────────────────────────

def test_list_contacts_empty(client: TestClient, session: Session) -> None:
    """Authenticated user with no contacts → returns []."""
    _, token = _create_user_and_login(client, session, "contacts_empty@example.com")
    resp = client.get(
        "/api/v1/users/me/contacts",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json() == []


# ────────────────────────── add contact ────────────────────────────

def test_add_contact(client: TestClient, session: Session) -> None:
    """POST a contact → 201, verify returned email + label."""
    _, token = _create_user_and_login(client, session, "contacts_add@example.com")
    resp = client.post(
        "/api/v1/users/me/contacts",
        headers={"Authorization": f"Bearer {token}"},
        json={"contact_email": "friend@example.com", "label": "My Friend"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["contact_email"] == "friend@example.com"
    assert data["label"] == "My Friend"
    assert "id" in data


def test_add_duplicate_contact(client: TestClient, session: Session) -> None:
    """POST same email twice → 409."""
    _, token = _create_user_and_login(client, session, "contacts_dup@example.com")
    payload = {"contact_email": "dup@example.com"}
    resp1 = client.post(
        "/api/v1/users/me/contacts",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    assert resp1.status_code == 201

    resp2 = client.post(
        "/api/v1/users/me/contacts",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    assert resp2.status_code == 409


# ────────────────────────── delete contact ─────────────────────────

def test_delete_contact(client: TestClient, session: Session) -> None:
    """POST then DELETE → 200, list returns []."""
    _, token = _create_user_and_login(client, session, "contacts_del@example.com")
    create_resp = client.post(
        "/api/v1/users/me/contacts",
        headers={"Authorization": f"Bearer {token}"},
        json={"contact_email": "todelete@example.com"},
    )
    assert create_resp.status_code == 201
    contact_id = create_resp.json()["id"]

    del_resp = client.delete(
        f"/api/v1/users/me/contacts/{contact_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_resp.status_code == 200

    list_resp = client.get(
        "/api/v1/users/me/contacts",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_resp.json() == []


def test_delete_nonexistent_contact(client: TestClient, session: Session) -> None:
    """DELETE unknown id → 404."""
    _, token = _create_user_and_login(client, session, "contacts_404@example.com")
    resp = client.delete(
        "/api/v1/users/me/contacts/99999",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 404


# ────────────────────────── isolation ──────────────────────────────

def test_contacts_isolation(client: TestClient, session: Session) -> None:
    """User A's contacts are not visible to User B."""
    _, token_a = _create_user_and_login(client, session, "iso_a@example.com")
    _, token_b = _create_user_and_login(client, session, "iso_b@example.com")

    # User A adds a contact
    client.post(
        "/api/v1/users/me/contacts",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"contact_email": "private@example.com"},
    )

    # User B should see empty list
    resp = client.get(
        "/api/v1/users/me/contacts",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert resp.status_code == 200
    assert resp.json() == []


# ────────────────────────── admin view ─────────────────────────────

def test_admin_view_user_contacts(client: TestClient, session: Session) -> None:
    """Admin can GET another user's contacts."""
    # Create a normal user with a contact
    user, user_token = _create_user_and_login(client, session, "admin_view_target@example.com")
    client.post(
        "/api/v1/users/me/contacts",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"contact_email": "approver@example.com", "label": "Approver"},
    )

    # Create admin
    admin = User(
        email="admin_contacts_test@example.com",
        password_hash=get_password_hash("AdminPass1!"),
        role="admin",
        is_active=True,
    )
    session.add(admin)
    session.commit()
    login_resp = client.post(
        "/api/v1/auth/access-token",
        data={"username": "admin_contacts_test@example.com", "password": "AdminPass1!"},
    )
    admin_token = login_resp.json()["access_token"]

    # Admin views the user's contacts
    resp = client.get(
        f"/api/v1/admin/users/{user.id}/contacts",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    contacts = resp.json()
    assert len(contacts) == 1
    assert contacts[0]["contact_email"] == "approver@example.com"
    assert contacts[0]["label"] == "Approver"
