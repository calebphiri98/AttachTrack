-- 000_schema_migrations.sql
-- Tracking table for incremental migrations. Run this once before applying
-- any numbered migration below. Lets migrate.js check which files have
-- already been applied instead of assuming a fresh full-schema run.

CREATE TABLE IF NOT EXISTS schema_migrations (
    id          SERIAL PRIMARY KEY,
    filename    VARCHAR(255) NOT NULL UNIQUE,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
