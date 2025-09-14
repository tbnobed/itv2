#!/bin/bash

# OBTV Streaming Platform Deployment Script
# This script sets up and deploys the OBTV streaming application with Docker

set -e

echo "🚀 OBTV Streaming Platform Deployment"
echo "======================================"

# Function to install Docker
install_docker() {
    echo "🔧 Installing Docker..."
    
    # Detect operating system
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt-get &> /dev/null; then
            # Ubuntu/Debian
            echo "📦 Detected Ubuntu/Debian - installing Docker via apt"
            sudo apt-get update
            sudo apt-get install -y ca-certificates curl gnupg lsb-release
            sudo mkdir -p /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            echo \
              "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
              $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            sudo apt-get update
            sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        elif command -v yum &> /dev/null; then
            # CentOS/RHEL
            echo "📦 Detected CentOS/RHEL - installing Docker via yum"
            sudo yum install -y yum-utils
            sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            sudo systemctl start docker
            sudo systemctl enable docker
        elif command -v dnf &> /dev/null; then
            # Fedora
            echo "📦 Detected Fedora - installing Docker via dnf"
            sudo dnf -y install dnf-plugins-core
            sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
            sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            sudo systemctl start docker
            sudo systemctl enable docker
        else
            echo "❌ Unsupported Linux distribution. Please install Docker manually."
            echo "Visit: https://docs.docker.com/engine/install/"
            exit 1
        fi
        
        # Add user to docker group to avoid sudo requirement
        sudo usermod -aG docker $USER
        echo "⚠️  You may need to log out and back in for Docker group changes to take effect"
        
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        echo "📦 Detected macOS"
        if command -v brew &> /dev/null; then
            echo "🍺 Installing Docker Desktop via Homebrew"
            brew install --cask docker
            echo "⚠️  Please start Docker Desktop from Applications after installation"
        else
            echo "❌ Homebrew not found. Please install Docker Desktop manually:"
            echo "Visit: https://docs.docker.com/desktop/install/mac-install/"
            exit 1
        fi
    else
        echo "❌ Unsupported operating system. Please install Docker manually."
        echo "Visit: https://docs.docker.com/engine/install/"
        exit 1
    fi
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "🔍 Docker not found. Would you like to install it automatically? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        install_docker
        echo "✅ Docker installation completed"
    else
        echo "❌ Docker is required. Please install Docker manually and run this script again."
        echo "Visit: https://docs.docker.com/engine/install/"
        exit 1
    fi
fi

# Verify Docker installation
if ! docker --version &> /dev/null; then
    echo "❌ Docker installation failed or Docker daemon is not running"
    echo "Please start Docker and try again, or install manually"
    exit 1
fi

# Check Docker Compose (try both standalone and plugin versions)
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "🔍 Docker Compose not found"
    # Try to install docker-compose via pip as fallback
    if command -v pip3 &> /dev/null; then
        echo "📦 Installing Docker Compose via pip3"
        pip3 install docker-compose
    elif command -v pip &> /dev/null; then
        echo "📦 Installing Docker Compose via pip"
        pip install docker-compose
    else
        echo "❌ Docker Compose is required but could not be installed automatically"
        echo "The Docker installation should include Docker Compose plugin"
        echo "Please ensure Docker is properly installed and try again"
        exit 1
    fi
fi

echo "✅ Docker and Docker Compose are ready"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# OBTV Streaming Platform Environment Variables
# IMPORTANT: Change these values for production!

# Database Configuration
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
DATABASE_URL=postgresql://obtv_user:\${POSTGRES_PASSWORD}@postgres:5432/obtv_streaming

# Application Security  
SESSION_SECRET=$(openssl rand -base64 32)
NODE_ENV=production
PORT=5000

# Generated on $(date)
EOF
    echo "✅ .env file created with secure random values"
    echo "⚠️  Please review and customize the .env file before deploying"
else
    echo "✅ .env file already exists"
fi

# Create generated_images directory if it doesn't exist
mkdir -p client/public/generated_images
echo "✅ Generated images directory created"

# Build and start services
echo "🔨 Building Docker images..."
if command -v docker-compose &> /dev/null; then
    docker-compose build --no-cache
else
    docker compose build --no-cache
fi

echo "🗄️  Starting PostgreSQL database..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d postgres
else
    docker compose up -d postgres
fi

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations using dedicated migration service
echo "📊 Running database migrations..."
if command -v docker-compose &> /dev/null; then
    docker-compose --profile migrate run --rm migrate
else
    docker compose --profile migrate run --rm migrate
fi

echo "🚀 Starting application..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d
else
    docker compose up -d
fi

echo ""
echo "✅ OBTV Streaming Platform deployed successfully!"
echo ""
echo "🌐 Application URL: http://localhost:5000"
echo "🗄️  Database URL: localhost:5432"
echo ""
echo "📋 Useful commands:"
echo "  View logs:           docker-compose logs -f"
echo "  Stop services:       docker-compose down"
echo "  Restart services:    docker-compose restart"
echo "  Database shell:      docker-compose exec postgres psql -U obtv_user -d obtv_streaming"
echo ""
echo "⚠️  Security Notes:"
echo "  - Change default passwords in .env file"
echo "  - Set up SSL certificates for production"
echo "  - Configure firewall rules"
echo "  - Regular database backups"
echo ""