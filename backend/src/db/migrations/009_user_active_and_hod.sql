
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'hod';

ALTER TABLE users
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

INSERT INTO schema_migrations (filename) VALUES ('009_user_active_and_hod.sql')
ON CONFLICT (filename) DO NOTHING;