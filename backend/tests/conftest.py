import os
import pytest

# Set a test DB URL before importing the app so SQLAlchemy uses sqlite in-memory
os.environ['DATABASE_URL'] = os.getenv('DATABASE_URL', 'sqlite:///:memory:')

from fastapi.testclient import TestClient
from backend import api
from backend.models import Base


@pytest.fixture(scope='session')
def client():
    # Ensure tables created for in-memory DB
    Base.metadata.create_all(bind=api.engine)
    with TestClient(api.app) as c:
        yield c
    # Drop tables after tests (safe for in-memory SQLite)
    Base.metadata.drop_all(bind=api.engine)
