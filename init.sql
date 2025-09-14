-- PostgreSQL initialization script for OBTV Streaming Platform
-- This script sets up the database with required extensions and initial data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create the database tables (will be managed by Drizzle migrations)
-- This file primarily ensures extensions are available

-- Set timezone
SET timezone = 'UTC';

-- Create initial admin user (will be replaced by application seeding)
-- Password hash for 'admin123' - change this in production
DO $$
BEGIN
    -- This will be handled by the application's seeding logic
    RAISE NOTICE 'Database initialized. Tables and initial data will be created by the application.';
END $$;