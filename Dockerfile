# Build stage - includes dev dependencies for building
FROM node:20-alpine AS builder

# Install system dependencies for node-gyp, build tools, and ffmpeg
RUN apk add --no-cache python3 make g++ curl ffmpeg

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Build the frontend application
RUN npm run build

# Verify build output exists
RUN ls -la dist/ || echo "Build output not found in dist/"

# Production stage
FROM node:20-alpine AS production

# Install system dependencies for runtime
# - curl: health checks and network connectivity testing
# - ffmpeg: server-side video snapshot generation with HLS support
# - ca-certificates: for secure HTTPS connections to streaming servers
RUN apk add --no-cache curl ffmpeg ca-certificates

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm install tsx drizzle-kit && npm cache clean --force

# Copy entire project structure from builder (needed for tsx execution)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/server ./server
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/seed.js ./seed.js
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=builder /app/node_modules ./node_modules

# Copy additional files needed for production
COPY --from=builder /app/package*.json ./

# Make entrypoint script executable
RUN chmod +x docker-entrypoint.sh

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Create necessary directories with proper permissions
RUN mkdir -p /app/server/public/snapshots /app/server/public/generated_images
RUN chown -R nodejs:nodejs /app
USER nodejs

# Set environment variables for Docker container
ENV DOCKER_ENV=true
ENV NODE_ENV=production
ENV HLS_CONNECTION_TIMEOUT=15
ENV HLS_MAX_RETRIES=5
ENV SNAPSHOT_INTERVAL=30

# Expose port
EXPOSE 5000

# Enhanced health check with better timeout for HLS streaming
HEALTHCHECK --interval=60s --timeout=15s --start-period=60s --retries=5 \
    CMD curl -f --connect-timeout 10 --max-time 15 http://localhost:5000/api/health || exit 1

# Start via entrypoint script (handles database migration, seeding, and server startup)
CMD ["./docker-entrypoint.sh"]