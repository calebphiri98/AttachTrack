-- =====================================================================
-- AttachTrack — Industrial Attachment Tracking System
-- Full PostgreSQL schema (Neon)
-- Database: attachtrack_db
-- =====================================================================
-- Conventions: snake_case, plural table names, UUID primary keys,
-- role strings: 'student' | 'industry_supervisor' | 'university_supervisor'
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------

CREATE TYPE user_role AS ENUM (
    'student',
    'industry_supervisor',
    'university_supervisor'
);

CREATE TYPE link_status AS ENUM (
    'linked',
    'unlinked'
);

CREATE TYPE submission_status AS ENUM (
    'pending_sync',
    'synced',
    'failed'
);

CREATE TYPE attendance_status AS ENUM (
    'present',
    'absent',
    'partial'
);

-- ---------------------------------------------------------------------
-- 1. USERS
-- ---------------------------------------------------------------------

CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(150) NOT NULL,
    email               CITEXT UNIQUE NOT NULL,
    password_hash       TEXT NOT NULL,
    role                user_role NOT NULL,
    email_verified      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role ON users(role);

-- ---------------------------------------------------------------------
-- 2. EMAIL VERIFICATION CODES
-- ---------------------------------------------------------------------

CREATE TABLE email_verifications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code                VARCHAR(10) NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    consumed_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_verifications_user ON email_verifications(user_id);

-- ---------------------------------------------------------------------
-- 3. REFRESH TOKENS
-- ---------------------------------------------------------------------

CREATE TABLE refresh_tokens (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash          TEXT NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    revoked             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- ---------------------------------------------------------------------
-- 4. INDUSTRY SUPERVISORS
-- ---------------------------------------------------------------------

CREATE TABLE industry_supervisors (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    company_name        VARCHAR(200),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 5. UNIVERSITY SUPERVISORS
-- ---------------------------------------------------------------------

CREATE TABLE university_supervisors (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    department          VARCHAR(200),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 6. STUDENTS
-- ---------------------------------------------------------------------

CREATE TABLE students (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name                        VARCHAR(150) NOT NULL,
    email                       CITEXT NOT NULL,
    industry_supervisor_id      UUID REFERENCES industry_supervisors(id) ON DELETE SET NULL,
    university_supervisor_id    UUID REFERENCES university_supervisors(id) ON DELETE SET NULL,
    link_status                 link_status NOT NULL DEFAULT 'unlinked',
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_students_email ON students(email);
CREATE INDEX idx_students_industry_supervisor ON students(industry_supervisor_id);
CREATE INDEX idx_students_university_supervisor ON students(university_supervisor_id);
CREATE INDEX idx_students_link_status ON students(link_status);

-- ---------------------------------------------------------------------
-- 7. PENDING LINKS
-- ---------------------------------------------------------------------

CREATE TABLE pending_links (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_email       CITEXT NOT NULL,
    student_name        VARCHAR(150) NOT NULL,
    supervisor_id       UUID NOT NULL,
    supervisor_role     user_role NOT NULL CHECK (
                            supervisor_role IN ('industry_supervisor','university_supervisor')
                        ),
    resolved            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pending_links_email ON pending_links(student_email);
CREATE INDEX idx_pending_links_resolved ON pending_links(resolved);

-- ---------------------------------------------------------------------
-- 8. SUBMISSIONS
-- ---------------------------------------------------------------------

CREATE TABLE submissions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_uuid         UUID UNIQUE NOT NULL,
    student_id          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    file_url            TEXT,
    file_name           VARCHAR(255),
    file_type           VARCHAR(350),
    submitted_at        TIMESTAMPTZ NOT NULL,
    synced_at           TIMESTAMPTZ,
    status               submission_status NOT NULL DEFAULT 'pending_sync',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at);

-- ---------------------------------------------------------------------
-- 9. FEEDBACK
-- ---------------------------------------------------------------------

CREATE TABLE feedback (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id              UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    industry_supervisor_id  UUID NOT NULL REFERENCES industry_supervisors(id) ON DELETE CASCADE,
    content                 TEXT NOT NULL,
    flagged_concern         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_student ON feedback(student_id);
CREATE INDEX idx_feedback_supervisor ON feedback(industry_supervisor_id);

-- ---------------------------------------------------------------------
-- 10. ATTENDANCE
-- ---------------------------------------------------------------------

CREATE TABLE attendance (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id              UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    industry_supervisor_id  UUID NOT NULL REFERENCES industry_supervisors(id) ON DELETE CASCADE,
    week_start_date         DATE NOT NULL,
    status                  attendance_status NOT NULL,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, week_start_date)
);

CREATE INDEX idx_attendance_student ON attendance(student_id);

-- ---------------------------------------------------------------------
-- 11. MESSAGES
-- ---------------------------------------------------------------------

CREATE TABLE messages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content             TEXT,
    attachment_url      TEXT,
    attachment_name     VARCHAR(255),
    sent_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at             TIMESTAMPTZ
);

CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at);

-- ---------------------------------------------------------------------
-- 12. GRADES
-- ---------------------------------------------------------------------

CREATE TABLE grades (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id                  UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
    university_supervisor_id    UUID NOT NULL REFERENCES university_supervisors(id) ON DELETE CASCADE,
    grade_value                 VARCHAR(10) NOT NULL,
    comments                    TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_grades_student ON grades(student_id);

-- =====================================================================
-- TRIGGER: auto-update `updated_at` columns
-- =====================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_grades_updated_at
    BEFORE UPDATE ON grades
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
