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
## Developer notes
To apply DB schema changes (must-change password and import tables), run Alembic migrations:

```powershell
Set-Location -Path "C:\Users\Bessar Farac\OneDrive\Documents\HLP\ref_system\backend"
alembic upgrade head
```

To run backend tests (pytest) locally, ensure you have test-dependencies installed (pytest), then run:

```powershell
pip install -r backend/requirements-test.txt
pytest backend/tests
```
## Troubleshooting & Developer Guide

This project runs a FastAPI backend and a Vite/React frontend. Below are common developer workflows and troubleshooting steps.

Environment variables
- `DATABASE_URL`: Database URL (e.g. `postgresql+psycopg2://user:password@db/referral_db` or `sqlite:///dev.db`)
- `CORS_ORIGINS`: Comma-separated list of allowed origins (e.g. `https://hlp.bessar.work`). Default: `*` for development.

Start services (Docker compose)
-------------------------------
Use Docker Compose to run the whole stack (recommended for development):

```powershell
# Build images and bring up backend + frontend
docker compose build --pull --no-cache backend frontend
docker compose up -d --no-deps --build backend frontend
```

Run migrations with Docker
-------------------------
When running migrations against Postgres in Docker, run the `alembic` command inside the backend container so that it can connect to the database and use the correct runtime environment:

```powershell
docker compose run --rm --entrypoint sh backend -c "cd /app/backend && alembic upgrade head"
```

If you run `alembic` from your host environment and it fails with `ModuleNotFoundError: No module named 'psycopg2'`, install the driver or switch to sqlite for dev:

```powershell
# Option 1 (Postgres)
pip install psycopg2-binary

# Option 2 (sqlite fallback for local dev)
setx DATABASE_URL "sqlite:///dev.db"
alembic upgrade head
```

Alembic revision ID length troubleshooting
------------------------------------------
When Alembic updates `alembic_version`, you may encounter an error like "value too long for type character varying(32)". That's caused by a `revision` string longer than 32 characters. To fix:

1. Edit the migration file under `backend/alembic/versions` and set a shorter `revision` value (e.g., `005_import_job`).
2. Ensure `down_revision` remains accurate (e.g., `004_add_raw_case_column`).
3. Re-run `alembic upgrade head`.

CORS header troubleshooting
--------------------------
If the browser shows:
`Access to fetch at 'https://api.bessar.work/api/users' from origin 'https://hlp.bessar.work' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource`, then:

- Check backend logs for errors — CORS headers may not be present if the server crashes on startup due to a 500 error.

UI & Security Changes
---------------------
- 'Notes' type fields are now hidden from the case detail cards but remain visible as the column header 'Notes' in lists and tables. If you rely on 'note' type fields, they can still be accessed via the API if you are an admin.
- Sensitive fields such as `id_card_nu`, `family_card_nu`, and `passport_nu_001` are only visible to admin users. These fields are marked `hidden` in the form metadata and are sanitized from API responses when requested by non-admin users.
- The case view UI now shows the 'Comments' panel directly under the first form section for improved visibility.
- Ensure `CORS_ORIGINS` is set to include your frontend origin. Example in Docker: set `CORS_ORIGINS: "https://hlp.bessar.work"` in your environment or `.env` file.
- For debugging, run:
```bash
curl -i -H "Origin: https://hlp.bessar.work" http://localhost:8000/api/cases
```
You should receive `Access-Control-Allow-Origin: *` or the configured value in `CORS_ORIGINS`.

Important: If your frontend requests are made with the fetch option `credentials: 'include'` (used to send cookies or include credentials), you MUST NOT use a wildcard `*` value for `Access-Control-Allow-Origin`. The response must echo the exact origin. To fix:
- Configure `CORS_ORIGINS` to the list of allowed domains (e.g. `https://hlp.bessar.work`) and do not leave it as the default `*`.
- Alternatively, your backend or reverse proxy may dynamically echo back the request origin when it's an allowed origin. Our server middleware will now echo origin, making the header match the request origin and allowing credentials.

If the client shows "Server import returned: Failed to fetch. Attempting per-row fallback." this most often indicates:
- CORS is not configured for the frontend origin (missing or wrong `CORS_ORIGINS`), or
- The backend is unreachable (down/incorrect URL), or
- Reverse proxy (nginx) does not forward responses or strip headers when returning 5xx errors.

Useful steps to diagnose:
- Check your browser devtools console for the exact error and request/response headers.
- Check backend logs (docker-compose logs backend) for the stack trace or error; if a 500 occurs before FastAPI handles the request, a CORS header might not get added.
- For a quick check against CORS: `curl -i -H "Origin: https://hlp.bessar.work" https://api.bessar.work/api/import -F "file=@my.xlsx"` and observe the response headers.
- If your environment uses nginx, make sure `add_header 'Access-Control-Allow-Origin' 'https://hlp.bessar.work' always;` is set in the server config so error responses include headers, or make sure the app sets these headers itself (the backend has middleware to ensure this on errors).

