-- M365 Migration Platform - Database Initialization
-- This script runs when the PostgreSQL container is first created

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE m365_migration TO postgres;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'M365 Migration database initialized successfully!';
END $$;
