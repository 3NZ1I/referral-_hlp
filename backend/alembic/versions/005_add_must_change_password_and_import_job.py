"""Add must_change_password and import job tables

Revision ID: 005_add_must_change_password_and_import_job
Revises: 004_add_raw_case_column
Create Date: 2025-12-05 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '005_import_job'
down_revision = '004_add_raw_case_column'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # add column to users
    op.add_column('users', sa.Column('must_change_password', sa.Boolean(), nullable=False, server_default=sa.text('false')))

    # create import_jobs table
    op.create_table(
        'import_jobs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('uploader_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('uploader_name', sa.String(length=255), nullable=True),
        sa.Column('filename', sa.String(length=512), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )

    # create import_rows table
    op.create_table(
        'import_rows',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('job_id', sa.Integer(), sa.ForeignKey('import_jobs.id'), nullable=False),
        sa.Column('row_number', sa.Integer(), nullable=True),
        sa.Column('raw', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='pending'),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('case_id', sa.Integer(), sa.ForeignKey('cases.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )


def downgrade() -> None:
    op.drop_table('import_rows')
    op.drop_table('import_jobs')
    op.drop_column('users', 'must_change_password')