Database driver and build issues
-------------------------------
Some dependencies require native build tools (e.g. `psycopg2` needs `libpq-dev` for compilation). To avoid build errors:

- On Debian/Ubuntu:
```bash
sudo apt-get update && sudo apt-get install -y libpq-dev build-essential python3-dev
pip install psycopg2-binary
```
- Alternatively, use the Docker compose setup; you won't need these host-level packages.

Running tests
-------------
Install test dependencies and run pytest. Recommended approach is to run tests in the backend container to avoid native build toolchain (Rust/build tools) requirements on the host:

Docker (recommended - avoids host-native builds):
```powershell
Set-Location -Path "C:\Users\Bessar Farac\OneDrive\Documents\HLP\ref_system"
docker compose build --pull --no-cache backend
docker compose run --rm backend pytest -q
```

Host (local) - requires dev toolchain and Python/native deps:
```powershell
python -m venv .venv
.\.venv\Scripts\Activate
pip install -r backend/requirements-test.txt
pytest backend/tests -q
```

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

### Debugging the backend
- View logs:
```powershell
docker compose logs --tail 200 backend
```

- Inspect container shell and run debug commands inside if needed:
```powershell
docker compose run --rm --entrypoint sh backend -c "cd /app/backend && python -m uvicorn backend.api:app --reload --host 0.0.0.0 --port 8000"
```

### Notable fixes & changes (recent)
- Categories:
  - The 'Category' shown in case lists now uses these fields (priority order):
    1. `law_followup5` — External legal guidance
    2. `law_followup4` — External legal referral
    3. `law_followup3` — Internal legal referral
    4. `law_followup1` — Type of legal case
    5. `eng_followup1` — Engineering referral type
  - Server-side cases are now backfilled in the UI to display categories using the above priority order.
- Import errors & logging:
  - The import flow has improved error handling and more detailed console logs; when a server import fails, the UI provides a less alarming message and attempts per-row fallback automatically.
  
Import debugging & troubleshooting
---------------------------------
If you see a client message like "Server import failed; will attempt per-row create or fallback to local import.", it means:
- The client attempted to POST the XLSX to `/api/import` but the server returned a non-2xx HTTP response (e.g. 401/403/413/500), so the frontend attempted per-row creates or a local-only import.

Steps to diagnose an import error:
1. Check the browser console for the import stack trace and a logged object. The client logs include a structured object with: `status`, `body`, and `message`. This will indicate whether the response is a 401/403/413 and may also contain server-side details.
2. Tail backend logs for errors during import:

```powershell
docker compose logs --follow backend
```

3. Consult the import job records in the backend (if created):

- List jobs: GET http://localhost:8000/api/import/jobs
- Inspect details: GET http://localhost:8000/api/import/jobs/{job_id}
- Retry: POST http://localhost:8000/api/import/jobs/{job_id}/retry

Use curl or PowerShell's `Invoke-RestMethod` to inspect job rows and errors (replace {job_id}):

```powershell
# Example: query a job id
Invoke-RestMethod -Uri "http://localhost:8000/api/import/jobs/{job_id}" -Method Get -ContentType "application/json" -Headers @{ Authorization = "Bearer $token" }
```

4. Re-run per-row retries for failed rows using the `POST /api/import/jobs/{job_id}/retry` endpoint — this will attempt to create cases for each failed row and mark their status as `success` or `failed`.

5. If the server returns 401/403 — check your session token and server-side auth; confirm the logged-in user is allowed to import or reattempt rows.

6. If the server returns 413 — file too large — reduce XLSX size or change server config.

7. If the server returned 500 with stack trace: review backend logs and the full stack trace to identify the cause (e.g. missing table, schema mismatch). Re-run migrations if necessary.

Quick import test via PowerShell (PowerShell example using `Invoke-RestMethod`):

```powershell
$token = (Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/auth/login -Body (@{username='admin'; password='admin123'} | ConvertTo-Json) -ContentType 'application/json').token
Invoke-RestMethod -Uri http://localhost:8000/api/import -Method Post -Headers @{ Authorization = "Bearer $token" } -Form @{ file = Get-Item "C:\path\to\tmp_import_test.xlsx" }
```

Client-side fallback explanation
--------------------------------
- The UI attempts to import the entire file as a single job by calling `/api/import` for efficiency and to capture server-side row processing.
- If the server fails for the file, the UI attempts to create each row individually (one API call per row). This fallback is attempted only if the client is authenticated and has permission.
- If per-row creation fails (e.g., due to auth or server errors), the UI will import data to local state only (so it is visible to the current user in the app), and the user will see a helpful message telling them how to proceed. The UI will also mark `serverImportSummary` and `failedRows` in the dataset record.

