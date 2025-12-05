"""Add updated_at and completed_at to cases

Revision ID: 006_add_case_timestamps
Revises: 005_import_job
Create Date: 2025-12-06 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '006_add_case_timestamps'
down_revision = '005_import_job'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('cases', sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')))
    op.add_column('cases', sa.Column('completed_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('cases', 'completed_at')
    op.drop_column('cases', 'updated_at')
