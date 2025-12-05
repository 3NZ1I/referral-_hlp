
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import logging
import traceback
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.models import User, Case, Comment
from datetime import datetime
from .schemas import (
    CaseCreate,
    CaseRead,
    UserCreate,
    UserRead,
    CommentCreate,
    CommentRead,
)
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import openpyxl
import bcrypt

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://user:password@localhost/referral_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

app = FastAPI()
MAINTENANCE_SCHEDULES = []
_maintenance_seq = 1

def is_admin_user(user):
    if not isinstance(user, dict):
        return False
    role = user.get('role') or user.get('roles') or user.get('role')
    return role == 'admin' or (role and role.lower() == 'admin')


# Lightweight health endpoint for readiness checks
@app.get("/health")
def health():
    return {"status": "ok"}


 
@app.exception_handler(Exception)
def general_exception_handler(request, exc):
    # Log full stack trace locally for diagnostics, avoid exposing details in response
    logging.exception("Unhandled exception in API request: %s", exc)
    # Ensure CORS header presence on error responses so browser can receive the error
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": "true",
    }
    return JSONResponse({"detail": "Internal server error"}, status_code=500, headers=headers)

security = HTTPBearer()
JWT_SECRET = os.getenv("SECRET_KEY", os.getenv("JWT_SECRET", "dev-secret"))
JWT_EXP_MINUTES = int(os.getenv("JWT_EXP_MINUTES", "120"))

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def create_token(payload: dict):
    to_encode = payload.copy()
    to_encode.update({"exp": datetime.utcnow() + timedelta(minutes=JWT_EXP_MINUTES)})
    return jwt.encode(to_encode, JWT_SECRET, algorithm="HS256")


def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return decoded
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

 

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# CASES CRUD
@app.get("/cases", response_model=list[CaseRead])
def get_cases(db: Session = Depends(get_db)):
    return db.query(Case).all()

@app.get("/cases/{case_id}", response_model=CaseRead)
def get_case(case_id: int, db: Session = Depends(get_db)):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case

@app.post("/cases", response_model=CaseRead, status_code=status.HTTP_201_CREATED)
def create_case(case: CaseCreate, db: Session = Depends(get_db), user=Depends(require_auth)):
    new_case = Case(**case.dict())
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    return new_case

@app.put("/cases/{case_id}", response_model=CaseRead)
def update_case(case_id: int, case: CaseCreate, db: Session = Depends(get_db), user=Depends(require_auth)):
    db_case = db.get(Case, case_id)
    if not db_case:
        raise HTTPException(status_code=404, detail="Case not found")
    for key, value in case.dict(exclude_unset=True).items():
        setattr(db_case, key, value)
    db.commit()
    db.refresh(db_case)
    return db_case

@app.delete("/cases/{case_id}")
def delete_case(case_id: int, db: Session = Depends(get_db), user=Depends(require_auth)):
    db_case = db.get(Case, case_id)
    if not db_case:
        raise HTTPException(status_code=404, detail="Case not found")
    db.delete(db_case)
    db.commit()
    return {"detail": "Case deleted"}

# USERS CRUD
@app.get("/users", response_model=list[UserRead])
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()

@app.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(user: UserCreate, db: Session = Depends(get_db), auth=Depends(require_auth)):
    # Hash password if provided
    password = user.password
    user_data = user.dict(exclude={"password"})
    if password:
        user_data["password_hash"] = hash_password(password)
    new_user = User(**user_data)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.delete('/users/{user_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db), auth=Depends(require_auth)):
    db_user = db.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail='User not found')
    db.delete(db_user)
    db.commit()
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT)

# COMMENTS CRUD
@app.get("/cases/{case_id}/comments", response_model=list[CommentRead])
def get_comments(case_id: int, db: Session = Depends(get_db)):
    return db.query(Comment).filter(Comment.case_id == case_id).all()

@app.post("/cases/{case_id}/comments", response_model=CommentRead, status_code=status.HTTP_201_CREATED)
def add_comment(case_id: int, comment: CommentCreate, db: Session = Depends(get_db), user=Depends(require_auth)):
    # Use the authenticated user id for comment ownership when possible
    user_id = None
    if isinstance(user, dict):
        user_id = user.get('user_id') or user.get('sub')
    new_comment = Comment(case_id=case_id, user_id=user_id, **comment.dict())
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return new_comment

# ABILITIES (simple list)
@app.get("/abilities")
def get_abilities(db: Session = Depends(get_db)):
    abilities = db.query(User.ability).distinct().all()
    return [a[0] for a in abilities if a[0]]

