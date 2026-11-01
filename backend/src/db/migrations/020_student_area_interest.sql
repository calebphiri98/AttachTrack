ALTER TABLE students ADD COLUMN IF NOT EXISTS area_interest VARCHAR(300);

INSERT INTO schema_migrations (filename)
VALUES ('020_student_area_interest.sql')
ON CONFLICT (filename) DO NOTHING;
