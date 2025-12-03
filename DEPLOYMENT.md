# Manual Deployment Steps for HLP-N8N Azure VM

## Connection Info
- **IP**: 20.153.240.13
- **Username**: bessar
- **Password**: Reem@noah250125!

## Step-by-Step Deployment

### 1. Connect to VM
From your local PowerShell or use Azure Portal's "Connect" → "Bastion" or "SSH":
```bash
ssh bessar@20.153.240.13
```
Enter password when prompted: `Reem@noah250125!`

### 2. Install Docker and Docker Compose
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### 3. Clone Repository
```bash
cd ~
git clone https://github.com/3NZ1I/referral-_hlp.git
cd referral-_hlp
```

### 4. Create Environment File
```bash
nano .env
```

Paste this content:
```env
# Database Configuration
DATABASE_URL=postgresql+psycopg2://hlp_user:HLP_Secure_Pass_2025!@db/referral_db
POSTGRES_USER=hlp_user
POSTGRES_PASSWORD=HLP_Secure_Pass_2025!
POSTGRES_DB=referral_db

# Backend Configuration (generate with: openssl rand -hex 32)
JWT_SECRET=YOUR_GENERATED_SECRET_HERE
JWT_EXP_MINUTES=120

# Frontend Configuration
REACT_APP_API_URL=https://api.bessar.work/api
```

Generate JWT secret:
```bash
openssl rand -hex 32
```
Copy the output and replace `YOUR_GENERATED_SECRET_HERE` in .env file.

Save with `Ctrl+X`, then `Y`, then `Enter`.

### 5. Start Database and Run Migrations
```bash
# Start database only
docker compose up -d db

# Wait 10 seconds for DB to be ready
sleep 10

# Run migrations
docker compose run --rm backend alembic upgrade head
```

### 6. Start All Services
```bash
docker compose up -d
```

### 7. Verify Services
```bash
# Check running containers
docker compose ps

# View logs
docker compose logs -f

# Test backend API
curl http://localhost:8000/api/cases

# Test frontend
curl http://localhost:8080
```

### 8. Configure Domains (if needed)

If you need to set up reverse proxy for your domains:

**Install Nginx:**
```bash
sudo apt install nginx -y
```

**Configure for api.bessar.work:**
```bash
sudo nano /etc/nginx/sites-available/api.bessar.work
```

Paste:
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

**Configure for hlp.bessar.work:**
```bash
sudo nano /etc/nginx/sites-available/hlp.bessar.work
```

Paste:
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

**Enable sites:**
```bash
sudo ln -s /etc/nginx/sites-available/api.bessar.work /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/hlp.bessar.work /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 9. Enable HTTPS with Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.bessar.work -d hlp.bessar.work
```

### 10. Set Up Automated Backups
```bash
# Create backup script
cat > ~/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="$HOME/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cd ~/referral-_hlp
docker compose exec -T db pg_dump -U hlp_user referral_db | gzip > $BACKUP_DIR/referral_db_$DATE.sql.gz
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
echo "Backup completed: referral_db_$DATE.sql.gz"
EOF

chmod +x ~/backup-db.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * $HOME/backup-db.sh") | crontab -
```

## Future Updates

When you push changes to GitHub:
```bash
cd ~/referral-_hlp
git pull origin main
docker compose pull
docker compose run --rm backend alembic upgrade head
docker compose up -d
```

## Troubleshooting

### Manual Backup/Restore (Repo scripts)

- Manual backup:
    ```bash
    cd ~/referral-_hlp
    bash scripts/db_backup.sh "$HOME/db_backups"
    ```
    Result: `~/db_backups/referral_db_YYYY-MM-DD_HH-MM-SS.sql`

- Restore:
    ```bash
    sudo docker compose cp /path/to/referral_db.sql db:/tmp/referral_db.sql
    sudo docker compose exec db psql -U hlp_user -d referral_db -f /tmp/referral_db.sql
    ```

Notes:
- Never run `docker compose down -v` in production; it removes volumes (data).
- Ensure DB volume remains `postgres_data:/var/lib/postgresql/data` in `docker-compose.yml`.

**View logs:**
```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

**Restart services:**
```bash
docker compose restart
```

**Stop everything:**
```bash
docker compose down
```

**Clean restart:**
```bash
docker compose down -v  # WARNING: This deletes database!
docker compose up -d
```
