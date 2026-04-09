import json
import os
from pathlib import Path
from pydantic import BaseModel
from typing import Dict
from app.core.config import settings

class TierCapabilities(BaseModel):
    can_use_multiple_currencies: bool = False
    can_create_multi_currency_claims: bool = False
    has_receipt_extraction: bool = False

class TierQuotas(BaseModel):
    max_expenses_per_month: int = 50
    max_claims_per_month: int = 1
    max_receipt_size_mb: int = 0
    max_receipts_per_expense: int = 0

class TierDefinition(BaseModel):
    name: str
    capabilities: TierCapabilities
    quotas: TierQuotas

# Default fallback if file is missing
DEFAULT_TIER = TierDefinition(
    name="FREE",
    capabilities=TierCapabilities(),
    quotas=TierQuotas()
)

_tiers_config: Dict[str, TierDefinition] = {}

def load_tiers_config() -> Dict[str, TierDefinition]:
    global _tiers_config
    if _tiers_config:
        return _tiers_config

    config_path = Path(__file__).parent / "tiers.json"
    
    # Try an environment override for the config file path if specified
    env_config_path = os.getenv("TIERS_CONFIG_FILE")
    if env_config_path and Path(env_config_path).exists():
        config_path = Path(env_config_path)

    if not config_path.exists():
        print(f"Warning: Tiers configuration file not found at {config_path}. Loading defaults.")
        _tiers_config = {"FREE": DEFAULT_TIER}
        return _tiers_config

    try:
        with open(config_path, "r") as f:
            data = json.load(f)
            
        for tier_key, tier_data in data.items():
            _tiers_config[tier_key] = TierDefinition(**tier_data)
            
    except Exception as e:
        print(f"Error loading tiers configuration from {config_path}: {e}")
        # Fallback to default
        _tiers_config = {"FREE": DEFAULT_TIER}
        
    return _tiers_config

def get_tier_config(tier_name: str) -> TierDefinition:
    tiers = load_tiers_config()
    # Default to FREE if tier is unknown
    return tiers.get(tier_name, tiers.get("FREE", DEFAULT_TIER))
