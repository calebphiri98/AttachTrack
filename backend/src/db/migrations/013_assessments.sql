CREATE TYPE assessment_kind AS ENUM ('industry', 'university');
CREATE TYPE assessment_status AS ENUM ('draft', 'submitted');

CREATE TABLE assessment_forms (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind           assessment_kind NOT NULL UNIQUE,
    title          VARCHAR(200) NOT NULL,
    weight_percent NUMERIC(5,2) NOT NULL CHECK (weight_percent >= 0 AND weight_percent <= 100),
    confirmed_at   TIMESTAMPTZ,
    confirmed_by   UUID REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE assessment_criteria (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id     UUID NOT NULL REFERENCES assessment_forms(id) ON DELETE CASCADE,
    label       VARCHAR(200) NOT NULL,
    description TEXT,
    max_marks   NUMERIC(5,2) NOT NULL CHECK (max_marks > 0),
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assessment_criteria_form ON assessment_criteria(form_id);

CREATE TABLE assessments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    kind             assessment_kind NOT NULL,
    assessor_user_id UUID NOT NULL REFERENCES users(id),
    comments         TEXT,
    status           assessment_status NOT NULL DEFAULT 'draft',
    total_marks      NUMERIC(7,2),
    max_total        NUMERIC(7,2),
    submitted_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, kind)
);

CREATE TABLE assessment_scores (
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    criterion_id  UUID NOT NULL REFERENCES assessment_criteria(id) ON DELETE RESTRICT,
    label         VARCHAR(200) NOT NULL,
    max_marks     NUMERIC(5,2) NOT NULL,
    marks         NUMERIC(5,2) NOT NULL CHECK (marks >= 0),
    remark        TEXT,
    PRIMARY KEY (assessment_id, criterion_id)
);

CREATE INDEX idx_assessment_scores_criterion ON assessment_scores(criterion_id);

WITH f AS (
    INSERT INTO assessment_forms (kind, title, weight_percent)
    VALUES ('industry', 'Industrial supervisor assessment (SAMPLE - replace with the department form)', 40)
    RETURNING id
)
INSERT INTO assessment_criteria (form_id, label, description, max_marks, sort_order)
SELECT f.id, c.label, c.description, c.max_marks, c.sort_order
FROM f,
     (VALUES
        ('Attendance and punctuality', 'Reports on time and keeps the agreed working hours.', 15, 1),
        ('Quality of work', 'Accuracy, neatness and completeness of assigned tasks.', 20, 2),
        ('Technical competence', 'Applies knowledge and skills from the programme.', 20, 3),
        ('Initiative and problem solving', 'Works independently and finds solutions.', 15, 4),
        ('Teamwork and communication', 'Works well with colleagues and communicates clearly.', 15, 5),
        ('Professional conduct', 'Behaviour, ethics and respect for workplace rules.', 15, 6)
     ) AS c(label, description, max_marks, sort_order);

INSERT INTO assessment_forms (kind, title, weight_percent)
VALUES ('university', 'University supervisor assessment (SAMPLE - replace with the department rubric)', 60);

INSERT INTO schema_migrations (filename) VALUES ('013_assessments.sql')
ON CONFLICT (filename) DO NOTHING;