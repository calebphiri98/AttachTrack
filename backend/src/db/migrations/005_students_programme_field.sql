-- 005_students_programme_field.sql
-- Before running this, check students.service.js and the registration form —
-- you may already be capturing programme/field of study under a different
-- name at registration time, in which case this becomes a rename decision
-- (out of scope for an additive migration) rather than a new column.

ALTER TABLE students ADD COLUMN programme VARCHAR(200);

INSERT INTO schema_migrations (filename) VALUES ('005_students_programme_field.sql')
ON CONFLICT (filename) DO NOTHING;
