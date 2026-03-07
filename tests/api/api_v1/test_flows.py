import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session
from app.models.user import User
from app.core.security import get_password_hash
from sqlmodel import SQLModel, create_engine
from sqlmodel.pool import StaticPool
from app.main import app
import os
from app.api.deps import get_db
from app.core.config import settings

@pytest.fixture(scope="module", name="module_session")
def session_fixture():
    if os.environ.get("USE_POSTGRES_FOR_TESTS") == "true":
        database_url = f"postgresql+psycopg://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
        engine = create_engine(database_url)
    else:
        engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session

@pytest.fixture(scope="module", name="module_client")
def client_fixture(module_session: Session):
    def get_session_override():
        return module_session

    app.dependency_overrides[get_db] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()

# To enforce the sequence and share state across these tests without relying on alphabetical
# execution order, we use a module-scoped fixture. The tests are named sequentially and
# rely on modifying this shared state dictionary.
@pytest.fixture(scope="module")
def flow_state():
    return {}

def test_01_admin_login_count_users(module_client: TestClient, module_session: Session, flow_state: dict):
    # Ensure default admin exists
    admin = module_session.query(User).filter(User.email == "admin@example.com").first()
    if not admin:
        admin = User(
            email="admin@example.com",
            password_hash=get_password_hash("spinner"),
            role="admin",
            is_active=True
        )
        module_session.add(admin)
        module_session.commit()
        module_session.refresh(admin)

    # Login as default admin
    response = module_client.post(
        "/api/v1/auth/access-token",
        data={"username": "admin@example.com", "password": "spinner"}
    )
    assert response.status_code == 200, "Admin login failed"
    token = response.json()["access_token"]
    flow_state["admin_token"] = token

    # Verify user is admin (by fetching /me)
    response_me = module_client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response_me.status_code == 200
    assert response_me.json()["role"] == "admin"

    # Fetch list of current users and store the count and list
    response_users = module_client.get("/api/v1/users", headers={"Authorization": f"Bearer {token}"})
    assert response_users.status_code == 200
    users_list = response_users.json()
    flow_state["initial_user_count"] = len(users_list)
    flow_state["initial_users_list"] = users_list

def test_02_other_admin_verify_users(module_client: TestClient, module_session: Session, flow_state: dict):
    # For this test, we log in as the same admin (admin@example.com) per the strategy document snippet,
    # or another admin if one existed. The strategy said "Then login as admin@example.com/spinner".
    response = module_client.post(
        "/api/v1/auth/access-token",
        data={"username": "admin@example.com", "password": "spinner"}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]

    # Verify user is admin
    response_me = module_client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response_me.status_code == 200
    assert response_me.json()["role"] == "admin"

    # Fetch users and confirm identical to previous call
    response_users = module_client.get("/api/v1/users", headers={"Authorization": f"Bearer {token}"})
    assert response_users.status_code == 200
    current_users = response_users.json()
    
    assert len(current_users) == flow_state["initial_user_count"]
    # Compare basic identifiers to ensure it's the same list
    initial_ids = {u["id"] for u in flow_state["initial_users_list"]}
    current_ids = {u["id"] for u in current_users}
    assert initial_ids == current_ids

def test_03_verify_no_random_users(module_client: TestClient, module_session: Session, flow_state: dict):
    # Generate 3 random email IDs
    random_emails = ["random1@example.com", "random2@example.com", "random3@example.com"]
    
    # Use the previous list of users to check non-existence of these emails
    initial_emails = {u["email"] for u in flow_state["initial_users_list"]}
    for email in random_emails:
        assert email not in initial_emails, f"Random email {email} surprisingly exists in initial user list"

    # Also query the DB/API to ensure they don't exist
    for email in random_emails:
        # Since we are an admin, we can check if they exist by fetching all and filtering, or checking DB
        user_in_db = module_session.query(User).filter(User.email == email).first()
        assert user_in_db is None, f"User {email} should not exist in DB"

