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

## Production Deployment (Azure Ubuntu Docker)

### Prerequisites
- Azure Ubuntu VM with Docker and Docker Compose installed
- Domain names configured:
  - `hlp.bessar.work` → Frontend
  - `api.bessar.work` → Backend API
- GitHub repository: `https://github.com/3NZ1I/referral-_hlp.git`

### Initial Setup on Azure VM

1. **Clone repository**
```bash
git clone https://github.com/3NZ1I/referral-_hlp.git
cd referral-_hlp
```

2. **Create production environment file**
```bash
cp .env.example .env
nano .env
```

Set the following variables:
```env
DATABASE_URL=postgresql+psycopg2://user:SecurePassword@db/referral_db
POSTGRES_USER=user
POSTGRES_PASSWORD=SecurePassword
POSTGRES_DB=referral_db
JWT_SECRET=your-secure-random-secret-key
JWT_EXP_MINUTES=120
REACT_APP_API_URL=https://api.bessar.work/api
```

3. **Run database migrations**
```bash
# Start only the database
docker compose up -d db

# Wait for DB to be ready, then run migrations
docker compose run --rm backend alembic upgrade head
```

4. **Start all services**
```bash
docker compose up -d
```

5. **Configure reverse proxy (Nginx/Caddy on host)**

For `api.bessar.work`:
```nginx
server {
    listen 80;
    server_name api.bessar.work;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

For `hlp.bessar.work`:
```nginx
server {
    listen 80;
    server_name hlp.bessar.work;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

6. **Enable HTTPS with Let's Encrypt**
```bash
sudo certbot --nginx -d api.bessar.work -d hlp.bessar.work
```

### Updating the System (Zero Downtime)

When you push changes to GitHub, CI/CD automatically builds new images. To deploy updates:

```bash
# SSH into your Azure VM
ssh user@your-vm-ip

# Navigate to project directory
cd referral-_hlp

# Pull latest code
git pull origin main

# Pull updated images from GitHub Container Registry
docker compose pull

# Run any new migrations
docker compose run --rm backend alembic upgrade head

# Restart services with new images
docker compose up -d

# View logs to verify
docker compose logs -f
```

**Automated deployment option**: Add this to GitHub Actions to auto-deploy on push:
```yaml
- name: Deploy to Azure VM
  uses: appleboy/ssh-action@master
  with:
    host: ${{ secrets.AZURE_VM_IP }}
    username: ${{ secrets.AZURE_VM_USER }}
    key: ${{ secrets.AZURE_VM_SSH_KEY }}
    script: |
      cd referral-_hlp
      git pull origin main
      docker compose pull
      docker compose run --rm backend alembic upgrade head
      docker compose up -d
```

### Database Backup Strategy

**Automated daily backups**:
```bash
# Create backup script
cat > /home/user/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/user/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
docker exec referral-_hlp-db-1 pg_dump -U user referral_db | gzip > $BACKUP_DIR/referral_db_$DATE.sql.gz
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
EOF

chmod +x /home/user/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/user/backup-db.sh
```

**Restore from backup**:
```bash
gunzip < backup_file.sql.gz | docker exec -i referral-_hlp-db-1 psql -U user referral_db
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
