# Production Deployment Guide - APK Management Feature

## Overview
This guide covers the infrastructure requirements for deploying the APK management feature to production.

## Infrastructure Requirements

### 1. Persistent Volume Storage
- **Mount Point**: `/app/server/public` (or map to persistent volume)
- **Purpose**: Store uploaded APK files across container restarts
- **Size**: At least 1GB recommended (APK files can be up to 100MB each)
- **Permissions**: Ensure the Node.js process can read/write to this directory
- **Example Docker Compose**:
  ```yaml
  volumes:
    - apk_storage:/app/server/public
  ```

### 2. Reverse Proxy Configuration (Nginx)
```nginx
# Add to your server block
client_max_body_size 100M;
proxy_read_timeout 300s;
proxy_send_timeout 300s;
proxy_request_buffering off;  # Optional: for smoother upload progress

# Add MIME type for APK files
location ~* \.apk$ {
    add_header Content-Type application/vnd.android.package-archive;
}
```

### 3. Environment Variables
Ensure these are set in production:
- `SESSION_SECRET`: Strong random secret for session encryption
- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV=production`

### 4. File Permissions
- **Directory**: `server/public` should be writable by Node.js process (755 or 775)
- **Files**: Uploaded APK files should have 644 permissions (readable, not executable)
- **User**: Run Node.js process as non-root user

### 5. Security Headers
The application automatically sets:
- `X-Content-Type-Options: nosniff`
- `Content-Disposition: attachment` for downloads
- CSRF protection on upload endpoints
- Admin-only access to upload functionality

### 6. Rate Limiting (Optional but Recommended)
Consider adding rate limiting to the download endpoint:
```nginx
# In nginx.conf
limit_req_zone $binary_remote_addr zone=download:10m rate=10r/m;

location /api/download/firestick-apk {
    limit_req zone=download burst=5 nodelay;
    proxy_pass http://backend;
}
```

## Production Verification Checklist

### Before Deployment
- [ ] Persistent volume mounted and accessible
- [ ] Nginx configured with 100MB body size limit
- [ ] SESSION_SECRET environment variable set
- [ ] Database connection tested
- [ ] File permissions verified

### After Deployment
- [ ] Upload functionality works (test with small APK)
- [ ] Download link works and serves correct MIME type
- [ ] Files persist across container restarts
- [ ] Admin authentication required for upload
- [ ] CSRF protection active on upload

### Test Commands
```bash
# Test upload endpoint protection (should require auth)
curl -X POST /api/admin/apk/upload
# Expected: 401 Unauthorized

# Test download endpoint
curl -I /api/download/firestick-apk
# Expected: 200 OK with correct Content-Type header

# Test file persistence
# 1. Upload APK through admin interface
# 2. Restart container
# 3. Verify download still works
```

## Monitoring Recommendations
- Monitor disk usage in `server/public` directory
- Log failed upload attempts
- Monitor download bandwidth usage
- Set up alerts for upload failures

## Backup Strategy
- Include `server/public` directory in regular backups
- Consider versioning strategy for APK files
- Test restore procedures regularly

## Troubleshooting

### Common Issues
1. **Upload fails with 413 error**: Check nginx `client_max_body_size`
2. **Files disappear after restart**: Persistent volume not mounted
3. **Permission denied on upload**: Check directory permissions
4. **Download returns wrong content**: Clear browser cache, check ETag headers

### Debug Commands
```bash
# Check file permissions
ls -la server/public/

# Check disk space
df -h

# Check nginx configuration
nginx -t

# Test upload size limit
curl -X POST -F "file=@large.apk" /api/admin/apk/upload
```