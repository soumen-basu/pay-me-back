import logging
from sqlmodel import Session, select, func
from app.db.session import engine
from app.models.user import User, UserCreate
from app.core.security import get_password_hash
from app.core.config import settings

logger = logging.getLogger(__name__)

def init_db():
    with Session(engine) as session:
        # Check if the User table is completely empty
        user_count = session.exec(select(func.count()).select_from(User)).one()
        
        if user_count == 0:
            logger.info("Database is empty. Creating initial admin user...")
            
            email = settings.FIRST_SUPERUSER
            password = settings.FIRST_SUPERUSER_PASSWORD
            
            user_in = UserCreate(
                email=email,
                password=password,
                role="admin",
                is_active=True,
            )
            user = User.model_validate(
                user_in, 
                update={"password_hash": get_password_hash(user_in.password)}
            )
            session.add(user)
            session.commit()
            logger.info(f"Initial admin user '{email}' successfully created.")
        else:
            logger.info(f"Database contains {user_count} users. Skipping initial admin seeding.")