Developer: where to look in code
--------------------------------
- Frontend import & fallback logic: `frontend/src/context/CasesContext.jsx` — `importDataset` function implements server import, per-row create fallback, and local fallback.
- Server import endpoints and models: `backend/api.py` — `/import`, `/import/jobs/*`, `ImportJob`/`ImportRow` models in `backend/models.py`.
- HTTP client: `frontend/src/api/http.js` — handles forming `FormData` and error parsing.

How to verify categories and mapping
-----------------------------------
- Category priority is checked in this order (first non-empty wins): `law_followup5`, `law_followup4`, `law_followup3`, `law_followup1`, then `eng_followup1`.
- To verify manually, create a test case via the API and populate `raw` with the fields in question; then verify that the UI reflects the expected category.

Example (quick API test):
```powershell
#$token => your admin token
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/cases -Headers @{ Authorization = "Bearer $token" } -Body (@{
  title = 'Category Test Case';
  description = 'Testing category field mapping';
  raw = @{ law_followup5 = 'External Guidance A'; law_followup4 = 'External Referral A'; law_followup3 = 'Internal Referral A'; law_followup1 = 'Type A'; eng_followup1 = 'Engineering A' }
} | ConvertTo-Json) -ContentType 'application/json'
```

Then visit the Case List or Search UI and confirm the category display.

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

### Default admin seeding
The backend will auto-create a default admin user at startup when no users exist in the database. Set these environment variables to override the defaults before starting the backend service in production or development:

- `INITIAL_ADMIN_USERNAME` (default: admin)
- `INITIAL_ADMIN_PASSWORD` (default: admin123)
- `INITIAL_ADMIN_EMAIL` (default: admin@example.com)

Example (Linux / macOS):
```bash
export INITIAL_ADMIN_USERNAME=admin
export INITIAL_ADMIN_PASSWORD=secret
export INITIAL_ADMIN_EMAIL=admin@example.com
docker compose up -d --build backend
```

If you prefer the backend to run migrations automatically on container startup, set the `RUN_MIGRATIONS` env var to `true` (useful for dev/test environments):

```bash
RUN_MIGRATIONS=true docker compose up -d --build backend
```

You can also run migrations explicitly using:

```bash
docker compose run --rm backend alembic upgrade head
```

Verify the migrations were applied and that the `users` table now exists:

```bash
docker compose exec db psql -U ${POSTGRES_USER:-user} -d ${POSTGRES_DB:-referral_db} -c "select tablename from pg_tables where tablename='users';"

If you encounter the error "No config file 'alembic.ini' found" while running alembic from the host, try running the command inside the backend working directory inside the container:

```bash
docker compose run --rm backend sh -lc "cd backend && alembic upgrade head"
```
```

If `users` is listed, restart the backend so the startup seed runs and creates the admin user if the table was empty:

```bash
docker compose up -d --no-deps --build backend
```

### Verify seeding and login (quick checks)
- Check the backend startup logs for a seeding message. After starting the backend, run:

```bash
docker compose logs backend --tail=200 | grep "created default admin user"
```

- If the seeding did not occur or you prefer to manually register a user, the registration endpoint requires `username`, `email`, and `password` JSON fields. Example `curl` to register an account:

```bash
curl -v -X POST -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@example.com","password":"admin123"}' \
  http://127.0.0.1:8000/api/auth/register
```

- To login (get token), use the following `curl` against the login endpoint (POST) and this should return a token JSON on success:

```bash
curl -v -X POST -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  http://127.0.0.1:8000/api/auth/login
```

- If the `curl` login succeeds but the UI still cannot log in, this is often due to the Content Security Policy blocking requests; proceed below.


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

Note: When upgrading the server (pulling new commits that modify the DB schema, e.g. adding a `raw` column to cases), follow these safe update steps to avoid data loss:

1. Backup DB (Postgres example):
```powershell
# On the VM or host, run pg_dump
pg_dump -U <dbuser> -h <dbhost> -p <port> -d <dbname> -F c -b -v -f backup_before_migration.dump
```
2. Pull changes and apply migrations:
```powershell
git pull origin main
cd frontend
npm run build # if serving static assets from /frontend/dist
cd ..
docker compose build --pull --no-cache backend frontend
docker compose run --rm backend alembic upgrade head
docker compose up -d --no-deps --build backend frontend
```
3. Verify results:
```powershell
docker compose logs backend --tail 100
curl -s -X GET http://localhost:8000/api/cases | jq '.[0]' # verify raw payload exists in created cases
```

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

    # IMPORTANT: Update this Content Security Policy to allow connections to your API host and inline styles if required
    # The sample below adds the API host and allows inline styles to support libraries like Ant Design.
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.bessar.work http://localhost:8000; frame-ancestors 'none';";
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

