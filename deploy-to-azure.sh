#!/bin/bash
# Deployment script for HLP Referral System on Azure VM
# Run this script after SSH'ing into your VM: bash deploy-to-azure.sh

set -e  # Exit on any error

echo "=========================================="
echo "HLP Referral System - Azure Deployment"
echo "=========================================="
echo ""

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    sudo apt install -y ca-certificates curl gnupg lsb-release
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo usermod -aG docker $USER
    echo "✅ Docker installed!"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose standalone if needed
if ! command -v docker-compose &> /dev/null; then
    echo "📦 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed!"
else
    echo "✅ Docker Compose already installed"
fi

# Install Git if not installed
if ! command -v git &> /dev/null; then
    echo "📦 Installing Git..."
    sudo apt install -y git
    echo "✅ Git installed!"
else
    echo "✅ Git already installed"
fi

# Clone repository
REPO_DIR="$HOME/referral-_hlp"
if [ -d "$REPO_DIR" ]; then
    echo "📁 Repository exists, pulling latest changes..."
    cd "$REPO_DIR"
    git pull origin main
else
    echo "📥 Cloning repository..."
    git clone https://github.com/3NZ1I/referral-_hlp.git "$REPO_DIR"
    cd "$REPO_DIR"
fi

# Create .env file
echo "⚙️  Creating environment configuration..."
cat > .env << 'EOF'
# Database Configuration
DATABASE_URL=postgresql+psycopg2://hlp_user:HLP_Secure_Pass_2025!@db/referral_db
POSTGRES_USER=hlp_user
POSTGRES_PASSWORD=HLP_Secure_Pass_2025!
POSTGRES_DB=referral_db

# Backend Configuration
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXP_MINUTES=120

# Frontend Configuration
REACT_APP_API_URL=https://api.bessar.work/api
EOF

# Generate actual JWT secret
JWT_SECRET=$(openssl rand -hex 32)
sed -i "s/\$(openssl rand -hex 32)/$JWT_SECRET/" .env

echo "✅ Environment file created"

# Start database first
echo "🗄️  Starting database..."
docker compose up -d db

# Wait for database
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run migrations
echo "🔄 Running database migrations..."
docker compose run --rm backend alembic upgrade head

# Start all services
echo "🚀 Starting all services..."
docker compose up -d

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Services running:"
docker compose ps
echo ""
echo "📝 Next steps:"
echo "1. Configure reverse proxy for domains:"
echo "   - hlp.bessar.work → localhost:8080"
echo "   - api.bessar.work → localhost:8000"
echo "2. Enable HTTPS with Let's Encrypt"
echo ""
echo "View logs: docker compose logs -f"
echo "Stop services: docker compose down"
echo "Update system: git pull && docker compose pull && docker compose up -d"
echo ""
