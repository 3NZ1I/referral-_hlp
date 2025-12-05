"""Add raw JSON column to cases

Revision ID: 004_add_raw_case_column
Revises: 003
Create Date: 2025-12-05

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004_add_raw_case_column'
down_revision = '003_update_string_lengths'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add a JSON column to store source/raw form data for each case
    op.add_column('cases', sa.Column('raw', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('cases', 'raw')