## Updating without losing data
To pull the latest code and update the containers on your VM without destroying the database volume or losing data:

1. Pull updates from the repo:
```bash
cd /home/bessarf/referral-_hlp
git pull origin main
```

2. (Optional) Backup your DB before updating:
```bash
docker compose exec db pg_dump -U ${POSTGRES_USER:-user} -d ${POSTGRES_DB:-referral_db} > ~/referral_db_backup.sql
```

3. Rebuild and restart services (do not use `down -v`):
```bash
sudo docker compose build --pull --no-cache
sudo docker compose up -d --no-deps --build backend frontend
```

4. Run the migrations (if any):
```bash
sudo docker compose run --rm backend alembic upgrade head
```

5. Tail logs and confirm services are healthy:
```bash
sudo docker compose logs backend --tail=200 -f
sudo docker compose logs frontend --tail=200 -f
```

Important: Avoid running `docker compose down -v` or pruning volumes unless you intend to reset the DB. Always backup the DB first if you're concerned about losing production data.

## Verifying cases and assignment features after update
After pulling changes, rebuilding and restarting the backend and frontend containers, follow these checks:

1. Verify server-side cases are returned by the API:
```bash
curl -s http://127.0.0.1:8000/api/cases | jq '.'
```

2. Upload an XLSX file using the frontend UI (Data -> Upload XLSX). The upload will now call the backend and persist cases; the UI will refresh after import.

3. Confirm the cases persist after a page refresh:
 - Visit the Cases list (UI) and confirm the newly uploaded cases are still present.
 - Or repeat `curl` to `/api/cases` to ensure server records exist.

4. Confirm assignment works and users are visible in the Assign dropdown:
 - Ensure you are logged-in (admin or internal role) and open Assignment or Case Details.
 - The Assign dropdown now pulls users and abilities from the backend (`/api/users` and `/api/abilities`).
 - Save an assignment; it should persist and show in the Case details and backend.

5. If assignment does not persist or users are still missing:
 - Check `docker compose logs backend` for errors.
 - Confirm `/api/users` returns a list and `/api/abilities` returns the unique abilities.


### Confirm the CSP header
After updating and reloading host nginx, verify the `Content-Security-Policy` returned by the site. This helps detect conflicting headers coming from the frontend container and the host proxy.

```bash
curl -I https://hlp.bessar.work | grep -i content-security-policy
```

- If the header is not present or appears more restrictive than your `deploy/nginx/hlp.bessar.work.conf`, check other active site files in `/etc/nginx/sites-enabled` or any Caddy site that may be running. Remember that multiple CSP headers are combined (the browser enforces the intersection), so **both** host and container CSP headers must permit the desired actions.

### Important: Align container CSP with the host
- The frontend container (`frontend/nginx.conf`) includes a default CSP. If your host proxy adds a CSP header, the browser applies the intersection; if the container's header is more restrictive, it will still block inline styles and API connections even if the host permits them.
- The repo includes a sample host nginx config (`deploy/nginx/hlp.bessar.work.conf`) with a permissive policy and the container `frontend/nginx.conf` is aligned with the host; ensure both are installed on your host and then reload the proxy.

### Troubleshooting: If UI shows style or API blocked
1. Confirm both the host and container CSP headers allow `style-src 'unsafe-inline'` (or implement nonces/hashes). Example:

```bash
curl -I http://127.0.0.1:8080 | grep -i content-security-policy # checks the frontend container's header
curl -I https://hlp.bessar.work | grep -i content-security-policy # checks the host proxy header
```

2. If any header doesn't include the required rules, update the host or container config accordingly and reload the service:

```bash
# Host nginx (on the VM)
sudo nginx -t
sudo systemctl reload nginx

# Frontend container - restart docker-compose
docker compose up -d --no-deps --build frontend
```

3. Check the browser console and network panel to confirm there are no CSP violations and that the frontend can successfully call your API endpoints.
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

### Systemd: make the stack start on boot
This project includes a systemd service to ensure the Docker Compose stack starts automatically when the VM starts.
To install the service run:
```bash
# Copy service file and enable it (run as root)
sudo cp deploy/referral.service /etc/systemd/system/referral.service
sudo systemctl daemon-reload
sudo systemctl enable referral.service
sudo systemctl start referral.service
sudo systemctl status referral.service
```
Or run the helper script in the repo (run as root):
```bash
sudo bash deploy/install-referral-service.sh
```

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