# ASSIGN CASE
@app.post("/cases/{case_id}/assign", response_model=CaseRead)
def assign_case(case_id: int, payload: dict, db: Session = Depends(get_db), user=Depends(require_auth)):
    case = db.query(Case).get(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    user_name = payload.get("user")
    ability = payload.get("ability")
    assigned_user = None
    if user_name:
        assigned_user = db.query(User).filter(User.name == user_name).first()
        if not assigned_user:
            assigned_user = User(name=user_name, ability=ability)
            db.add(assigned_user)
            db.flush()
    elif ability:
        assigned_user = db.query(User).filter(User.ability == ability).first()
        if not assigned_user:
            assigned_user = User(name=f"auto-{ability}", ability=ability)
            db.add(assigned_user)
            db.flush()
    case.assigned_to = assigned_user
    db.commit()
    db.refresh(case)
    return case

# XLSX IMPORT (n8n/file upload compatible)
@app.post("/import")
def import_xlsx(file: UploadFile = File(...), db: Session = Depends(get_db), user=Depends(require_auth)):
    try:
        wb = openpyxl.load_workbook(file.file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid XLSX file: {e}")
    ws = wb.active
    headers = [cell.value for cell in ws[1]]
    imported = 0
    # Resolve uploader id if authentication provided
    uploader_user = None
    if isinstance(user, dict):
        uploader_id = user.get('user_id') or user.get('sub')
        if uploader_id:
            uploader_user = db.get(User, int(uploader_id))

    for row in ws.iter_rows(min_row=2, values_only=True):
        case_data = dict(zip(headers, row))
        # Map XLSX columns to Case fields (customize as needed)
        # Store the raw row data to allow frontend mapping and backfill
        title = case_data.get('Title') or case_data.get('title') or case_data.get('case_id') or 'No Title'
        description = case_data.get('Description') or case_data.get('description') or ''
        # Enforce system default status 'Pending' for imported cases
        status = 'Pending'
        case = Case(
            title=title,
            description=description,
            status=status,
            raw=case_data,
        )
        # Do not assign uploader by default; keep system-unassigned when imported
        db.add(case)
        imported += 1
    db.commit()
    return {"imported": imported}


@app.on_event('startup')
def on_startup():
    # quick check for DB connectivity
    try:
        db = SessionLocal()
        db.execute('SELECT 1')
        db.close()
    except Exception:
        # Log here if desired, but keep startup non-fatal
        pass

    # Seed default admin if no users exist (use env vars to override)
    try:
        db = SessionLocal()
        users_count = db.query(User).count()
        if users_count == 0:
            admin_user = os.getenv('INITIAL_ADMIN_USERNAME', 'admin')
            admin_email = os.getenv('INITIAL_ADMIN_EMAIL', 'admin@example.com')
            admin_pass = os.getenv('INITIAL_ADMIN_PASSWORD', 'admin123')
            hashed = hash_password(admin_pass)
            new_admin = User(username=admin_user, email=admin_email, password_hash=hashed, role='admin', name='Administrator')
            db.add(new_admin)
            db.commit()
            db.refresh(new_admin)
            # Log to keep track; avoid exposing password in logs
            print(f"[startup] created default admin user '{admin_user}' (email: {admin_email})")
        db.close()
    except Exception as e:
        print('[startup] error seeding admin user:', e)

# Simple auth: issue token for n8n or UI
@app.post("/auth/token")
def issue_token(payload: dict):
    # payload can include {"sub": "n8n", "role": "system"}
    token = create_token(payload)
    return {"token": token}

# Registration endpoint (no auth required - first user setup)
@app.post("/auth/register")
def register(payload: dict, db: Session = Depends(get_db)):
    username = payload.get("username")
    email = payload.get("email")
    password = payload.get("password")
    role = payload.get("role", "user")
    name = payload.get("name", username)
    
    if not username or not email or not password:
        raise HTTPException(status_code=400, detail="username, email, and password required")
    
    # Check if user exists
    existing = db.query(User).filter((User.username == username) | (User.email == email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    
    # Create user
    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        role=role,
        name=name,
        ability=payload.get("ability")
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Return token
    token = create_token({"sub": user.username, "user_id": user.id, "role": user.role})
    return {"token": token, "user": {"id": user.id, "username": user.username, "email": user.email, "role": user.role}}

# Login endpoint
@app.post("/auth/login")
def login(payload: dict, db: Session = Depends(get_db)):
    try:
        username = payload.get("username")
        password = payload.get("password")
        
        if not username or not password:
            raise HTTPException(status_code=400, detail="username and password required")
        
        user = db.query(User).filter(User.username == username).first()
        if not user or not user.password_hash or not verify_password(password, user.password_hash):
            # Don't reveal which part failed (user exists vs password), just return unauthorized
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        token = create_token({"sub": user.username, "user_id": user.id, "role": user.role})
        return {"token": token, "user": {"id": user.id, "username": user.username, "email": user.email, "role": user.role}}


    # Maintenance schedule endpoints (simple in-memory store)
    @app.get('/maintenance')
    def get_maintenance():
        return MAINTENANCE_SCHEDULES


    @app.post('/maintenance')
    def create_maintenance(payload: dict, user=Depends(require_auth)):
        global _maintenance_seq
        if not is_admin_user(user):
            raise HTTPException(status_code=403, detail='Admin privileges required')
        start = payload.get('start')
        end = payload.get('end')
        message = payload.get('message') or 'Scheduled maintenance'
        if not start or not end:
            raise HTTPException(status_code=400, detail='start and end datetime required')
        try:
            start_dt = datetime.fromisoformat(start)
            end_dt = datetime.fromisoformat(end)
        except Exception:
            raise HTTPException(status_code=400, detail='Invalid datetime format - use isoformat')
        if start_dt >= end_dt:
            raise HTTPException(status_code=400, detail='start must be before end')
        entry = {
            'id': _maintenance_seq,
            'start': start_dt.isoformat(),
            'end': end_dt.isoformat(),
            'message': message,
            'created_by': user.get('user_id') if isinstance(user, dict) else None,
        }
        _maintenance_seq += 1
        MAINTENANCE_SCHEDULES.append(entry)
        return entry


    @app.delete('/maintenance/{mid}')
    def delete_maintenance(mid: int, user=Depends(require_auth)):
        if not is_admin_user(user):
            raise HTTPException(status_code=403, detail='Admin privileges required')
        global MAINTENANCE_SCHEDULES
        MAINTENANCE_SCHEDULES = [m for m in MAINTENANCE_SCHEDULES if m['id'] != mid]
        return {'deleted': mid}
    except HTTPException:
        # Pass-through known HTTP exceptions
        raise
    except Exception as e:
        logging.exception("Unhandled error in login for user '%s': %s", payload.get('username'), e)
        raise HTTPException(status_code=500, detail="Internal server error")
