CREATE TABLE IF NOT EXISTS announcements (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 title VARCHAR(180) NOT NULL,
 body TEXT NOT NULL,
 audience VARCHAR(20) NOT NULL DEFAULT 'all' CHECK (audience IN ('all','students','supervisors')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);
CREATE TABLE IF NOT EXISTS announcement_replies (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
 author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 body TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_announcement_replies_thread ON announcement_replies(announcement_id, created_at);
