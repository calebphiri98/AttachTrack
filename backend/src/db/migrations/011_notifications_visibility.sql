ALTER TABLE notifications
    ADD COLUMN in_app_visible BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX idx_notifications_visible_user
    ON notifications(user_id, created_at DESC)
    WHERE in_app_visible = TRUE;

INSERT INTO schema_migrations (filename) VALUES ('011_notifications_visibility.sql')
ON CONFLICT (filename) DO NOTHING;