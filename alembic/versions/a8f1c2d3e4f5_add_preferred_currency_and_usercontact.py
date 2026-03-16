"""Add preferred_currency and usercontact table

Revision ID: a8f1c2d3e4f5
Revises: 47d4a25c5d47
Create Date: 2026-03-16 15:40:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = "a8f1c2d3e4f5"
down_revision = "47d4a25c5d47"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add preferred_currency column to user table
    op.add_column(
        "user",
        sa.Column(
            "preferred_currency",
            sqlmodel.sql.sqltypes.AutoString(),
            nullable=False,
            server_default="₹",
        ),
    )

    # Create usercontact table
    op.create_table(
        "usercontact",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("contact_email", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("label", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "contact_email", name="uix_user_contact"),
    )
    op.create_index(
        op.f("ix_usercontact_user_id"), "usercontact", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_usercontact_user_id"), table_name="usercontact")
    op.drop_table("usercontact")
    op.drop_column("user", "preferred_currency")
