#!/bin/sh

# Docker entrypoint script for OBTV
# Ensures database is seeded before starting the application

echo "🐳 Starting OBTV Docker container..."

# Wait for database to be ready (if needed)
if [ -n "$DATABASE_URL" ]; then
    echo "📦 Database connection detected, checking readiness..."
    # Simple connection test using node
    node_modules/.bin/tsx -e "
    import { Pool } from 'pg';
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    (async () => {
      try {
        await pool.query('SELECT 1');
        console.log('✅ Database connection successful');
        await pool.end();
      } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
      }
    })();
    "
fi

# Run database seeding before starting the application
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