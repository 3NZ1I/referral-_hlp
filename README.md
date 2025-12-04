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
## Frontend Deployment (React/Vite)

### Node.js Version
Recommended: Node.js v20.19.0 or newer (required by some dependencies)
Check your version:
```bash
node -v
```
If you need to upgrade:
```bash
sudo apt update
sudo apt install nodejs npm
# Or use nvm for version management
```

### Install Dependencies
```bash
cd frontend
npm install
```

### Vite Config for External Access
Edit `frontend/vite.config.js` and add:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['html2canvas', 'jspdf']
  },
  build: {
    commonjsOptions: {
      include: [/html2canvas/, /jspdf/, /node_modules/]
    }
  },
  preview: {
    allowedHosts: ['hlp.bessar.work']
  }
})
```

### Build Frontend
```bash
npm run build
```

### Development/Preview Mode
To serve the frontend for development:
```bash
npm run preview -- --port 3000
```
If you see "Blocked request. This host ('hlp.bessar.work') is not allowed", ensure `allowedHosts` is set as above.

### Production: Serve Built Files
For production, serve the built files from `frontend/dist` using Caddy:
Example Caddyfile block:
```
hlp.bessar.work {
  root * /path/to/frontend/dist
  file_server
  header {
    Content-Security-Policy "default-src 'self'; connect-src 'self' https://api.bessar.work; frame-ancestors 'none';"
    X-Frame-Options "DENY"
    X-Content-Type-Options "nosniff"
    Referrer-Policy "strict-origin-when-cross-origin"
    Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
  }
}
```
Replace `/path/to/frontend/dist` with the actual path to your built frontend.


### Production: Serve Built Files (Static File Server)
After running `npm run build`, serve the built files from `frontend/dist` using Caddy or nginx.

#### Caddyfile Example (Static Serving)
```
hlp.bessar.work {
  root * /home/bessarf/referral-_hlp/frontend/dist
  file_server
  # ...headers and reverse_proxy config...
}
```
**Important:** Use the absolute path for the `root` directive. Relative paths may not work when Caddy runs as a service.

#### Permissions Fix for Static Files
If you get a 403 error, ensure all parent directories are world-readable and executable:
```bash
sudo chmod 755 /home/bessarf
```
Set ownership and permissions for the build output:
```bash
sudo chown -R caddy:caddy /home/bessarf/referral-_hlp/frontend/dist
sudo chmod -R 755 /home/bessarf/referral-_hlp/frontend/dist
```
Replace `caddy:caddy` with your Caddy service user if different.

Reload Caddy after changes:
```bash
sudo systemctl reload caddy
```

#### nginx Example (Static Serving)
```
server {
    listen 80;
    server_name hlp.bessar.work;
    root /home/bessarf/referral-_hlp/frontend/dist;
    location / {
        try_files $uri $uri/ /index.html;
    }
    # Add headers as needed
}
```

### Development/Preview: Proxy All Requests
For development, run the Vite preview server:
```bash
npm run preview -- --port 3000
```
Update your Caddyfile to proxy all requests to the preview server:
```
hlp.bessar.work {
  reverse_proxy localhost:3000
  header {
    # ...security headers...
  }
}
```
This ensures all requests, including assets (e.g. `/assets/...`), are proxied correctly.

### Asset Troubleshooting
Open browser dev tools (F12) and check the Network tab.
  - If CSS/JS files return 404 errors:
    - For production, verify the static file server is serving the correct `dist/` directory.
    - For development, ensure the preview server is running and Caddy is proxying all requests.
    - Asset URLs should be `/assets/...` for Vite builds.
    - If using nginx, ensure `try_files $uri $uri/ /index.html;` is set for SPA routing.

### Summary Checklist
Build frontend: `npm run build`
For production: Serve `dist/` with Caddy or nginx
For development: Run preview server and proxy with Caddy
Check browser dev tools for asset errors

### Troubleshooting UI/Asset Issues
- If the UI is broken or missing styles/assets:
  - Make sure you are serving the built files (`dist/`) in production.
  - Check browser dev tools for 404 errors on CSS/JS files.
  - For development, ensure the preview server is running and Caddy is proxying all requests to it.
- If you see Node.js engine warnings, upgrade Node.js as above.

### Security: XLSX library
- The project uses `xlsx` (SheetJS) to parse spreadsheet uploads. As of this documentation, there are known vulnerabilities (Prototype Pollution, ReDoS) in certain versions of `xlsx`. If you accept files from untrusted sources, consider sandboxing the upload processor, scanning files, or using an alternative parser.


## Backend Startup
- Start backend (API) on port 8000

## DNS Setup
- Ensure your domain's A/AAAA records point to your VM's public IP.
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

## Production Deployment with nginx

### 1. Install nginx
```bash
sudo apt update
sudo apt install nginx
```

### 2. Build Frontend
```bash
cd frontend
npm install
npm run build
```

### 3. Configure nginx
Edit or replace `/etc/nginx/sites-available/hlp.bessar.work` with:
```nginx
server {
    listen 80;
    server_name hlp.bessar.work;
    root /home/bessarf/referral-_hlp/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    add_header Content-Security-Policy "default-src 'self'; connect-src 'self' http://localhost:8000; frame-ancestors 'none';";
    add_header X-Frame-Options "DENY";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
}
```

### 4. Enable the site
```bash
sudo ln -sf /etc/nginx/sites-available/hlp.bessar.work /etc/nginx/sites-enabled/hlp.bessar.work
sudo rm /etc/nginx/sites-enabled/default
```
If you previously used Caddy, stop and disable Caddy before starting nginx:
```bash
sudo systemctl stop caddy
sudo systemctl disable caddy
```

### 5. Set permissions for static files
```bash
sudo chown -R www-data:www-data /home/bessarf/referral-_hlp/frontend/dist
sudo chmod -R 755 /home/bessarf/referral-_hlp/frontend/dist
sudo chmod 755 /home/bessarf/referral-_hlp
sudo chmod 755 /home/bessarf
```

### 6. Test nginx config
```bash
sudo nginx -t
```

### 7. Restart nginx
```bash
sudo systemctl restart nginx
sudo systemctl status nginx
```

### 8. Open firewall for HTTP (if needed)
```bash
sudo ufw allow 80/tcp
sudo ufw reload
```

### 9. Troubleshooting
- If nginx fails to start, check for port conflicts:
  ```bash
  sudo lsof -i :80
  ```
- Stop other web servers (Caddy, Apache) if needed:
  ```bash
  sudo systemctl stop caddy
  sudo systemctl stop apache2
  ```
- Check logs:
  ```bash
  sudo journalctl -xeu nginx.service
  ```
- Test locally:
  ```bash
  curl -I http://localhost
  curl -I http://hlp.bessar.work
  ```
- Check DNS: `ping hlp.bessar.work` from your local machine. IP should match your server's public IP.

### 10. HTTPS (Optional)
Use Certbot for free SSL:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d hlp.bessar.work
```

