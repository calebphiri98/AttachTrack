-- 002_notifications.sql
-- In-app notifications: "new student assigned", "missed submission", etc.
-- type is a free VARCHAR rather than an enum for now, so new notification
-- kinds don't require another migration to add — reconsider as a proper
-- enum later if the set of types stabilizes.

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL,   -- 'new_student_assigned' | 'missed_submission' | ...
    title           VARCHAR(200) NOT NULL,
    body            TEXT,
    related_id      UUID,                   -- e.g. the student_id or submission_id this is about
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;

INSERT INTO schema_migrations (filename) VALUES ('002_notifications.sql')
ON CONFLICT (filename) DO NOTHING;
