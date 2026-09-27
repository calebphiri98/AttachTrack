-- 003_submissions_due_date_and_reopen.sql
-- Additive only. Existing rows get NULL due_date (no retroactive due dates),
-- so late-detection logic must treat NULL due_date as "not applicable",
-- not as "always late".

ALTER TABLE submissions
    ADD COLUMN due_date TIMESTAMPTZ,
    ADD COLUMN reopened_at TIMESTAMPTZ,
    ADD COLUMN reopened_by UUID REFERENCES users(id),
    ADD COLUMN penalty_percent NUMERIC(5,2);

INSERT INTO schema_migrations (filename) VALUES ('003_submissions_due_date_and_reopen.sql')
ON CONFLICT (filename) DO NOTHING;
