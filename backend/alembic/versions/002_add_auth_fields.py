"""add auth fields to users

Revision ID: 002
Revises: 001
Create Date: 2025-12-04

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    # Add authentication columns to users table
    op.add_column('users', sa.Column('username', sa.String(), nullable=True))
    op.add_column('users', sa.Column('email', sa.String(), nullable=True))
    op.add_column('users', sa.Column('password_hash', sa.String(), nullable=True))
    op.add_column('users', sa.Column('role', sa.String(), server_default='user', nullable=True))
    op.add_column('users', sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True))
    
    # Create indexes
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)


def downgrade():
    # Drop indexes
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_username'), table_name='users')
    
    # Remove columns
    op.drop_column('users', 'created_at')
    op.drop_column('users', 'role')
    op.drop_column('users', 'password_hash')
    op.drop_column('users', 'email')
    op.drop_column('users', 'username')
