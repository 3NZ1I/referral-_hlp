from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import logging
from backend.api import app as api_app
from sqlalchemy import create_engine
import os

# Use sync driver for SQLAlchemy engine
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://user:password@localhost/referral_db")
engine = create_engine(DATABASE_URL)

# Note: Schema creation is now handled by Alembic migrations
# Uncomment below only for initial dev setup without migrations:
# Base.metadata.create_all(bind=engine)

logging.basicConfig(level=logging.INFO)
# Mount API under /api and enable CORS
app = FastAPI(title="HLP Referral System API", version="1.0.0")
cors_origins = os.getenv("CORS_ORIGINS")
allow_origins = [
    "https://hlp.bessar.work",
    "https://api.bessar.work",
    "http://localhost:5173",
    "http://localhost:3000",
]
if cors_origins:
    allow_origins = [o.strip() for o in cors_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import APIRouter

# Include all routes from api.py under /api
router = APIRouter()
router.include_router(api_app.router)
app.include_router(router, prefix="/api")


@app.get("/")
def root():
    return {"status": "hlp-referral-api", "message": "API running - see /api/health"}


@app.middleware("http")
async def ensure_cors_headers_root(request: Request, call_next):
    """Ensure that Access-Control-Allow-Origin header is present on all responses
    (including error responses that might originate from the router or reverse proxy).
    """
    try:
        response = await call_next(request)
    except Exception as e:
        # If the call_next raised, return a JSONResponse with CORS headers too
        logging.exception("Unhandled exception while handling request: %s", e)
        return JSONResponse({"detail": "Internal server error"}, status_code=500, headers={"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Credentials": "true"})
    if 'Access-Control-Allow-Origin' not in response.headers:
        response.headers['Access-Control-Allow-Origin'] = '*'
    return response


@app.exception_handler(Exception)
def general_exception_handler_root(request: Request, exc: Exception):
    logging.exception("Unhandled exception in API request: %s", exc)
    headers = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Credentials": "true"}
    return JSONResponse({"detail": "Internal server error"}, status_code=500, headers=headers)