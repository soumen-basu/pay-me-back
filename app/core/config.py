from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl, validator

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "PayMeBack"
    FRONTEND_BASE_URL: str = "http://localhost:3000"
    
    # Database Config
    DB_HOST: str = "localhost"
    DB_PORT: str = "5432"
    DB_USER: str = "spinner"
    DB_PASSWORD: str = ""
    DB_NAME: str = "PayMeBack"
    DATABASE_URL: str | None = None

    @validator("DATABASE_URL", pre=True, always=True)
    def assemble_db_connection(cls, v: str | None, values: dict) -> str:
        if isinstance(v, str) and v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+psycopg://")
        elif isinstance(v, str):
            return v
        
        # Construct the URL from individual DB components
        user = values.get("DB_USER")
        password = values.get("DB_PASSWORD")
        host = values.get("DB_HOST")
        port = values.get("DB_PORT")
        db = values.get("DB_NAME")
        return f"postgresql+psycopg://{user}:{password}@{host}:{port}/{db}"

    # Security
    SECRET_KEY: str = "CHANGE_THIS_TO_A_SECURE_SECRET_KEY"  # In prod, get from env
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week
    MAGIC_LINK_EXPIRE_MINUTES: int = 15
    USE_DB_SESSIONS: bool = True
    ENFORCE_PASSWORD_COMPLEXITY: bool = False

    # Email Settings
    ENABLE_EMAILS: bool = False
    MAX_EMAILS_PER_USER_PER_DAY: int = 5
    MAX_GLOBAL_EMAILS_PER_DAY: int = 5000
    
    # Notification Settings
    NOTIFICATION_AUTO_DELETE_THRESHOLD: int = 100
    NOTIFICATION_AUTO_DELETE_AMOUNT: int = 20
    
    # AWS SES Settings
    AWS_SES_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str | None = None
    AWS_SECRET_ACCESS_KEY: str | None = None
    AWS_SES_SENDER_EMAIL: str | None = None

    # CORS
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    model_config = SettingsConfigDict(
        case_sensitive=True, 
        env_file=(".env", "env/local.env", "env/credentials.env"), 
        extra="ignore"
    )

settings = Settings()

def get_settings():
    return settings
