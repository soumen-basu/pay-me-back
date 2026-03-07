import pytest
from unittest.mock import patch
from sqlmodel import Session, select
from app.models.user import User
from app.db.init_db import init_db

def test_init_db_creates_default_admins(session: Session):
    # Patch the engine used in init_db to use our test DB engine
    with patch("app.db.init_db.engine", session.bind):
        # Initial run should create the users
        init_db()
        users = session.exec(select(User).where(User.email.in_(["admin", "admin@smplfd.in"]))).all()
        assert len(users) == 2
        
        for user in users:
            assert user.role == "admin"
            assert user.is_active is True
            assert user.password_hash is not None
            
        # Running again should not create new users or throw errors
        init_db()
        users_after = session.exec(select(User).where(User.email.in_(["admin", "admin@smplfd.in"]))).all()
        assert len(users_after) == 2
