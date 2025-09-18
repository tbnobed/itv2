#!/bin/sh

# Docker entrypoint script for OBTV Streaming Platform
# Ensures database is migrated and seeded before starting the application

echo "🐳 Starting OBTV Streaming Platform Docker container..."
echo "🔧 Container Environment:"
echo "   NODE_ENV: $NODE_ENV"
echo "   DATABASE_URL: $(echo $DATABASE_URL | sed 's/:[^:]*@/:***@/')"
echo "   HLS_CONNECTION_TIMEOUT: $HLS_CONNECTION_TIMEOUT"
echo "   SNAPSHOT_INTERVAL: $SNAPSHOT_INTERVAL"

# Set up PATH to ensure tsx is available
export PATH="/app/node_modules/.bin:$PATH"

# Test network connectivity for HLS streaming
echo "🌐 Testing network connectivity for HLS streams..."
if command -v curl >/dev/null 2>&1; then
    # Test basic connectivity - not to user's specific servers but to verify internet
    if curl -s --connect-timeout 5 --max-time 10 https://httpbin.org/get >/dev/null 2>&1; then
        echo "✅ Network connectivity verified"
    else
        echo "⚠️  Warning: Limited network connectivity detected"
        echo "   HLS snapshot generation may be affected"
    fi
else
    echo "⚠️  Warning: curl not available for network testing"
fi

# Wait for database to be ready with retry logic
if [ -n "$DATABASE_URL" ]; then
    echo "📦 Database connection detected, checking readiness..."
    
    # Wait up to 120 seconds for database (longer for container startup)
    MAX_RETRIES=24
    RETRY_COUNT=0
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        tsx -e "
        import { Pool } from 'pg';
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        (async () => {
          try {
            const result = await pool.query('SELECT NOW() as current_time');
            console.log('✅ Database connection successful at', result.rows[0].current_time);
            await pool.end();
            process.exit(0);
          } catch (error) {
            console.error('⏳ Database not ready, waiting...', error.message);
            await pool.end().catch(() => {});
            process.exit(1);
          }
        })();
        " 2>/dev/null
        
        if [ $? -eq 0 ]; then
            break
        fi
        
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "🔄 Retry $RETRY_COUNT/$MAX_RETRIES in 5 seconds..."
            sleep 5
        else
            echo "❌ Database connection failed after $MAX_RETRIES attempts"
            echo "   Please check DATABASE_URL and ensure PostgreSQL is running"
            exit 1
        fi
    done
fi

# Run database migrations FIRST to create tables
echo "📦 Running database migrations..."

# First, try a regular push
echo "🔧 Attempting standard migration..."
if npm run db:push; then
    echo "✅ Database migrations completed successfully"
else
    echo "⚠️  Standard migration failed, attempting force push..."
    if npm run db:push -- --force; then
        echo "✅ Force migration successful"
    else
        echo "❌ Database migrations failed completely"
        exit 1
    fi
fi

# Verify the migration actually worked by checking for required columns
echo "🔍 Verifying database schema..."
tsx -e "
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  try {
    // Check if stream_type column exists
    const result = await pool.query(\`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'streams' AND column_name = 'stream_type'
    \`);
    
    if (result.rows.length === 0) {
      console.log('❌ Critical: stream_type column missing, adding manually...');
      await pool.query(\`
        ALTER TABLE streams 
        ADD COLUMN IF NOT EXISTS stream_type text NOT NULL DEFAULT 'webrtc'
      \`);
      console.log('✅ stream_type column added manually');
    } else {
      console.log('✅ Database schema verification successful');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Schema verification failed:', error.message);
    await pool.end().catch(() => {});
    process.exit(1);
  }
})();
"

if [ $? -ne 0 ]; then
    echo "❌ Schema verification failed"
    exit 1
fi

# Run database seeding after migrations
echo "🌱 Running database seeding..."
if tsx seed.js; then
    echo "✅ Database seeding completed successfully"
else
    echo "⚠️  Database seeding failed, but continuing with startup"
    echo "   This may be normal if data already exists"
fi

# Test FFmpeg availability for HLS processing
echo "🎬 Testing FFmpeg for HLS snapshot generation..."
if command -v ffmpeg >/dev/null 2>&1; then
    FFMPEG_VERSION=$(ffmpeg -version 2>&1 | head -n 1)
    echo "✅ FFmpeg available: $FFMPEG_VERSION"
    
    # Test basic ffmpeg functionality
    if ffmpeg -f lavfi -i testsrc2=duration=1:size=320x240:rate=1 -frames:v 1 -f image2 /tmp/test.jpg -y >/dev/null 2>&1; then
        echo "✅ FFmpeg functionality verified"
        rm -f /tmp/test.jpg
    else
        echo "⚠️  FFmpeg test failed - HLS snapshots may not work"
    fi
else
    echo "❌ FFmpeg not available - HLS snapshot generation will fail"
fi

# Create snapshots directory if it doesn't exist
mkdir -p /app/server/public/snapshots
chmod 755 /app/server/public/snapshots

# Start the application with enhanced logging
echo "🚀 Starting OBTV Streaming Platform application..."
echo "🔧 Final startup configuration:"
echo "   Working directory: $(pwd)"
echo "   Node.js version: $(node --version)"
echo "   NPM version: $(npm --version)"
echo "   Server startup: tsx server/production.ts"

exec tsx server/production.ts