# HLP Referral System

Backend: FastAPI (Python) • Frontend: React • DB: PostgreSQL • Docker-ready • n8n automation

## Quick Start (Local Development)

```powershell
# From project root
docker compose build
docker compose up
# Frontend: http://localhost:8080
# Backend:  http://localhost:8000/api
```

## Database Migrations (Alembic)

This project uses Alembic for automatic database schema management.
# Deployment

1. Ensure PostgreSQL is running and accessible (default: localhost, port 5432).
2. Alembic config is in `backend/alembic.ini`.
3. Models are in `backend/models.py`.

### Create/Update Tables
Activate your Python virtual environment, then run:
```bash
cd backend
alembic revision --autogenerate -m "Initial tables"
alembic upgrade head
```

### Troubleshooting Migration Errors
- If you see errors like `Can't locate revision identified by 'XXX'`, reset Alembic:
  1. Delete all files in `backend/alembic/versions/`.
  2. Drop the `alembic_version` table from your database:
     ```bash
     psql -U user -d referral_db -h localhost
     DROP TABLE IF EXISTS alembic_version;
     \q
     ```
  3. Re-run the migration commands above.

### Deployment
After running migrations, all tables (`users`, `cases`, `comments`) will be created automatically on deployment.

**Tip:** Always run Alembic migrations after pulling new code or updating models.

## Production Deployment

**🚀 Live Application:**
- **Frontend:** https://hlp.bessar.work
- **Backend API:** https://api.bessar.work/api/health
- **Server:** Azure VM (refsys2) at 135.220.73.22
- **SSL/TLS:** Let's Encrypt (TLS 1.3, expires Mar 4, 2026)

### Prerequisites
- Azure Ubuntu VM (22.04+) with Docker and Docker Compose installed
- Domain names configured (A records pointing to VM IP)
- GitHub repository: `https://github.com/3NZ1I/referral-_hlp.git`
- Pre-built Docker images on Docker Hub:
  - `bessarf/referral-hlp-frontend:latest`
  - `bessarf/referral-hlp-backend:latest`

### Quick Deployment (Recommended)
```bash
# 1. Clone repository
git clone https://github.com/3NZ1I/referral-_hlp.git

# 2. Pull pre-built images from Docker Hub
sudo docker pull bessarf/referral-hlp-frontend:latest
sudo docker pull bessarf/referral-hlp-backend:latest
# 3. Tag images locally (workaround for docker-compose issue)
sudo docker tag bessarf/referral-hlp-frontend:latest referral-hlp-frontend:latest
sudo docker tag bessarf/referral-hlp-backend:latest referral-hlp-backend:latest
# 4. Start all services
sudo docker compose up -d

# 5. Verify deployment
sudo docker compose ps
# All containers should show "healthy" status
```

### SSL/TLS Setup

```bash
# Install certbot
# Stop nginx temporarily
sudo systemctl stop nginx
# Obtain certificates
sudo certbot certonly --standalone \
  -d hlp.bessar.work \
  -d api.bessar.work

# Configure nginx reverse proxy (see DEPLOYMENT.md for full config)
sudo systemctl start nginx

# Verify HTTPS works
curl https://hlp.bessar.work
curl https://api.bessar.work/api/health
```

### Full Deployment Guide

**📖 See [DEPLOYMENT.md](./DEPLOYMENT.md) for:**
- Detailed step-by-step instructions
- Common issues & solutions (DNS, vite build errors, docker-compose quirks)
- SSL certificate configuration
- Nginx reverse proxy setup
- Database backup/restore procedures
- Security best practices
- Monitoring and maintenance

### Updating the System

When you push changes to GitHub:

```bash
# SSH into your Azure VM
ssh bessar@135.220.73.22

# Navigate to project directory
cd ~/referral-_hlp

# Pull latest code
git pull origin main

# Pull updated Docker images from Docker Hub
sudo docker pull bessarf/referral-hlp-frontend:latest
sudo docker pull bessarf/referral-hlp-backend:latest

# Tag locally
sudo docker tag bessarf/referral-hlp-frontend:latest referral-hlp-frontend:latest
sudo docker tag bessarf/referral-hlp-backend:latest referral-hlp-backend:latest

# Restart services with new images
sudo docker compose up -d

# View logs to verify
sudo docker compose logs -f
```

**Note:** Pre-built images are hosted on Docker Hub to avoid DNS resolution issues during build.

### Database Backup Strategy

**Automated daily backups** (configured on production VM):
```bash
# Create backup script
cat > ~/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="$HOME/db_backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cd ~/referral-_hlp
sudo docker exec referral-_hlp-db-1 pg_dump -U user referral_db | gzip > $BACKUP_DIR/backup_$DATE.sql.gz
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
echo "Backup completed: backup_$DATE.sql.gz"
EOF

chmod +x ~/backup-db.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * $HOME/backup-db.sh") | crontab -
```

