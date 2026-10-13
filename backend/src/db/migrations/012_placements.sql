ALTER TABLE companies
    ADD COLUMN available_places INTEGER
    CHECK (available_places IS NULL OR available_places >= 0);

CREATE TYPE placement_status AS ENUM ('allocated', 'confirmed');

CREATE TABLE placements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    status          placement_status NOT NULL DEFAULT 'allocated',
    preference_note TEXT,
    allocated_by    UUID NOT NULL REFERENCES users(id),
    allocated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    confirmed_by    UUID REFERENCES users(id),
    confirmed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX placements_one_per_student ON placements(student_id);
CREATE INDEX idx_placements_company ON placements(company_id);
CREATE INDEX idx_placements_status ON placements(status);

INSERT INTO schema_migrations (filename) VALUES ('012_placements.sql')
ON CONFLICT (filename) DO NOTHING;