import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session
from app.models.user import User
from app.models.expense import Expense
from app.models.claim import Claim
import uuid
from app.core.security import get_password_hash
from datetime import date

def create_test_user(session: Session, email: str = "submitter@example.com") -> User:
    user = session.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            password_hash=get_password_hash("password"),
            is_active=True
        )
        session.add(user)
        session.commit()
        session.refresh(user)
    return user

def create_test_expense(session: Session, owner_id: int) -> dict:
    expense = Expense(
        amount=100.0,
        description="Test Expense",
        date=date(2024, 1, 1),
        category_name="Travel",
        owner_id=owner_id,
        status="OPEN"
    )
    session.add(expense)
    session.commit()
    session.refresh(expense)
    return expense

def test_add_expenses_to_claim(client: TestClient, session: Session):
    submitter = create_test_user(session, "submitter@example.com")
    
    # login
    response = client.post(
        "/api/v1/auth/access-token",
        data={"username": "submitter@example.com", "password": "password"}
    )
    token = response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create claim
    claim_resp = client.post(
        "/api/v1/claims/",
        json={
            "title": "Test Claim",
            "description": "A claim for testing",
            "approver_emails": ["approver@example.com"]
        },
        headers=headers
    )
    assert claim_resp.status_code == 200
    claim_id = claim_resp.json()["id"]
    
    # Create expenses
    exp1 = create_test_expense(session, submitter.id)
    exp2 = create_test_expense(session, submitter.id)
    
    # Assign expenses to claim
    assign_resp = client.post(
        f"/api/v1/claims/{claim_id}/expenses",
        json={"expense_ids": [str(exp1.id), str(exp2.id)]},
        headers=headers
    )
    assert assign_resp.status_code == 200
    assert "attached 2 expenses" in assign_resp.json()["msg"]
    
    # Check DB
    session.refresh(exp1)
    assert str(exp1.claim_id) == str(claim_id)

def test_review_claim(client: TestClient, session: Session):
    approver = create_test_user(session, "approver@example.com")
    
    # Assume claim_id is created above, but we'll create a fresh one
    submitter = create_test_user(session, "submitter2@example.com")
    
    # Login submitter
    submitter_token = client.post(
        "/api/v1/auth/access-token",
        data={"username": "submitter2@example.com", "password": "password"}
    ).json().get("access_token")
    
    # Create claim
    claim_resp = client.post(
        "/api/v1/claims/",
        json={
            "title": "Review Claim",
            "approver_emails": ["approver@example.com"]
        },
        headers={"Authorization": f"Bearer {submitter_token}"}
    )
    claim_id = claim_resp.json()["id"]
    
    # Create expense and attach
    exp3 = create_test_expense(session, submitter.id)
    client.post(
        f"/api/v1/claims/{claim_id}/expenses",
        json={"expense_ids": [str(exp3.id)]},
        headers={"Authorization": f"Bearer {submitter_token}"}
    )
    
    # Login approver
    approver_token = client.post(
        "/api/v1/auth/access-token",
        data={"username": "approver@example.com", "password": "password"}
    ).json().get("access_token")
    
    # Review Claim
    review_resp = client.post(
        f"/api/v1/claims/{claim_id}/review",
        json={
            "expense_statuses": {str(exp3.id): "REJECTED"},
            "claim_status": "PARTIALLY_APPROVED",
            "comment": "Rejecting one item"
        },
        headers={"Authorization": f"Bearer {approver_token}"}
    )
    assert review_resp.status_code == 200
    
    # Verify DB
    session.refresh(exp3)
    assert exp3.status == "REJECTED"
    
    db_claim = session.get(Claim, uuid.UUID(claim_id))
    assert db_claim.status == "PARTIALLY_APPROVED"