def test_04_create_test1_as_admin_with_password(module_client: TestClient, module_session: Session, flow_state: dict):
    admin_token = flow_state["admin_token"]
    
    # Create user Test1 as admin
    new_user_data = {
        "email": "test1@example.com",
        "password": "A$4ptation",
        "role": "admin",
        "display_name": "Test1"
    }
    create_resp = module_client.post(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=new_user_data
    )
    # The API might just create standard users via endpoint or allow role if admin. 
    # Assuming the API allows setting role if created by admin
    assert create_resp.status_code == 200, f"Failed to create Test1: {create_resp.text}"

    # Login as Test1
    login_resp = module_client.post(
        "/api/v1/auth/access-token",
        data={"username": "test1@example.com", "password": "A$4ptation"}
    )
    assert login_resp.status_code == 200
    test1_token = login_resp.json()["access_token"]

    # Verify Test1 is admin
    me_resp = module_client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {test1_token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["role"] == "admin"

    # Verify user count increased by 1
    users_resp = module_client.get("/api/v1/users", headers={"Authorization": f"Bearer {test1_token}"})
    assert users_resp.status_code == 200
    assert len(users_resp.json()) == flow_state["initial_user_count"] + 1

    # Update Test1 display name
    update_resp = module_client.patch(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {test1_token}"},
        json={"display_name": "Test1 Verified"}
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["display_name"] == "Test1 Verified"

    # Update state for next tests
    flow_state["current_user_count"] = flow_state["initial_user_count"] + 1

def test_05_create_test2_as_user_with_password(module_client: TestClient, module_session: Session, flow_state: dict):
    admin_token = flow_state["admin_token"]
    
    # Create Test2 as a User
    new_user_data = {
        "email": "test2@example.com",
        "password": "A$4ptation",
        "role": "user",
        "display_name": "Test2"
    }
    create_resp = module_client.post(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=new_user_data
    )
    assert create_resp.status_code == 200, f"Failed to create Test2: {create_resp.text}"

    # Login as Test2
    login_resp = module_client.post(
        "/api/v1/auth/access-token",
        data={"username": "test2@example.com", "password": "A$4ptation"}
    )
    assert login_resp.status_code == 200
    test2_token = login_resp.json()["access_token"]

    # Validate /me
    me_resp = module_client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {test2_token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "test2@example.com"
    assert me_resp.json()["role"] == "user"

    # Update Test2 display name
    update_resp = module_client.patch(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {test2_token}"},
        json={"display_name": "Test2 Verified"}
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["display_name"] == "Test2 Verified"

    flow_state["current_user_count"] += 1

def test_06_create_test3_as_user_via_magic_link(module_client: TestClient, module_session: Session, flow_state: dict):
    # Do NOT use admin to create Test3. Request a magic link.
    magic_req = module_client.post(
        "/api/v1/auth/magic-link",
        json={"email": "test3@example.com"}
    )
    assert magic_req.status_code == 200

    # Retrieve the token from the DB since we are testing and need it to verify
    test3_db = module_session.query(User).filter(User.email == "test3@example.com").first()
    assert test3_db is not None
    assert test3_db.magic_token is not None
    magic_token = test3_db.magic_token

    # Verify magic link
    verify_resp = module_client.get(f"/api/v1/auth/verify?email=test3@example.com&token={magic_token}")
    assert verify_resp.status_code == 200
    test3_token = verify_resp.json()["access_token"]

    # Fetch user details and validate
    me_resp = module_client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {test3_token}"})
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == "test3@example.com"

    # Update display name and password
    update_resp = module_client.patch(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {test3_token}"},
        json={"display_name": "Test 3 Validated", "password": "A$4ptation"}
    )
    assert update_resp.status_code == 200
    updated_data = update_resp.json()
    assert updated_data["display_name"] == "Test 3 Validated"
    assert updated_data["has_password"] is True
