#!/bin/bash

# OBTV Update Script
set -e

echo "🔄 OBTV Streaming Platform Update"
echo "================================="

# Check if services are running
if ! docker-compose ps | grep -q "Up"; then
    echo "⚠️  Services are not running. Run ./deploy.sh first."
    exit 1
fi

echo "📦 Creating backup before update..."
./backup.sh

echo "🛑 Stopping application (keeping database running)..."
docker-compose stop app

echo "🔨 Rebuilding application..."
docker-compose build --no-cache app

echo "📊 Running database migrations..."
docker-compose --profile migrate run --rm migrate

echo "🚀 Starting updated application..."
docker-compose up -d app

echo "🏥 Running health checks..."
sleep 10
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ Application updated successfully!"
    echo "🌐 Available at: http://localhost:5000"
else
    echo "❌ Health check failed. Check logs with:"
    echo "docker-compose logs app"
    exit 1
fi