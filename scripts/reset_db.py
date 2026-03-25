import os
import sys
import getpass
from dotenv import load_dotenv

# Ensure the environment variables are read from a required passed .env file
if len(sys.argv) < 2:
    print("Error: Required environment file path not provided.")
    print("Usage: python reset_db.py <path_to_env_file>")
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
from app.models.user import User, Session as DBSession, UserActivity, UserContact
from app.models.expense import Expense
from app.models.claim import Claim
from app.models.category import Category
from app.models.comment import Comment
from app.models.notification import Notification
from app.models.email import EmailDailyLog
from app.core.security import get_password_hash

def main():
    print("=== Full Database Reset ===")
    print("WARNING: This will DELETE ALL DATA (users, expenses, claims, categories, comments, notifications, etc).")
    print("It will then recreate ONLY the default admin users: admin and admin@example.com.")
    
    confirmation = input("Type 'confirm full reset' to proceed: ").strip()
    if confirmation != 'confirm full reset':
        print("Reset aborted.")
        sys.exit(0)
        
    print("Connecting to database and executing full reset...")
    
    # Ensure DB tables exist
    init_db()

    with Session(engine) as session:
        try:
            # Delete dependent tables first, in order to avoid foreign key constraint violations
            print("Deleting Comments...")
            session.exec(delete(Comment))
            
            print("Deleting Expenses...")
            session.exec(delete(Expense))
            
            print("Deleting Claims...")
            session.exec(delete(Claim))
            
            print("Deleting Notifications...")
            session.exec(delete(Notification))
            
            print("Deleting Categories...")
            session.exec(delete(Category))
            
            print("Deleting User Sessions...")
            session.exec(delete(DBSession))
            
            print("Deleting User Activities...")
            session.exec(delete(UserActivity))
            
            print("Deleting User Contacts...")
            session.exec(delete(UserContact))
            
            print("Deleting Users...")
            session.exec(delete(User))
            
            print("Deleting Email Daily Logs...")
            session.exec(delete(EmailDailyLog))
            
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
            
            print("Recreating default admins...")
            session.add(admin1)
            session.add(admin2)
            
            session.commit()
            print("=== Database reset successfully! ===")
            print("Created default admin accounts:")
            print("- admin (password: spinner)")
            print("- admin@example.com (password: spinner)")
            
        except Exception as e:
            session.rollback()
            print(f"Error resetting database: {e}")
            sys.exit(1)

if __name__ == "__main__":
    main()
