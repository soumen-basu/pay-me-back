import os
import sys
import getpass
from dotenv import load_dotenv

# Ensure the environment variables are read from a required passed .env file
if len(sys.argv) < 2:
    print("Error: Required environment file path not provided.")
    print("Usage: python reset_users.py <path_to_env_file>")
    sys.exit(1)

env_file = os.path.abspath(sys.argv[1])
if not os.path.exists(env_file):
    print(f"Error: Required environment file '{env_file}' not found.")
    sys.exit(1)

# Load the environment variables explicitly
load_dotenv(env_file)

# Force DB_HOST to localhost if running outside docker and not explicitly set
if not os.path.exists('/.dockerenv'):
    os.environ['DB_HOST'] = 'localhost'

# Add the project root strictly to pythonpath
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlmodel import Session, select, delete
from app.db.session import engine, init_db
from app.models.user import User, Session as DBSession, UserActivity
from app.core.security import get_password_hash

def main():
    print("=== Reset Users to Default Admins ===")
    print("WARNING: This will DELETE all existing users, sessions, and user activities from the database.")
    
    confirmation = input("Type 'confirm reset' to proceed: ").strip()
    if confirmation != 'confirm reset':
        print("Reset aborted.")
        sys.exit(0)
        
    print("Connecting to database and resetting users...")
    
    # Ensure DB tables exist
    init_db()

    with Session(engine) as session:
        try:
            # Delete dependent tables first
            session.exec(delete(UserActivity))
            session.exec(delete(DBSession))
            # Delete all users
            session.exec(delete(User))
            
            # Create default admins
            admin_pwd_hash = get_password_hash("spinner")
            
            admin1 = User(
                email="admin",
                display_name="Admin",
                password_hash=admin_pwd_hash,
                role="admin",
                is_active=True
            )
            
            admin2 = User(
                email="admin@example.com",
                display_name="Admin Example",
                password_hash=admin_pwd_hash,
                role="admin",
                is_active=True
            )
            
            session.add(admin1)
            session.add(admin2)
            
            session.commit()
            print("Successfully reset users.")
            print("Default admins created:")
            print("- admin (password: spinner)")
            print("- admin@example.com (password: spinner)")
            
        except Exception as e:
            session.rollback()
            print(f"Error resetting users: {e}")
            sys.exit(1)

if __name__ == "__main__":
    main()
