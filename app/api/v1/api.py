from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, metrics, admin, notifications, categories, expenses, claims, contacts

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(contacts.router, prefix="/users/me/contacts", tags=["contacts"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["metrics"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["expenses"])
api_router.include_router(claims.router, prefix="/claims", tags=["claims"])

