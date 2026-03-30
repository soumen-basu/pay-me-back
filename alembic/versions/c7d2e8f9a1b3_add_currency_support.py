"""Add currency_code to expense, migrate user preferred_currency to ISO 4217

Revision ID: c7d2e8f9a1b3
Revises: a8f1c2d3e4f5
Create Date: 2026-03-29 15:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = "c7d2e8f9a1b3"
down_revision = "a8f1c2d3e4f5"
branch_labels = None
depends_on = None

# Mapping from legacy symbol values to ISO 4217 codes
SYMBOL_TO_CODE = {
    "₹": "INR",
    "$": "USD",
    "€": "EUR",
    "£": "GBP",
    "¥": "JPY",
    "A$": "AUD",
    "C$": "CAD",
}


def upgrade() -> None:
    # 1. Add currency_code column to expense table
    op.add_column(
        "expense",
        sa.Column(
            "currency_code",
            sqlmodel.sql.sqltypes.AutoString(),
            nullable=False,
            server_default="INR",
        ),
    )

    # 2. Set all existing expenses to INR (as approved in design review)
    op.execute("UPDATE expense SET currency_code = 'INR'")

    # 3. Convert user.preferred_currency from symbol to ISO 4217 code
    for symbol, code in SYMBOL_TO_CODE.items():
        # Use simple string formatting since values are purely our hardcoded safe dictionary
        op.execute(f"UPDATE \"user\" SET preferred_currency = '{code}' WHERE preferred_currency = '{symbol}'")

    # 4. Any remaining unrecognised symbols default to INR
    known_codes = set(SYMBOL_TO_CODE.values())
    codes_csv = ", ".join(f"'{c}'" for c in known_codes)
    op.execute(
        f'UPDATE "user" SET preferred_currency = \'INR\' WHERE preferred_currency NOT IN ({codes_csv})'
    )

    # 5. Update the server_default for preferred_currency to INR
    op.alter_column(
        "user",
        "preferred_currency",
        server_default="INR",
    )


def downgrade() -> None:
    # Remove currency_code from expense
    op.drop_column("expense", "currency_code")

    # Revert user.preferred_currency back to symbol format
    CODE_TO_SYMBOL = {v: k for k, v in SYMBOL_TO_CODE.items()}
    for code, symbol in CODE_TO_SYMBOL.items():
        op.execute(f"UPDATE \"user\" SET preferred_currency = '{symbol}' WHERE preferred_currency = '{code}'")

    op.alter_column(
        "user",
        "preferred_currency",
        server_default="₹",
    )
