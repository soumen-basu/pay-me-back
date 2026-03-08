import os
import sys
import getpass

# Force DB_HOST to localhost if running outside docker and not explicitly set
if not os.path.exists('/.dockerenv'):
    os.environ.setdefault('DB_HOST', 'localhost')

# Add the project root strictly to pythonpath
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlmodel import Session, select
from app.db.session import engine, init_db
from app.models.user import User
from app.core.security import get_password_hash, validate_password_complexity

def main():
    print("=== Create Admin User ===")
    
    email = input("Email: ").strip()
    if not email:
        print("Error: Email is required.")
        sys.exit(1)
        
    display_name = input("Display Name (optional): ").strip()
    if not display_name:
        display_name = None
        
    while True:
        password = getpass.getpass("Password: ")
        if not password:
            print("Error: Password is required.")
            continue
            
        if not validate_password_complexity(password):
            print("Error: Password must be 8-32 characters and contain at least one lowercase letter, one uppercase letter, one digit, and one special character.")
            continue
            
        confirm_password = getpass.getpass("Confirm Password: ")
        if password != confirm_password:
            print("Error: Passwords do not match. Try again.")
            continue
            
        break
        
    # Ensure DB tables exist
    init_db()

    with Session(engine) as session:
        # Check if user already exists
        existing_user = session.exec(select(User).where(User.email == email)).first()
        if existing_user:
            print(f"Error: A user with email '{email}' already exists.")
            sys.exit(1)
            
        new_user = User(
            email=email,
            display_name=display_name,
            password_hash=get_password_hash(password),
            role="admin",
            is_active=True
        )
        
        try:
            session.add(new_user)
            session.commit()
            print(f"\nSuccess! Admin user '{email}' created successfully.")
        except Exception as e:
            session.rollback()
            print(f"\nError: Failed to create user. Details: {e}")
            sys.exit(1)

if __name__ == "__main__":
    main()
