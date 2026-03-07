from sqlmodel import Session, select
from app.db.session import engine
from app.models.user import User, UserCreate
from app.core.security import get_password_hash

def init_db():
    with Session(engine) as session:
        for email in ["admin", "admin@smplfd.in"]:
            user = session.exec(select(User).where(User.email == email)).first()
            if not user:
                user_in = UserCreate(
                    email=email,
                    password="spinner",
                    role="admin",
                    is_active=True,
                )
                user = User.model_validate(user_in, update={"password_hash": get_password_hash(user_in.password)})
                session.add(user)
                session.commit()
                print(f"Default admin user {email} created")
            else:
                print(f"Default admin user {email} already exists")

