import pytest
from app.core.tiers import get_tier_config

def test_load_default_tier_free():
    tier = get_tier_config("FREE")
    assert tier.name == "FREE"
    assert tier.quotas.max_expenses_per_month == 300
    assert tier.capabilities.can_use_multiple_currencies is False

def test_load_tier_pro():
    tier = get_tier_config("PRO")
    assert tier.name == "PRO"
    assert tier.quotas.max_expenses_per_month == 1000
    assert tier.capabilities.can_use_multiple_currencies is True

def test_load_unknown_tier_falls_back_to_free():
    tier = get_tier_config("UNKNOWN_TIER_ABC")
    assert tier.name == "FREE"

