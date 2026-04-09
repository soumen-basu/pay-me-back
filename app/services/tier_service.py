from datetime import datetime
from sqlmodel import Session, select, func
from app.models.user import User
from app.models.expense import Expense
from app.models.claim import Claim
from app.core.tiers import get_tier_config

class QuotaExceededException(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)

class TierService:
    @staticmethod
    def get_user_tiers_summary(db: Session, user: User) -> dict:
        tier_config = get_tier_config(user.tier)
        
        current_month = datetime.utcnow().month
        current_year = datetime.utcnow().year

        # Calculate current usage for expenses
        expenses_count = db.exec(
            select(func.count(Expense.id))
            .where(Expense.owner_id == user.id)
            .where(func.extract('month', Expense.created_at) == current_month)
            .where(func.extract('year', Expense.created_at) == current_year)
        ).one()
        
        # Calculate current usage for claims
        claims_count = db.exec(
            select(func.count(Claim.id))
            .where(Claim.owner_id == user.id)
            .where(func.extract('month', Claim.created_at) == current_month)
            .where(func.extract('year', Claim.created_at) == current_year)
        ).one()

        return {
            "tier": tier_config.name,
            "capabilities": tier_config.capabilities.model_dump(),
            "quotas": {
                "max_expenses_per_month": {
                    "limit": tier_config.quotas.max_expenses_per_month,
                    "current_usage": expenses_count
                },
                "max_claims_per_month": {
                    "limit": tier_config.quotas.max_claims_per_month,
                    "current_usage": claims_count
                },
                "max_receipt_size_mb": {
                    "limit": tier_config.quotas.max_receipt_size_mb,
                    "current_usage": 0 # File upload not tracked here dynamically, checked on upload
                },
                "max_receipts_per_expense": {
                    "limit": tier_config.quotas.max_receipts_per_expense,
                    "current_usage": 0 # Evaluated per-expense basis later
                }
            }
        }

    @staticmethod
    def check_expense_quota(db: Session, user: User) -> None:
        summary = TierService.get_user_tiers_summary(db, user)
        expenses_quota = summary["quotas"]["max_expenses_per_month"]
        if expenses_quota["current_usage"] >= expenses_quota["limit"]:
            raise QuotaExceededException(f"Monthly expense limit reached ({expenses_quota['limit']}). Upgrade your tier to create more.")

    @staticmethod
    def check_claim_quota(db: Session, user: User) -> None:
        summary = TierService.get_user_tiers_summary(db, user)
        claims_quota = summary["quotas"]["max_claims_per_month"]
        if claims_quota["current_usage"] >= claims_quota["limit"]:
            raise QuotaExceededException(f"Monthly claim limit reached ({claims_quota['limit']}). Upgrade your tier to create more.")
