from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.config import settings
from sqlalchemy import text
from fastapi import Depends, HTTPException
from sqlmodel import Session
from app.api import deps

app = FastAPI(
    title=settings.PROJECT_NAME, openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def on_startup():
    from app.db.init_db import init_db
    init_db()

@app.get("/")
def root():
    return {"message": "Welcome to Stenella API", "docs": "/docs"}

@app.get("/health")
def health_check(db: Session = Depends(deps.get_db)) -> dict[str, str]:
    try:
        # Check database connection and get uptime
        result = db.exec(text("SELECT to_char(current_timestamp - pg_postmaster_start_time(), 'DD HH24:MI:SS')")).one()
        uptime = result[0]
        return {"status": "ok", "db_uptime": uptime}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connectivity failed: {str(e)}")
