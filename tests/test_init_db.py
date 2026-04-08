import pytest
from unittest.mock import patch
from sqlmodel import Session, select, func
from app.models.user import User
from app.db.init_db import init_db
from app.core.config import settings

def test_init_db_creates_superuser_when_empty(session: Session):
    # Patch the engine used in init_db to use our test DB engine
    with patch("app.db.init_db.engine", session.bind):
        # Initial run should create the user
        init_db()
        users = session.exec(select(User)).all()
        assert len(users) == 1
        
        user = users[0]
        assert user.email == settings.FIRST_SUPERUSER
        assert user.role == "admin"
        assert user.is_active is True
        assert user.password_hash is not None
            
def test_init_db_skips_when_not_empty(session: Session):
    # Add a user first
    user = User(email="existing@test.com", password_hash="dummy")
    session.add(user)
    session.commit()
    
    # Patch the engine used in init_db to use our test DB engine
    with patch("app.db.init_db.engine", session.bind):
        # Should not create the superuser
        init_db()
        user_count = session.exec(select(func.count()).select_from(User)).one()
        assert user_count == 1
        
        # Verify settings.FIRST_SUPERUSER was NOT added
        admin = session.exec(select(User).where(User.email == settings.FIRST_SUPERUSER)).first()
        assert admin is None
