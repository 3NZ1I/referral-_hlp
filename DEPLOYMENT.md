# HLP Referral System - Production Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Deployment Steps](#detailed-deployment-steps)
4. [SSL/TLS Setup](#ssltls-setup)
5. [Common Issues & Solutions](#common-issues--solutions)
6. [Maintenance & Operations](#maintenance--operations)
7. [Security Best Practices](#security-best-practices)

---

## Prerequisites

### System Requirements
- **OS**: Ubuntu 22.04+ or similar Linux distribution
- **RAM**: Minimum 1GB (2GB recommended for production)
- **CPU**: 1 vCPU minimum
- **Storage**: 20GB minimum
- **Network Ports**: 80, 443, 8000, 8080, 5432

### Required Software
- Docker Engine 20.10+
- Docker Compose V2
- Git
- Nginx (for reverse proxy)
- Certbot (for SSL/TLS certificates)
- OpenSSL (for generating secrets)

---

## Quick Start

**For a fresh Azure/Ubuntu VM, follow these commands:**

```bash
# 1. Clone repository
git clone https://github.com/3NZ1I/referral-_hlp.git
cd referral-_hlp

# 2. Pull pre-built Docker images
sudo docker pull bessarf/referral-hlp-frontend:latest
sudo docker pull bessarf/referral-hlp-backend:latest

# 3. Tag images locally (workaround for docker-compose issue)
sudo docker tag bessarf/referral-hlp-frontend:latest referral-hlp-frontend:latest
sudo docker tag bessarf/referral-hlp-backend:latest referral-hlp-backend:latest

# 4. Start all services
sudo docker compose up -d

# 5. Verify deployment
sudo docker compose ps
# All services should show "healthy" status
```

---

## Detailed Deployment Steps

### Step 1: Install Docker & Docker Compose

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker using official script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group (optional - avoids using sudo)
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose V2 plugin
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version          # Should show Docker 20.10+
docker compose version    # Should show Docker Compose v2.x
```

### Step 2: Configure System DNS

**⚠️ CRITICAL:** Azure VMs often have DNS resolution issues inside Docker containers. Fix this before building or deploying:

```bash
# Configure systemd-resolved for reliable DNS
sudo mkdir -p /etc/systemd/resolved.conf.d/
sudo tee /etc/systemd/resolved.conf.d/dns_servers.conf > /dev/null <<'EOF'
[Resolve]
DNS=8.8.8.8 8.8.4.4
FallbackDNS=1.1.1.1 1.0.0.1
DNSStubListener=yes
EOF

# Restart DNS resolver
sudo systemctl restart systemd-resolved

# Verify DNS resolution works
nslookup registry.npmjs.org
# Should return IP addresses, not errors
```

### Step 3: Configure Docker DNS

```bash
# Create Docker daemon configuration
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
  "dns": ["8.8.8.8", "8.8.4.4", "1.1.1.1"]
}
EOF

# Restart Docker to apply changes
sudo systemctl restart docker

# Test DNS resolution inside container
sudo docker run --rm alpine nslookup registry.npmjs.org
# Should succeed without EAI_AGAIN errors
```

### Step 4: Clone Repository

```bash
cd ~
git clone https://github.com/3NZ1I/referral-_hlp.git
cd referral-_hlp
```

### Step 5: Deploy Application

**Option A: Using Pre-built Images (⭐ RECOMMENDED)**

This avoids DNS and build issues entirely:

```bash
# Pull pre-built images from Docker Hub
sudo docker pull bessarf/referral-hlp-frontend:latest
sudo docker pull bessarf/referral-hlp-backend:latest

# Tag images locally (workaround for docker-compose parsing bug)
sudo docker tag bessarf/referral-hlp-frontend:latest referral-hlp-frontend:latest
sudo docker tag bessarf/referral-hlp-backend:latest referral-hlp-backend:latest

# Start all services
sudo docker compose up -d

# Wait 30 seconds for health checks
sleep 30

# Verify all containers are healthy
sudo docker compose ps
```

**Expected Output:**
```
NAME                       STATUS         PORTS
referral-_hlp-backend-1    Up (healthy)   0.0.0.0:8000->8000/tcp
referral-_hlp-db-1         Up (healthy)   5432/tcp
referral-_hlp-frontend-1   Up (healthy)   0.0.0.0:8080->80/tcp
```

**Option B: Building Locally (Fallback)**

If you must build on the VM and have DNS configured:

```bash
# Build with host network to bypass container DNS issues
sudo docker build --network=host \
  --build-arg VITE_API_URL=https://api.bessar.work \
  -t referral-hlp-frontend:latest \
  ./frontend

sudo docker build --network=host \
  -t referral-hlp-backend:latest \
  ./backend

# Start services
sudo docker compose up -d
```

### Step 6: Verify Deployment

```bash
# Check container status
sudo docker compose ps

# Test backend API health
curl http://localhost:8000/api/health
# Expected: {"status":"ok"}

# Test frontend
curl -I http://localhost:8080
# Expected: HTTP/1.1 200 OK

# View logs (if needed)
sudo docker compose logs backend
sudo docker compose logs frontend
sudo docker compose logs db
```

---

## SSL/TLS Setup

### Install Certbot

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

### Obtain SSL Certificates

**⚠️ IMPORTANT:** Stop any service using port 80 before running certbot:

```bash
# Stop nginx if already running
sudo systemctl stop nginx 2>/dev/null || true

# Obtain Let's Encrypt certificate
sudo certbot certonly --standalone \
  -d hlp.bessar.work \
  -d api.bessar.work \
  --non-interactive \
  --agree-tos \
  --email your-email@example.com

# Certificates saved to:
# /etc/letsencrypt/live/hlp.bessar.work/fullchain.pem
# /etc/letsencrypt/live/hlp.bessar.work/privkey.pem
# Valid for 90 days, auto-renewal configured
```

### Configure Nginx Reverse Proxy

```bash
# Install nginx
sudo apt install nginx -y

# Create nginx configuration
sudo tee /etc/nginx/sites-available/referral-system > /dev/null <<'EOF'
# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name hlp.bessar.work api.bessar.work;
    return 301 https://$server_name$request_uri;
}

# Frontend HTTPS (hlp.bessar.work)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name hlp.bessar.work;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/hlp.bessar.work/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hlp.bessar.work/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Proxy to frontend container
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Backend API HTTPS (api.bessar.work)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.bessar.work;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/hlp.bessar.work/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hlp.bessar.work/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Proxy to backend container
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site configuration
sudo ln -sf /etc/nginx/sites-available/referral-system /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t
# Expected: "syntax is ok" and "test is successful"

# Start and enable nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Verify HTTPS Access

```bash
# Test frontend HTTPS
curl -v https://hlp.bessar.work
# Should show TLS 1.3 handshake and HTML response

# Test backend API HTTPS
curl -v https://api.bessar.work/api/health
# Should return {"status":"ok"} with valid SSL

# Check certificate details
sudo certbot certificates
```

---

## Common Issues & Solutions

### Issue 1: `vite: not found` During Docker Build

**Symptoms:**
```
#12 179.5 sh: vite: not found
#12 179.5 npm error Lifecycle script `build` failed with error:
#12 179.5 npm error Error: command failed
```

**Root Cause:**
- `package-lock.json` out of sync with `package.json`
- npm ci skipping vite installation even though it's listed as devDependency

**Solutions (in order of preference):**

1. **Use pre-built images** (BEST):
   ```bash
   sudo docker pull bessarf/referral-hlp-frontend:latest
   sudo docker tag bessarf/referral-hlp-frontend:latest referral-hlp-frontend:latest
   ```

2. **Regenerate package-lock.json locally**:
   ```bash
   cd frontend
   rm package-lock.json
   npm install
   git add package-lock.json
   git commit -m "Regenerate package-lock.json"
   git push
   ```

3. **Build with host network**:
   ```bash
   sudo docker build --network=host -t referral-hlp-frontend:latest ./frontend
   ```

---

### Issue 2: DNS Resolution Failures (`EAI_AGAIN`)

**Symptoms:**
```
npm http fetch GET https://registry.npmjs.org/vite/-/vite-5.4.21.tgz attempt 1 failed with EAI_AGAIN
npm http fetch GET https://registry.npmjs.org/vite/-/vite-5.4.21.tgz attempt 2 failed with EAI_AGAIN
```

**Root Cause:**
- Azure Network Security Groups blocking outbound DNS from containers
- Docker using VM's DNS servers which may be unreliable

**Solution:**

```bash
# 1. Configure system DNS (see Step 2)
sudo tee /etc/systemd/resolved.conf.d/dns_servers.conf > /dev/null <<'EOF'
[Resolve]
DNS=8.8.8.8 8.8.4.4
FallbackDNS=1.1.1.1 1.0.0.1
EOF
sudo systemctl restart systemd-resolved

# 2. Configure Docker DNS (see Step 3)
sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
  "dns": ["8.8.8.8", "8.8.4.4", "1.1.1.1"]
}
EOF
sudo systemctl restart docker

# 3. Test DNS works
sudo docker run --rm alpine nslookup registry.npmjs.org

# If still fails, use pre-built images instead of building
```

---

### Issue 3: docker-compose Strips Image Prefix

**Symptoms:**
```
Error response from daemon: pull access denied for referral-hlp-frontend, repository does not exist
```
Even though `docker-compose.yml` clearly shows `bessarf/referral-hlp-frontend:latest`

**Root Cause:**
Docker Compose V2 caching or parsing quirk

**Solution:**

```bash
# Pull and tag images manually
sudo docker pull bessarf/referral-hlp-frontend:latest
sudo docker pull bessarf/referral-hlp-backend:latest

sudo docker tag bessarf/referral-hlp-frontend:latest referral-hlp-frontend:latest
sudo docker tag bessarf/referral-hlp-backend:latest referral-hlp-backend:latest

# Then start
sudo docker compose up -d
```

---

### Issue 4: Port 80 Already in Use (Certbot)

**Symptoms:**
```
Problem binding to port 80: Could not bind to IPv4 or IPv6.
```

**Solution:**

```bash
# Find what's using port 80
sudo lsof -i :80

# Stop the conflicting service
sudo systemctl stop nginx
# OR
sudo docker stop <container-id>

# Retry certbot
sudo certbot certonly --standalone -d hlp.bessar.work -d api.bessar.work

# After certbot succeeds, start nginx
sudo systemctl start nginx
```

---

### Issue 5: ERR_CONNECTION_REFUSED on Domain

**Symptoms:**
- `https://hlp.bessar.work` shows "This site can't be reached"
- DNS resolves to correct IP
- Containers are running

**Root Causes & Solutions:**

```bash
# 1. Check if nginx is running
sudo systemctl status nginx
# If not running: sudo systemctl start nginx

# 2. Check if nginx is listening on ports
sudo netstat -tlnp | grep -E ":80|:443"
# Should show nginx on 0.0.0.0:80 and 0.0.0.0:443

# 3. Verify DNS points to your VM
nslookup hlp.bessar.work
# Should return your VM's public IP

# 4. Check Azure NSG rules
# In Azure Portal → VM → Networking → Inbound rules
# Ensure TCP 80 and 443 allowed from Internet

# 5. Test locally first
curl http://localhost:8080   # Frontend
curl http://localhost:8000/api/health  # Backend

# 6. Check nginx config
sudo nginx -t
# Fix any errors shown

# 7. View nginx logs
sudo tail -f /var/log/nginx/error.log
```

---

### Issue 6: Permission Denied (Docker Socket)

**Symptoms:**
```
permission denied while trying to connect to the Docker daemon socket
```

**Solutions:**

**Option 1 - Use sudo (Quick fix):**
```bash
sudo docker compose up -d
```

**Option 2 - Add user to docker group (Permanent):**
```bash
sudo usermod -aG docker $USER
newgrp docker
docker compose up -d
```

---

### Issue 7: Container Not Healthy

**Symptoms:**
```
referral-_hlp-backend-1    Up (unhealthy)
```

**Diagnosis:**

```bash
# Check container logs
sudo docker compose logs backend

# Common issues:
# - Database not ready → wait 30 seconds
# - Environment variables missing → check .env file
# - Port already in use → stop conflicting service

# Check health check endpoint manually
sudo docker exec referral-_hlp-backend-1 curl http://localhost:8000/api/health
```

---

### Issue 8: Database Data Lost After Restart

**Root Cause:**
Ran `docker compose down -v` which deletes volumes

**Prevention:**

```bash
# ✅ SAFE - Stops containers, keeps data
sudo docker compose down

# ❌ DANGER - Deletes all data including database
sudo docker compose down -v
```

**Recovery:**

```bash
# Restore from backup (if available)
cat backup_20251204.sql | sudo docker exec -i referral-_hlp-db-1 psql -U user referral_db

# Or start fresh with empty database
sudo docker compose run --rm backend alembic upgrade head
```

---

### Issue 9: Build Cache Causing Stale Code

**Symptoms:**
- Changes not reflected after rebuild
- Old errors persist

**Solution:**

```bash
# Clean everything
sudo docker compose down
sudo docker system prune -a -f

# Rebuild fresh
sudo docker compose up -d --build

# Or use pre-built images
sudo docker pull bessarf/referral-hlp-frontend:latest
sudo docker pull bessarf/referral-hlp-backend:latest
```

---

## Maintenance & Operations

### View Logs

```bash
# All services (follow mode)
sudo docker compose logs -f

# Specific service
sudo docker compose logs -f backend
sudo docker compose logs -f frontend
sudo docker compose logs -f db

# Last 100 lines
sudo docker compose logs --tail=100 backend
```

### Restart Services

```bash
# All services
sudo docker compose restart

# Specific service
sudo docker compose restart backend

# Full reload (stops and starts)
sudo docker compose down
sudo docker compose up -d
```

### Update Application

```bash
cd ~/referral-_hlp

# Pull latest code
git pull origin main

# Pull latest Docker images
sudo docker pull bessarf/referral-hlp-frontend:latest
sudo docker pull bessarf/referral-hlp-backend:latest

# Tag locally
sudo docker tag bessarf/referral-hlp-frontend:latest referral-hlp-frontend:latest
sudo docker tag bessarf/referral-hlp-backend:latest referral-hlp-backend:latest

# Restart with new images
sudo docker compose up -d
```

### Database Backup

```bash
# Manual backup
sudo docker exec referral-_hlp-db-1 pg_dump -U user referral_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated daily backup (2 AM)
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
(crontab -l 2>/dev/null; echo "0 2 * * * $HOME/backup-db.sh") | crontab -
```

### Database Restore

```bash
# From uncompressed backup
cat backup_20251204.sql | sudo docker exec -i referral-_hlp-db-1 psql -U user referral_db

# From gzipped backup
zcat backup_20251204.sql.gz | sudo docker exec -i referral-_hlp-db-1 psql -U user referral_db
```

### SSL Certificate Renewal

Certbot automatically renews certificates. To manually renew:

```bash
# Check certificate expiry
sudo certbot certificates

# Manual renewal (if needed)
sudo certbot renew

# Reload nginx to use new cert
sudo systemctl reload nginx

# Test auto-renewal (dry run)
sudo certbot renew --dry-run
```

### Monitor Resources

```bash
# Container resource usage
sudo docker stats

# Disk usage
sudo docker system df

# Clean up unused resources
sudo docker system prune -a
```

---

## Security Best Practices

### 1. Change Default Secrets

```bash
# Generate secure secret
openssl rand -hex 32

# Update docker-compose.yml or .env:
JWT_SECRET=<generated-secret-here>
POSTGRES_PASSWORD=<strong-password-here>
```

### 2. Enable Firewall

```bash
sudo ufw enable
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw status
```

### 3. Regular Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
cd ~/referral-_hlp
sudo docker pull bessarf/referral-hlp-frontend:latest
sudo docker pull bessarf/referral-hlp-backend:latest
sudo docker compose up -d
```

### 4. Monitor Logs for Issues

```bash
# Check for errors
sudo docker compose logs backend | grep -i error

# Check for suspicious access
sudo docker compose logs nginx | grep -E "404|401|403"

# System logs
sudo journalctl -u docker -f
```

---

## Production Checklist

Before going live:

- [ ] All containers healthy: `sudo docker compose ps`
- [ ] Backend health: `curl https://api.bessar.work/api/health`
- [ ] Frontend loads: `curl https://hlp.bessar.work`
- [ ] SSL valid: `sudo certbot certificates`
- [ ] Database backups automated: `crontab -l`
- [ ] Firewall enabled: `sudo ufw status`
- [ ] DNS correct: `nslookup hlp.bessar.work`
- [ ] Secrets changed from defaults
- [ ] CORS configured for production domains
- [ ] Nginx reverse proxy working
- [ ] Auto-renewal tested: `sudo certbot renew --dry-run`

---

## Architecture Overview

```
Internet
    ↓
DNS (hlp.bessar.work, api.bessar.work) → Azure VM Public IP
    ↓
Nginx (Port 80 → HTTPS redirect)
    ↓
Nginx HTTPS (Port 443) [TLS 1.3 Termination]
    ├─→ hlp.bessar.work → http://localhost:8080 (Frontend Container - nginx:1.28-alpine)
    └─→ api.bessar.work → http://localhost:8000 (Backend Container - FastAPI)
                                                        ↓
                                                  localhost:5432 (PostgreSQL Container)
```

---

## Support & Troubleshooting

**For issues not covered:**
- GitHub Issues: https://github.com/3NZ1I/referral-_hlp/issues
- Docker logs: `sudo docker compose logs`
- System logs: `sudo journalctl -u docker`
- Network check: `sudo netstat -tlnp`

**Emergency Commands:**

```bash
# Full system status
sudo docker compose ps
sudo systemctl status nginx
sudo systemctl status docker

# Full restart
sudo docker compose down
sudo docker compose up -d
sudo systemctl restart nginx

# Nuclear option (data loss!)
sudo docker compose down -v
sudo docker system prune -a -f
# Then redeploy from scratch
```
