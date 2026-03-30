"""
Tests for multi-currency support.

Covers:
  1. Currency list endpoint
  2. Currency validation on user and expense models
  3. Expense description autocomplete endpoint
  4. Currency change guard on claimed expenses
"""

import datetime
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.user import User
from app.models.expense import Expense
from app.models.claim import Claim
from app.core.security import get_password_hash


# ── Fixtures ──

@pytest.fixture
def auth_headers(client: TestClient, session: Session):
    """Create a test user and return auth headers."""
    pw = get_password_hash("Currency1!")
    user = User(email="currency_test@example.com", password_hash=pw, is_active=True)
    session.add(user)
    session.commit()

    resp = client.post(
        "/api/v1/auth/access-token",
        data={"username": "currency_test@example.com", "password": "Currency1!"},
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ── 1. Currency list endpoint ──

def test_list_currencies(client: TestClient, auth_headers):
    """GET /api/v1/currencies/ returns the curated currency list."""
    resp = client.get("/api/v1/currencies/")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 15  # we ship ~18

    # Spot-check INR and USD
    codes = {c["code"] for c in data}
    assert "INR" in codes
    assert "USD" in codes

    # Check structure of one entry
    inr = next(c for c in data if c["code"] == "INR")
    assert inr["symbol"] == "₹"
    assert inr["name"] == "Indian Rupee"
    assert inr["decimals"] == 2


# ── 2. Currency validation ──

def test_user_update_with_valid_currency(client: TestClient, auth_headers):
    """Users can update preferred_currency to a valid ISO code."""
    resp = client.patch("/api/v1/users/me", headers=auth_headers, json={"preferred_currency": "EUR"})
    assert resp.status_code == 200
    assert resp.json()["preferred_currency"] == "EUR"


def test_user_update_with_invalid_currency(client: TestClient, auth_headers):
    """Users cannot update preferred_currency to an invalid code."""
    resp = client.patch("/api/v1/users/me", headers=auth_headers, json={"preferred_currency": "INVALID"})
    assert resp.status_code == 422  # Pydantic validation error


def test_create_expense_with_currency(client: TestClient, session: Session, auth_headers):
    """Expenses can be created with a valid currency_code."""
    resp = client.post(
        "/api/v1/expenses/",
        headers=auth_headers,
        json={
            "amount": 99.99,
            "description": "USD Test Expense",
            "date": str(datetime.date.today()),
            "category_name": "Travel",
            "currency_code": "USD",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["currency_code"] == "USD"


def test_create_expense_default_currency(client: TestClient, auth_headers):
    """Expenses default to INR if no currency_code provided."""
    resp = client.post(
        "/api/v1/expenses/",
        headers=auth_headers,
        json={
            "amount": 50.00,
            "description": "Default Currency Expense",
            "date": str(datetime.date.today()),
            "category_name": "Food",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["currency_code"] == "INR"


def test_create_expense_invalid_currency(client: TestClient, auth_headers):
    """Expenses with invalid currency_code are rejected."""
    resp = client.post(
        "/api/v1/expenses/",
        headers=auth_headers,
        json={
            "amount": 10.0,
            "description": "Bad Currency",
            "date": str(datetime.date.today()),
            "category_name": "Other",
            "currency_code": "ZZZ",
        },
    )
    assert resp.status_code == 422


# ── 3. Expense description autocomplete ──

def test_expense_descriptions(client: TestClient, auth_headers):
    """GET /api/v1/expenses/descriptions returns distinct past descriptions."""
    # Create two expenses with the same description and one different
    for desc in ["Lunch Meeting", "Office Supplies", "Lunch Meeting"]:
        client.post(
            "/api/v1/expenses/",
            headers=auth_headers,
            json={
                "amount": 20.00,
                "description": desc,
                "date": str(datetime.date.today()),
                "category_name": "Other",
            },
        )

    resp = client.get("/api/v1/expenses/descriptions", headers=auth_headers)
    assert resp.status_code == 200
    descs = resp.json()
    assert isinstance(descs, list)
    # Should contain both unique descriptions (may also have others from earlier tests)
    assert "Lunch Meeting" in descs
    assert "Office Supplies" in descs
    # "Lunch Meeting" should appear only once (distinct)
    assert descs.count("Lunch Meeting") == 1


# ── 4. Currency change guard on claimed expenses ──

def test_cannot_change_currency_on_claimed_expense(client: TestClient, session: Session, auth_headers):
    """Expenses attached to a claim cannot have their currency changed."""
    # Create an expense
    exp_resp = client.post(
        "/api/v1/expenses/",
        headers=auth_headers,
        json={
            "amount": 100.00,
            "description": "Claimed Expense",
            "date": str(datetime.date.today()),
            "category_name": "Travel",
            "currency_code": "INR",
        },
    )
    assert exp_resp.status_code == 200
    expense_id = exp_resp.json()["id"]

    # Create a claim and attach the expense
    claim_resp = client.post(
        "/api/v1/claims/",
        headers=auth_headers,
        json={"title": "Test Claim"},
    )
    assert claim_resp.status_code == 200
    claim_id = claim_resp.json()["id"]

    attach_resp = client.post(
        f"/api/v1/claims/{claim_id}/expenses",
        headers=auth_headers,
        json={"expense_ids": [expense_id]},
    )
    assert attach_resp.status_code == 200

    # Now try to change the currency — should fail
    update_resp = client.patch(
        f"/api/v1/expenses/{expense_id}",
        headers=auth_headers,
        json={"currency_code": "USD"},
    )
    assert update_resp.status_code == 400
    assert "claim" in update_resp.json()["detail"].lower()


def test_can_change_currency_on_unclaimed_expense(client: TestClient, auth_headers):
    """Expenses NOT attached to a claim can have their currency changed."""
    exp_resp = client.post(
        "/api/v1/expenses/",
        headers=auth_headers,
        json={
            "amount": 50.00,
            "description": "Free Expense",
            "date": str(datetime.date.today()),
            "category_name": "Other",
            "currency_code": "INR",
        },
    )
    assert exp_resp.status_code == 200
    expense_id = exp_resp.json()["id"]

    update_resp = client.patch(
        f"/api/v1/expenses/{expense_id}",
        headers=auth_headers,
        json={"currency_code": "GBP"},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["currency_code"] == "GBP"
