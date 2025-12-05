"""
alter string length constraints for existing tables

Revision ID: 003_update_string_lengths
Revises: 002_add_auth_fields
Create Date: 2025-12-04 19:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003_update_string_lengths'
down_revision = '002_add_auth_fields'
branch_labels = None
depends_on = None


def upgrade():
    # Increase column lengths for specified columns
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('name', type_=sa.String(length=255), existing_type=sa.String())
        batch_op.alter_column('ability', type_=sa.String(length=255), existing_type=sa.String())
        batch_op.alter_column('username', type_=sa.String(length=255), existing_type=sa.String())
        batch_op.alter_column('email', type_=sa.String(length=255), existing_type=sa.String())
        batch_op.alter_column('password_hash', type_=sa.String(length=255), existing_type=sa.String())
        batch_op.alter_column('role', type_=sa.String(length=50), existing_type=sa.String())

    with op.batch_alter_table('cases') as batch_op:
        batch_op.alter_column('title', type_=sa.String(length=255), existing_type=sa.String())
        batch_op.alter_column('status', type_=sa.String(length=50), existing_type=sa.String())


def downgrade():
    # Revert to generic string type (no length constraint)
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('name', type_=sa.String(), existing_type=sa.String(length=255))
        batch_op.alter_column('ability', type_=sa.String(), existing_type=sa.String(length=255))
        batch_op.alter_column('username', type_=sa.String(), existing_type=sa.String(length=255))
        batch_op.alter_column('email', type_=sa.String(), existing_type=sa.String(length=255))
        batch_op.alter_column('password_hash', type_=sa.String(), existing_type=sa.String(length=255))
        batch_op.alter_column('role', type_=sa.String(), existing_type=sa.String(length=50))

    with op.batch_alter_table('cases') as batch_op:
        batch_op.alter_column('title', type_=sa.String(), existing_type=sa.String(length=255))
        batch_op.alter_column('status', type_=sa.String(), existing_type=sa.String(length=50))
