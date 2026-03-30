"""
ISO 4217 currency reference module.

Single source of truth for supported currencies. The frontend fetches this
list via GET /api/v1/currencies/ rather than maintaining its own copy.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class CurrencyInfo:
    """Immutable description of an ISO 4217 currency."""

    code: str        # e.g. "INR"
    symbol: str      # e.g. "₹"
    name: str        # e.g. "Indian Rupee"
    decimals: int    # number of minor-unit digits (2 for most, 0 for JPY/KRW)


# Curated list – ~18 popular currencies, easy to extend.
CURRENCIES: dict[str, CurrencyInfo] = {
    "INR": CurrencyInfo("INR", "₹", "Indian Rupee", 2),
    "USD": CurrencyInfo("USD", "$", "US Dollar", 2),
    "EUR": CurrencyInfo("EUR", "€", "Euro", 2),
    "GBP": CurrencyInfo("GBP", "£", "British Pound", 2),
    "JPY": CurrencyInfo("JPY", "¥", "Japanese Yen", 0),
    "AUD": CurrencyInfo("AUD", "A$", "Australian Dollar", 2),
    "CAD": CurrencyInfo("CAD", "C$", "Canadian Dollar", 2),
    "CHF": CurrencyInfo("CHF", "Fr", "Swiss Franc", 2),
    "CNY": CurrencyInfo("CNY", "¥", "Chinese Yuan", 2),
    "SEK": CurrencyInfo("SEK", "kr", "Swedish Krona", 2),
    "NZD": CurrencyInfo("NZD", "NZ$", "New Zealand Dollar", 2),
    "SGD": CurrencyInfo("SGD", "S$", "Singapore Dollar", 2),
    "HKD": CurrencyInfo("HKD", "HK$", "Hong Kong Dollar", 2),
    "KRW": CurrencyInfo("KRW", "₩", "South Korean Won", 0),
    "ZAR": CurrencyInfo("ZAR", "R", "South African Rand", 2),
    "BRL": CurrencyInfo("BRL", "R$", "Brazilian Real", 2),
    "AED": CurrencyInfo("AED", "د.إ", "UAE Dirham", 2),
    "THB": CurrencyInfo("THB", "฿", "Thai Baht", 2),
}

VALID_CURRENCY_CODES: set[str] = set(CURRENCIES.keys())


# Mapping from the legacy symbol values stored in user.preferred_currency
# to ISO 4217 codes, used during the Alembic migration.
SYMBOL_TO_CODE: dict[str, str] = {
    "₹": "INR",
    "$": "USD",
    "€": "EUR",
    "£": "GBP",
    "¥": "JPY",
    "A$": "AUD",
    "C$": "CAD",
}
