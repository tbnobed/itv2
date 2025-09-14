#!/bin/bash

# OBTV Database Backup Script
set -e

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="obtv_backup_${DATE}.sql"

echo "🗄️  OBTV Database Backup"
echo "======================="

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if PostgreSQL container is running
if ! docker-compose ps postgres | grep -q "Up"; then
    echo "❌ PostgreSQL container is not running"
    exit 1
fi

echo "📦 Creating database backup..."
docker-compose exec -T postgres pg_dump -U obtv_user obtv_streaming > "$BACKUP_DIR/$BACKUP_FILE"

# Compress the backup
echo "🗜️  Compressing backup..."
gzip "$BACKUP_DIR/$BACKUP_FILE"

echo "✅ Backup created: $BACKUP_DIR/${BACKUP_FILE}.gz"

# Clean up old backups (keep last 7 days)
find "$BACKUP_DIR" -name "obtv_backup_*.sql.gz" -mtime +7 -delete
echo "🧹 Old backups cleaned up"

echo ""
echo "📋 Backup Information:"
echo "  File: $BACKUP_DIR/${BACKUP_FILE}.gz"
echo "  Size: $(du -h "$BACKUP_DIR/${BACKUP_FILE}.gz" | cut -f1)"
echo ""
echo "💡 To restore this backup:"
echo "  gunzip $BACKUP_DIR/${BACKUP_FILE}.gz"
echo "  docker-compose exec -T postgres psql -U obtv_user obtv_streaming < $BACKUP_DIR/$BACKUP_FILE"