CREATE TABLE IF NOT EXISTS sync_receipts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    idempotency_key     VARCHAR(100) NOT NULL,
    method              VARCHAR(10) NOT NULL,
    path                TEXT NOT NULL,
    status_code         INTEGER,
    response_body       JSONB,
    client_created_at   TIMESTAMPTZ,
    server_received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    clock_offset_ms     BIGINT,
    clock_flagged       BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_sync_receipts_created ON sync_receipts(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_receipts_flagged ON sync_receipts(created_at) WHERE clock_flagged;

ALTER TABLE logbook_entries
    ADD COLUMN IF NOT EXISTS client_created_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS server_received_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS clock_offset_ms BIGINT,
    ADD COLUMN IF NOT EXISTS clock_flagged BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE submissions
    ADD COLUMN IF NOT EXISTS client_created_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS server_received_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS clock_offset_ms BIGINT,
    ADD COLUMN IF NOT EXISTS clock_flagged BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE attendance
    ADD COLUMN IF NOT EXISTS client_created_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS server_received_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS clock_offset_ms BIGINT,
    ADD COLUMN IF NOT EXISTS clock_flagged BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE attendance_changes
    ADD COLUMN IF NOT EXISTS client_created_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS clock_flagged BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE site_visits
    ADD COLUMN IF NOT EXISTS client_created_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS server_received_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS clock_offset_ms BIGINT,
    ADD COLUMN IF NOT EXISTS clock_flagged BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS client_created_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS server_received_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS clock_offset_ms BIGINT,
    ADD COLUMN IF NOT EXISTS clock_flagged BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE assessments
    ADD COLUMN IF NOT EXISTS client_created_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS server_received_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS clock_offset_ms BIGINT,
    ADD COLUMN IF NOT EXISTS clock_flagged BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_logbook_entries_flagged ON logbook_entries(created_at) WHERE clock_flagged;
CREATE INDEX IF NOT EXISTS idx_submissions_flagged ON submissions(created_at) WHERE clock_flagged;
CREATE INDEX IF NOT EXISTS idx_attendance_flagged ON attendance(created_at) WHERE clock_flagged;

INSERT INTO schema_migrations (filename) VALUES ('018_offline_sync.sql')
ON CONFLICT (filename) DO NOTHING;
