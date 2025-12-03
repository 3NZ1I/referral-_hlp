from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import app as api_app
from models import Base
from sqlalchemy import create_engine
import os

# Use sync driver for SQLAlchemy engine
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://user:password@localhost/referral_db")
engine = create_engine(DATABASE_URL)

# Note: Schema creation is now handled by Alembic migrations
# Uncomment below only for initial dev setup without migrations:
# Base.metadata.create_all(bind=engine)

# Mount API under /api and enable CORS
app = FastAPI(title="HLP Referral System API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routes from api.py under /api
from fastapi import APIRouter
router = APIRouter()
router.include_router(api_app.router)
app.include_router(router, prefix="/api")