# WebRTC Streaming Deployment Guide

## Overview
This guide covers essential deployment requirements for the OBTV WebRTC streaming interface to ensure reliable connections across different environments.

## CORS Requirements

### Development Environment
For local development, SRS server must be configured with appropriate CORS headers:

```nginx
# SRS HTTP API CORS configuration
http_api {
    enabled on;
    listen 1985;
    crossdomain on;
    raw_api {
        enabled on;
        allow_reload on;
        allow_query on;
        allow_update on;
    }
}

# WebRTC CORS headers
http_server {
    enabled on;
    listen 8080;
    dir ./objs/nginx/html;
    crossdomain on;
}
```

### Production Environment
Ensure your SRS server includes these HTTP headers:
- `Access-Control-Allow-Origin: *` (or specify your domain)
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`

## HTTPS Requirements

### Why HTTPS is Required
- WebRTC requires secure context for getUserMedia API
- Modern browsers block mixed content (HTTP on HTTPS sites)
- Real-time media streaming needs encrypted transport

### URL Format Examples

#### Local Development (HTTP allowed)
```
webrtc://localhost:1985/live/stream
webrtc://127.0.0.1:1985/live/stream
```

#### Production Deployment (HTTPS required)
```
webrtc://stream.yourdomain.com:1985/live/stream?schema=https
webrtc://stream.yourdomain.com/live/stream?schema=https
```

#### With SSL Certificate
```
webrtc://stream.yourdomain.com:443/live/stream?schema=https
```

## SRS Server Configuration

### Basic Configuration (srs.conf)
```nginx
# WebRTC configuration
rtc_server {
    enabled on;
    listen 8000;
    
    # HTTPS candidate
    candidate $CANDIDATE;
    
    # API configuration
    api {
        enabled on;
        listen 1985;
        crossdomain on;
    }
}

# HTTPS configuration for production
http_server {
    enabled on;
    listen 8080;
    dir ./objs/nginx/html;
    
    # SSL configuration
    https {
        enabled on;
        listen 8088;
        key ./conf/server.key;
        cert ./conf/server.crt;
    }
}
```

### Environment Variables
Set these environment variables for production:
```bash
# Server external IP (for ICE candidates)
export CANDIDATE="your.external.ip.address"

# API server URL
export SRS_HTTP_API_LISTEN="1985"

# WebRTC listen port
export SRS_RTC_SERVER_LISTEN="8000"
```

## Firewall Configuration

### Required Ports
- **1985**: HTTP API (can be changed)
- **8000**: WebRTC signaling
- **8080**: HTTP server
- **8088**: HTTPS server (if using SSL)
- **50000-60000**: UDP range for media streams

### Firewall Rules Example (Ubuntu/Debian)
```bash
# Allow SRS API
sudo ufw allow 1985/tcp

# Allow WebRTC signaling
sudo ufw allow 8000/tcp

# Allow HTTP/HTTPS
sudo ufw allow 8080/tcp
sudo ufw allow 8088/tcp

# Allow WebRTC media (UDP range)
sudo ufw allow 50000:60000/udp
```

## Load Balancer Configuration

### Nginx Proxy Example
```nginx
upstream srs_api {
    server 127.0.0.1:1985;
}

upstream srs_webrtc {
    server 127.0.0.1:8000;
}

server {
    listen 443 ssl;
    server_name stream.yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # API proxy
    location /rtc/ {
        proxy_pass http://srs_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
        add_header Access-Control-Allow-Headers 'Content-Type';
        
        # Handle preflight
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}
```

## Troubleshooting Common Issues

### CORS Errors
**Symptom**: "Cross-origin request blocked" or "CORS policy" errors
**Solution**: 
1. Enable CORS on SRS server configuration
2. Add proper headers to your reverse proxy
3. Use `schema=https` parameter in WebRTC URLs

### HTTPS Context Errors
**Symptom**: "getUserMedia requires secure context" 
**Solution**:
1. Use HTTPS for your web application
2. Add `?schema=https` to WebRTC URLs
3. Ensure SSL certificates are valid

### ICE Connection Failures
**Symptom**: Connection timeout or "ICE failed" states
**Solution**:
1. Check firewall UDP port range (50000-60000)
2. Verify CANDIDATE environment variable
3. Ensure external IP is reachable

### Network Connectivity Issues
**Symptom**: "Network connection failed" errors
**Solution**:
1. Verify SRS server is running and accessible
2. Check DNS resolution for domain names
3. Test with direct IP addresses first

## Testing Checklist

### Development Testing
- [ ] Local HTTP connections work (localhost/127.0.0.1)
- [ ] WebRTC URLs connect successfully
- [ ] Video/audio streams play correctly
- [ ] Error messages are clear and actionable

### Production Testing
- [ ] HTTPS connections work
- [ ] CORS headers are present
- [ ] External domain resolution works
- [ ] SSL certificates are valid
- [ ] Firewall ports are open
- [ ] Load balancer routing works

### Cross-Browser Testing
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (with HTTPS)
- [ ] Edge

## Security Considerations

### API Security
- Use authentication tokens for production
- Limit CORS origins to specific domains
- Enable rate limiting on API endpoints

### Network Security
- Use strong SSL certificates
- Implement proper firewall rules
- Monitor for unusual traffic patterns

### Content Security
- Validate stream URLs and parameters
- Implement access controls for streams
- Log connection attempts for monitoring

## Example Implementation

See `client/src/components/StreamModal.tsx` for a complete implementation that:
- Detects CORS and HTTPS issues automatically
- Provides user-friendly error messages
- Suggests solutions for common problems
- Includes comprehensive connection diagnostics

The implementation handles various error scenarios and provides actionable feedback to help users resolve connectivity issues.