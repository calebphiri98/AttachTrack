-- 001_temp_industry_supervisors.sql
-- New table (not a column on students) so we get full history.
-- "Currently assigned" temp supervisor for a student = the row where
-- end_date IS NULL. Assigning a new one = close the old row
-- (end_date = now()) and insert a new one, in a transaction.

CREATE TABLE temp_supervisor_assignments (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id                  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    industry_supervisor_id      UUID NOT NULL REFERENCES industry_supervisors(id) ON DELETE CASCADE,
    assigned_by_university_id   UUID NOT NULL REFERENCES university_supervisors(id),
    department                  VARCHAR(200),
    start_date                  DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date                    DATE,  -- NULL = currently active
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_temp_supervisor_student ON temp_supervisor_assignments(student_id);
CREATE INDEX idx_temp_supervisor_active ON temp_supervisor_assignments(student_id) WHERE end_date IS NULL;

INSERT INTO schema_migrations (filename) VALUES ('001_temp_industry_supervisors.sql')
ON CONFLICT (filename) DO NOTHING;
