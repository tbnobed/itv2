# Build stage - includes dev dependencies for building
FROM node:20-alpine AS builder

# Install system dependencies for node-gyp and build tools
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install only curl for health checks (no postgresql-client needed)
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files and install production dependencies plus tsx and drizzle-kit
COPY package*.json ./
RUN npm ci --only=production && npm install tsx drizzle-kit && npm cache clean --force

# Copy built application and necessary files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/public ./client/public
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/server ./server
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/seed.js ./seed.js

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

# Set Docker environment variable for session handling
ENV DOCKER_ENV=true

# Expose port
EXPOSE 5000

# Health check using curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Start the production server directly (no vite imports)
CMD ["node_modules/.bin/tsx", "server/production.ts"]