CREATE TYPE logbook_status AS ENUM ('draft', 'submitted', 'approved', 'returned');

ALTER TABLE logbook_entries
    ADD COLUMN start_time TIME,
    ADD COLUMN end_time TIME,
    ADD COLUMN description TEXT,
    ADD COLUMN skills_learned TEXT,
    ADD COLUMN challenges TEXT,
    ADD COLUMN tools_used TEXT,
    ADD COLUMN status logbook_status NOT NULL DEFAULT 'draft',
    ADD COLUMN submitted_at TIMESTAMPTZ,
    ADD COLUMN reviewed_by UUID REFERENCES users(id),
    ADD COLUMN reviewed_at TIMESTAMPTZ,
    ADD COLUMN review_comment TEXT,
    ADD COLUMN client_uuid UUID,
    ADD COLUMN client_created_at TIMESTAMPTZ,
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE logbook_entries SET status = 'submitted', submitted_at = created_at;

CREATE UNIQUE INDEX idx_logbook_entries_client_uuid
    ON logbook_entries(client_uuid) WHERE client_uuid IS NOT NULL;
CREATE INDEX idx_logbook_entries_student_date ON logbook_entries(student_id, entry_date DESC);
CREATE INDEX idx_logbook_entries_student_status ON logbook_entries(student_id, status);

CREATE TABLE logbook_entry_files (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id   UUID NOT NULL REFERENCES logbook_entries(id) ON DELETE CASCADE,
    file_url   TEXT NOT NULL,
    file_name  VARCHAR(255) NOT NULL,
    file_type  VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_logbook_entry_files_entry ON logbook_entry_files(entry_id);

INSERT INTO logbook_entry_files (entry_id, file_url, file_name)
SELECT id, attachment_url, COALESCE(attachment_name, 'Attachment')
FROM logbook_entries
WHERE attachment_url IS NOT NULL;

CREATE TABLE logbook_week_reviews (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    week_start  DATE NOT NULL,
    decision    VARCHAR(10) NOT NULL CHECK (decision IN ('approved', 'returned')),
    comment     TEXT,
    entry_count INTEGER NOT NULL,
    reviewed_by UUID NOT NULL REFERENCES users(id),
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_logbook_week_reviews_student ON logbook_week_reviews(student_id, week_start);

INSERT INTO schema_migrations (filename) VALUES ('017_logbook_v2.sql')
ON CONFLICT (filename) DO NOTHING;