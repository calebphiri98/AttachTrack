CREATE TYPE result_status AS ENUM ('compiled', 'approved');

CREATE TABLE results (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id               UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
    industry_assessment_id   UUID NOT NULL REFERENCES assessments(id),
    university_assessment_id UUID NOT NULL REFERENCES assessments(id),
    industry_percent         NUMERIC(6,2) NOT NULL,
    university_percent       NUMERIC(6,2) NOT NULL,
    industry_weight          NUMERIC(5,2) NOT NULL,
    university_weight        NUMERIC(5,2) NOT NULL,
    final_percent            NUMERIC(6,2) NOT NULL,
    status                   result_status NOT NULL DEFAULT 'compiled',
    compiled_by              UUID NOT NULL REFERENCES users(id),
    compiled_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_to_hod_at           TIMESTAMPTZ,
    approved_by              UUID REFERENCES users(id),
    approved_at              TIMESTAMPTZ,
    released_by              UUID REFERENCES users(id),
    released_at              TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_results_status ON results(status);

INSERT INTO schema_migrations (filename) VALUES ('015_results.sql')
ON CONFLICT (filename) DO NOTHING;