**Restore from backup**:
```bash
# From gzipped backup
zcat backup_20251204.sql.gz | sudo docker exec -i referral-_hlp-db-1 psql -U user referral_db

# From uncompressed backup
cat backup_20251204.sql | sudo docker exec -i referral-_hlp-db-1 psql -U user referral_db
```

## Environment Variables

### Backend
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT token signing (change in production!)
- `JWT_EXP_MINUTES`: Token expiration time in minutes (default: 120)

### Frontend
- `REACT_APP_API_URL`: API base URL (e.g., `https://api.bessar.work/api`)

### Database
- `POSTGRES_USER`: Database user
- `POSTGRES_PASSWORD`: Database password
- `POSTGRES_DB`: Database name

## API Overview

### Authentication
All write endpoints require Bearer token. Obtain token:
```http
POST /api/auth/token
Content-Type: application/json

{ "sub": "n8n", "role": "system" }
```

Response: `{ "token": "<jwt>" }`

### Endpoints
- `GET /api/cases` → list cases
- `GET /api/cases/{id}` → case details
- `POST /api/cases` (Bearer) → create case
- `PUT /api/cases/{id}` (Bearer) → update case
- `DELETE /api/cases/{id}` (Bearer) → delete case
- `GET /api/users` → list users
- `POST /api/users` (Bearer) → create user
- `GET /api/cases/{id}/comments` → list comments
- `POST /api/cases/{id}/comments` (Bearer) → add comment
- `POST /api/cases/{id}/assign` (Bearer) → assign case
- `POST /api/import` (Bearer) → upload Kobo XLSX
- `POST /api/auth/token` → issue JWT token

## n8n Integration Examples

### 1. Obtain Token
```json
{
  "method": "POST",
  "url": "https://api.bessar.work/api/auth/token",
  "body": {
    "sub": "n8n",
    "role": "automation"
  }
}
```

### 2. Create Case
```json
{
  "method": "POST",
  "url": "https://api.bessar.work/api/cases",
  "headers": {
    "Authorization": "Bearer <token>"
  },
  "body": {
    "title": "New Case",
    "description": "Details here",
    "status": "open"
  }
}
```

### 3. Assign Case
```json
{
  "method": "POST",
  "url": "https://api.bessar.work/api/cases/1/assign",
  "headers": {
    "Authorization": "Bearer <token>"
  },
  "body": {
    "ability": "legal"
  }
}
```

### 4. Import XLSX
- Use HTTP Request node
- Method: POST
- URL: `https://api.bessar.work/api/import`
- Send Binary File: `file`
- Header: `Authorization: Bearer <token>`

## Database Migrations

### Create New Migration
```bash
# Inside backend container or with local Alembic
cd backend
alembic revision --autogenerate -m "description of changes"
```

### Apply Migrations
```bash
# Production
docker compose run --rm backend alembic upgrade head

# Local dev
cd backend
alembic upgrade head
```

### Rollback Migration
```bash
alembic downgrade -1
```

## Development Workflow

### Local Backend Dev
```powershell
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Local Frontend Dev
```powershell
cd frontend
npm install
npm run dev
# Uses http://localhost:8000/api
```

### VS Code Tasks
Use Command Palette → "Run Task":
- `Backend: FastAPI dev`
- `Frontend: React dev`
- `Docker: compose up`

## Monitoring

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

### Health Checks
- Backend: `http://localhost:8000/api/cases` (or `https://api.bessar.work/api/cases`)
- Frontend: `http://localhost:8080/health` (or `https://hlp.bessar.work/health`)
- Database: `docker compose ps` (should show "healthy")

## Security Notes

- **Change default passwords** in `.env` file
- **Set strong JWT_SECRET** (use `openssl rand -hex 32`)
- **Enable firewall** on Azure VM (allow only 80, 443, 22)
- **Use HTTPS** in production (Let's Encrypt)
- **Restrict CORS** in `backend/main.py` to your domains
- **Regular backups** of database
- **Keep images updated**: `docker compose pull && docker compose up -d`

## Troubleshooting

### Database connection issues
```bash
# Check DB is running
docker compose ps db

# Check logs
docker compose logs db

# Verify connection string in .env
```

### Frontend can't reach backend
- Verify `REACT_APP_API_URL` is set correctly
- Check CORS settings in `backend/main.py`
- Ensure reverse proxy is configured for `api.bessar.work`

### Migration errors
```bash
# Check current migration version
docker compose run --rm backend alembic current

# Force to specific version
docker compose run --rm backend alembic stamp head
```

## License

Proprietary - HLP Referral System
