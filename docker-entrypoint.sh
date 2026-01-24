#!/bin/sh

# Docker entrypoint script for OBTV
# Ensures database is migrated and seeded before starting the application

echo "🐳 Starting OBTV Docker container..."

# Wait for database to be ready with retry logic
if [ -n "$DATABASE_URL" ]; then
    echo "📦 Database connection detected, checking readiness..."
    
    # Wait up to 60 seconds for database
    MAX_RETRIES=12
    RETRY_COUNT=0
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        node_modules/.bin/tsx -e "
        import { Pool } from 'pg';
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        (async () => {
          try {
            await pool.query('SELECT 1');
            console.log('✅ Database connection successful');
            await pool.end();
            process.exit(0);
          } catch (error) {
            console.error('⏳ Database not ready, waiting...', error.message);
            await pool.end().catch(() => {});
            process.exit(1);
          }
        })();
        "
        
        if [ $? -eq 0 ]; then
            break
        fi
        
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "🔄 Retry $RETRY_COUNT/$MAX_RETRIES in 5 seconds..."
            sleep 5
        else
            echo "❌ Database connection failed after $MAX_RETRIES attempts"
            exit 1
        fi
    done
fi

# Run database migrations FIRST to create tables
echo "📦 Running database migrations..."
npx drizzle-kit push --force

if [ $? -eq 0 ]; then
    echo "✅ Database migrations completed successfully"
else
    echo "❌ Database migrations failed"
    exit 1
fi

# Run database seeding after migrations
echo "🌱 Running database seeding..."
node_modules/.bin/tsx seed.js

# Check if seeding was successful
if [ $? -eq 0 ]; then
    echo "✅ Database seeding completed successfully"
else
    echo "❌ Database seeding failed"
    exit 1
fi

# Start the application
echo "🚀 Starting OBTV application..."
exec node_modules/.bin/tsx server/production.ts