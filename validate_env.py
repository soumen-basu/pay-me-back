import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv

REQUIRED_KEYS = [
    "API_HOST", "API_PORT", "API_V1_STR", "PROJECT_NAME",
    "FRONTEND_HOST", "FRONTEND_PORT", "VITE_API_BASE_URL",
    "DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME",
    "SECRET_KEY", "BACKEND_CORS_ORIGINS"
]

def print_error(msg: str):
    print(f"❌ ERROR: {msg}")

def print_success(msg: str):
    print(f"✅ SUCCESS: {msg}")

def validate_env_file(env_file_path: str):
    path = Path(env_file_path)
    if not path.is_file():
        print_error(f"Environment file not found at: {path.absolute()}")
        sys.exit(1)

    print(f"Validating {path.name}...")
    load_dotenv(dotenv_path=path, override=True)
    
    # Check for presence of all keys
    missing_keys = [key for key in REQUIRED_KEYS if os.getenv(key) is None or os.getenv(key) == ""]
    if missing_keys:
        print_error(f"Missing required configuration variables: {', '.join(missing_keys)}")
        sys.exit(1)
        
    # Validation 1: Ports are numeric
    try:
        api_port = int(os.environ["API_PORT"])
        frontend_port = int(os.environ["FRONTEND_PORT"])
        db_port = int(os.environ["DB_PORT"])
    except ValueError as e:
        print_error(f"Ports must be integer values. {e}")
        sys.exit(1)

    # Validation 2: VITE_API_BASE_URL points to the correct API configuration
    vite_base_url = os.environ["VITE_API_BASE_URL"]
    if str(api_port) not in vite_base_url and "api" not in vite_base_url:
        print(f"⚠️  WARNING: VITE_API_BASE_URL ({vite_base_url}) is not explicitly pointing to API_PORT ({api_port}). This could be intentional in Production.")

    # Validation 3: CORS array is parsable and includes frontend details
    cors_str = os.environ["BACKEND_CORS_ORIGINS"]
    try:
        cors_list = json.loads(cors_str)
        if not isinstance(cors_list, list):
            raise ValueError("CORS Origins must be a JSON array")
        
        # Check if local development ports are registered in the CORS configuration
        if "localhost" in cors_str and str(frontend_port) not in cors_str:
            print(f"⚠️  WARNING: Localhost detected in CORS origins, but the FRONTEND_PORT ({frontend_port}) is missing.")
            
    except json.JSONDecodeError:
        print_error(f"BACKEND_CORS_ORIGINS is not a valid JSON array. Please ensure it is comma-delimited strings enclosed in brackets. Found: {cors_str}")
        sys.exit(1)
    except Exception as e:
        print_error(f"CORS parsing error: {e}")
        sys.exit(1)

    print_success(f"All validation checks passed for {path.name}!")
    sys.exit(0)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python validate_env.py <path_to_env_file>")
        sys.exit(1)
    
    validate_env_file(sys.argv[1])