### 11. Checklist
- [ ] nginx running and serving frontend
- [ ] API proxy working
- [ ] Static files load (no 404s)
- [ ] Permissions correct
- [ ] Firewall open
- [ ] DNS points to server
- [ ] HTTPS enabled (optional)

**Note:** Pre-built images are hosted on Docker Hub to avoid DNS resolution issues during build.

### Database Backup Strategy

## CI / CD

We provide two GitHub Actions workflows under `.github/workflows/`:

- `ci.yml` — runs on push / pull_request to `main`; it builds backend requirements and runs lint/compile, and builds frontend with `npm run build` to validate the UI build.
- `publish.yml` — runs on push to `main` to build and push Docker images for `frontend` and `backend` to a Docker registry (Docker Hub by default).

To publish images, configure the following GitHub Repository secrets (Settings → Secrets):
- `DOCKERHUB_USERNAME` — your Docker Hub username.
- `DOCKERHUB_TOKEN` — your Docker Hub access token or password.
- `VITE_API_URL` (optional) — embed API url into built frontend image.

Note: The `publish.yml` workflow will now build images for verification even if the above Docker Hub secrets are not set, but actual pushing to Docker Hub will be skipped unless `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` are configured. This avoids failing CI on repository forks or when secrets are not available.

Quick CI commands to test locally:
```bash
# Backend
cd backend
python -m pip install -r requirements.txt
python -m compileall backend

# Frontend
cd ../frontend
npm ci --legacy-peer-deps
npm run build
```

### Local pre-commit setup

Install `pre-commit` and set up hooks locally to enforce code quality before you commit changes.

```bash
# Install Python dev dependencies (including pre-commit)
cd backend
python -m pip install -r requirements.txt

# Install node dependencies for frontend (only once)
cd ../frontend
npm ci --legacy-peer-deps

# Install pre-commit hooks (run at repo root)
cd ..
pre-commit install

# Run pre-commit on all files (optional) to format + lint everything
pre-commit run --all-files
```

Note: the repo's `.pre-commit-config.yaml` includes a local hook for frontend ESLint which will execute `npm ci` prior to running `npm run lint`; this ensures linting runs but may do npm installs on the commit hook's execution. If you want to avoid this, pre-install Node modules and update the hook's entry accordingly.



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

You can also use the provided script:
```bash
./scripts/healthcheck.sh # default checks: api-> localhost:8000/api/health, frontend-> localhost:8080/health
``` 

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

## Docker and Networking Notes
- When using `docker compose` to run the full stack, services are connected by a shared docker network and your Nginx inside a `frontend` container should proxy to `http://backend:8000` since that's the service name inside the compose network.
- The `frontend` container exposes port 80 internally; on the host it is mapped using `docker-compose.yml` to the value `8080:80`. Adjust this mapping if you already have Nginx running on host or want to run without host Nginx.
- If running host Nginx, prefer disabling `frontend`'s internal Nginx or use a reverse proxy on the host to the `frontend` container.

```bash
# Check current migration version
docker compose run --rm backend alembic current

# Force to specific version
docker compose run --rm backend alembic stamp head
```

## License

Proprietary - HLP Referral System
