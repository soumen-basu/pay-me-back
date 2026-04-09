import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session
from app.models.user import User
from app.models.expense import Expense
from app.models.claim import Claim
from app.core.security import get_password_hash
from datetime import date
from sqlmodel import select

def create_test_user(session: Session, email: str = "tiered_user@example.com", tier: str = "FREE") -> User:
    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        user = User(
            email=email,
            password_hash=get_password_hash("password"),
            is_active=True,
            tier=tier
        )
        session.add(user)
        session.commit()
        session.refresh(user)
    else:
        user.tier = tier
        session.add(user)
        session.commit()
        session.refresh(user)
    return user

def create_test_expense(session: Session, owner_id: int, currency: str = "USD") -> Expense:
    expense = Expense(
        amount=100.0,
        description="Test Expense",
        date=date.today(),
        category_name="Travel",
        currency_code=currency,
        owner_id=owner_id,
        status="OPEN"
    )
    session.add(expense)
    session.commit()
    session.refresh(expense)
    return expense

def test_expense_quota_enforcement(client: TestClient, session: Session):
    # Setup test FREE user
    user = create_test_user(session, "free_quota_exceed@example.com", "FREE")
    
    # Login
    token = client.post(
        "/api/v1/auth/access-token",
        data={"username": "free_quota_exceed@example.com", "password": "password"}
    ).json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # FREE tier allows 300 expenses per month according to tiers.json.
    # To test this quickly without inserting 300 records, we can mock the TierService
    # or just temporarily create an ad-hoc tier limit.
    # Let's mock TierService.get_user_tiers_summary
    from app.services.tier_service import TierService
    original_get_user_tiers_summary = TierService.get_user_tiers_summary
    
    def mocked_get_user_tiers_summary(db, u):
        summary = original_get_user_tiers_summary(db, u)
        # Mock limit to 1
        summary["quotas"]["max_expenses_per_month"]["limit"] = 1
        return summary
        
    try:
        TierService.get_user_tiers_summary = mocked_get_user_tiers_summary
        
        # 1st Expense should pass
        resp1 = client.post(
            "/api/v1/expenses/",
            json={"amount": 50, "description": "Exp 1", "date": "2024-01-01", "category_name": "Test", "currency_code": "USD"},
            headers=headers
        )
        assert resp1.status_code == 200
        
        # 2nd Expense should fail
        resp2 = client.post(
            "/api/v1/expenses/",
            json={"amount": 50, "description": "Exp 2", "date": "2024-01-01", "category_name": "Test", "currency_code": "USD"},
            headers=headers
        )
        assert resp2.status_code == 403
        assert "Monthly expense limit reached" in resp2.json()["detail"]
        
    finally:
        TierService.get_user_tiers_summary = original_get_user_tiers_summary


def test_multi_currency_claim_restriction(client: TestClient, session: Session):
    # Setup test FREE user
    user = create_test_user(session, "free_multicurrency@example.com", "FREE")
    
    # Login
    token = client.post(
        "/api/v1/auth/access-token",
        data={"username": "free_multicurrency@example.com", "password": "password"}
    ).json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create two expenses with different currencies
    exp_usd = create_test_expense(session, user.id, "USD")
    exp_eur = create_test_expense(session, user.id, "EUR")
    
    # Create claim
    claim_resp = client.post(
        "/api/v1/claims/",
        json={"title": "Mixed Currency Claim"},
        headers=headers
    )
    assert claim_resp.status_code == 200
    claim_id = claim_resp.json()["id"]
    
    # Attempt to add mixed currency expenses
    assign_resp = client.post(
        f"/api/v1/claims/{claim_id}/expenses",
        json={"expense_ids": [str(exp_usd.id), str(exp_eur.id)]},
        headers=headers
    )
    # the backend catches this and throws a 400
    assert assign_resp.status_code == 400
    assert "does not support multi-currency claims" in assign_resp.json()["detail"]


def test_multi_currency_claim_pro_tier(client: TestClient, session: Session):
    # Setup test PRO user
    user = create_test_user(session, "pro_multicurrency@example.com", "PRO")
    
    # Login
    token = client.post(
        "/api/v1/auth/access-token",
        data={"username": "pro_multicurrency@example.com", "password": "password"}
    ).json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create two expenses with different currencies
    exp_usd = create_test_expense(session, user.id, "USD")
    exp_eur = create_test_expense(session, user.id, "EUR")
    
    # Create claim
    claim_resp = client.post(
        "/api/v1/claims/",
        json={"title": "Mixed Currency Claim PRO"},
        headers=headers
    )
    assert claim_resp.status_code == 200
    claim_id = claim_resp.json()["id"]
    
    # Attempt to add mixed currency expenses
    assign_resp = client.post(
        f"/api/v1/claims/{claim_id}/expenses",
        json={"expense_ids": [str(exp_usd.id), str(exp_eur.id)]},
        headers=headers
    )
    
    # Should succeed for PRO tier
    assert assign_resp.status_code == 200
