import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException
from starlette.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlmodel import Session

from app.api.v1.api import api_router
from app.core.config import settings
from app.api import deps
from app.db.init_db import init_db

logger = logging.getLogger(__name__)

async def background_notification_worker():
    """
    Background worker that runs periodically to process deferred notifications 
    (e.g., sending queued emails or SMS based on the Notification table).
    """
    logger.info("Starting background notification worker...")
    while True:
        try:
            # MVP: In a real app, query the DB for unsent emails/SMS here
            # For now, we just sleep to simulate the 'cron' behavior.
            await asyncio.sleep(60)  # Check every 60 seconds
        except asyncio.CancelledError:
            logger.info("Background worker cancelled.")
            break
        except Exception as e:
            logger.error(f"Error in background worker: {e}")
            await asyncio.sleep(60)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    init_db()
    
    # Start the background task
    worker_task = asyncio.create_task(background_notification_worker())
    
    yield
    
    # Shutdown actions
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title=settings.PROJECT_NAME, 
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin).rstrip("/") for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)



@app.get("/")
def root():
    return {"message": "Welcome to PayMeBack API", "docs": "/docs"}

@app.get("/health")
def health_check(db: Session = Depends(deps.get_db)) -> dict[str, str]:
    try:
        # Check database connection and get uptime
        result = db.exec(text("SELECT EXTRACT(EPOCH FROM (current_timestamp - pg_postmaster_start_time()))")).one()
        uptime_seconds = int(result[0])
        days, remainder = divmod(uptime_seconds, 86400)
        hours, remainder = divmod(remainder, 3600)
        minutes, seconds = divmod(remainder, 60)
        
        if days > 0:
            uptime = f"{days}d {hours:02d}:{minutes:02d}:{seconds:02d}"
        else:
            uptime = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
            
        return {"status": "ok", "db_uptime": uptime}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connectivity failed: {str(e)}")
