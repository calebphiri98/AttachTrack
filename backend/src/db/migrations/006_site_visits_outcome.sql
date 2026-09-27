-- 006_site_visits_outcome.sql
-- VARCHAR(50) rather than an enum for now since the requirements data
-- doesn't specify a fixed set of outcome values — tighten to an enum
-- later once the actual set (e.g. 'satisfactory' / 'needs_improvement' /
-- 'unsatisfactory') is confirmed.

ALTER TABLE site_visits ADD COLUMN outcome VARCHAR(50);

INSERT INTO schema_migrations (filename) VALUES ('006_site_visits_outcome.sql')
ON CONFLICT (filename) DO NOTHING;
