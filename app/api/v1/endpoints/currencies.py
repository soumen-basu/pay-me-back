"""
Currencies API endpoint.

Exposes the backend currency master list so the frontend doesn't
need to maintain its own copy.
"""

from typing import Any, List

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.currencies import CURRENCIES, CurrencyInfo as _CurrencyInfo


router = APIRouter()


class CurrencyOut(BaseModel):
    """Serialisable representation of a supported currency."""

    code: str
    symbol: str
    name: str
    decimals: int


@router.get("/", response_model=List[CurrencyOut])
def list_currencies() -> Any:
    """
    Return all supported currencies.

    This is a public/lightweight endpoint – no authentication required.
    """
    return [
        CurrencyOut(
            code=c.code,
            symbol=c.symbol,
            name=c.name,
            decimals=c.decimals,
        )
        for c in CURRENCIES.values()
    ]
