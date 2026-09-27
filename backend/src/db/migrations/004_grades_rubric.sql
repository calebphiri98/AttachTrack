-- 004_grades_rubric.sql
-- Additive columns first (simplest path). A full configurable-rubric table
-- is a reasonable Phase 2 stretch goal once this is working, not required
-- for Phase 1. Existing grade_value rows are untouched; computed_final_score
-- is populated by the service layer once the weighting formula is confirmed
-- with the industrial supervisor — do not hardcode a formula in this migration.

ALTER TABLE grades
    ADD COLUMN attendance_score NUMERIC(5,2),
    ADD COLUMN presentation_score NUMERIC(5,2),
    ADD COLUMN computed_final_score NUMERIC(5,2);

INSERT INTO schema_migrations (filename) VALUES ('004_grades_rubric.sql')
ON CONFLICT (filename) DO NOTHING;
