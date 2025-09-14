# OBTV Streaming Platform - Docker Deployment

This guide explains how to deploy the OBTV Streaming Platform on your own server using Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB RAM
- 10GB free disk space

## Quick Start

1. **Clone and prepare the application:**
   ```bash
   git clone <your-repo-url>
   cd obtv-streaming
   chmod +x deploy.sh backup.sh update.sh
   ```

2. **Deploy the application:**
   ```bash
   ./deploy.sh
   ```

3. **Access your application:**
   - Web Interface: http://localhost:5000
   - Default admin login: Use the passcode authentication system

## Configuration

### Environment Variables

The deployment script creates a `.env` file with secure defaults. You can customize these values:

```env
# Database Configuration
POSTGRES_PASSWORD=your_secure_password
DATABASE_URL=postgresql://obtv_user:password@postgres:5432/obtv_streaming

# Application Security
SESSION_SECRET=your_super_secure_session_secret
NODE_ENV=production
PORT=5000
```

### Nginx Reverse Proxy

To use Nginx (recommended for production):

```bash
docker-compose --profile with-nginx up -d
```

Configure SSL certificates in the `ssl/` directory and update `nginx.conf`.

## Database Management

### Backup Database
```bash
./backup.sh
```

### Restore Database
```bash
# Restore from a specific backup
gunzip backups/obtv_backup_20231201_120000.sql.gz
docker-compose exec -T postgres psql -U obtv_user obtv_streaming < backups/obtv_backup_20231201_120000.sql
```

### Database Shell Access
```bash
docker-compose exec postgres psql -U obtv_user obtv_streaming
```

## Application Management

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart app
```

### Update Application
```bash
./update.sh
```

### Stop Services
```bash
docker-compose down
```

### Complete Reset (removes all data)
```bash
docker-compose down -v
docker system prune -f
```

## File Structure

```
/
├── Dockerfile              # Application container
├── docker-compose.yml      # Service orchestration
├── nginx.conf             # Nginx configuration
├── init.sql               # Database initialization
├── deploy.sh              # Deployment script
├── backup.sh              # Backup script
├── update.sh              # Update script
├── .dockerignore          # Docker ignore rules
├── .env                   # Environment variables (generated)
└── backups/               # Database backups (generated)
```

## Production Recommendations

### Security
- Change default passwords in `.env`
- Set up SSL certificates
- Configure firewall rules
- Use strong session secrets
- Regular security updates

### Performance
- Allocate adequate resources (4GB+ RAM recommended)
- Use SSD storage
- Monitor disk usage
- Set up log rotation

### Monitoring
```bash
# Check service health
docker-compose ps

# Monitor resource usage
docker stats

# Check application health
curl http://localhost:5000/api/health
```

### Backup Strategy
```bash
# Set up daily backups with cron
0 2 * * * /path/to/obtv/backup.sh
```

## Troubleshooting

### Service Won't Start
```bash
# Check logs
docker-compose logs

# Check disk space
df -h

# Check port conflicts
netstat -tulpn | grep :5000
```

### Database Connection Issues
```bash
# Check database status
docker-compose exec postgres pg_isready -U obtv_user

# Reset database connection
docker-compose restart postgres
docker-compose restart app
```

### Performance Issues
```bash
# Check resource usage
docker stats

# Optimize database
docker-compose exec postgres psql -U obtv_user obtv_streaming -c "VACUUM ANALYZE;"
```

## Support

For issues and support:
1. Check application logs: `docker-compose logs`
2. Verify environment configuration
3. Check system resources
4. Consult the troubleshooting section above

## Ports

- `5000`: Application (HTTP)
- `5432`: PostgreSQL (internal)
- `80/443`: Nginx (when using reverse proxy)

The application includes proper health checks and will automatically restart if it fails.