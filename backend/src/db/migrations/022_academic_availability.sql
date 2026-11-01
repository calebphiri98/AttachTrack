-- Academic availability is entered and confirmed by the Coordinator.
-- The university-wide public calendar is a reference, NOT an individual student's timetable.
CREATE TABLE IF NOT EXISTS student_academic_availability (
  student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  academic_year VARCHAR(20),
  attachment_start DATE,
  attachment_end DATE,
  expected_return_to_study DATE,
  final_semester BOOLEAN,
  coordinator_note VARCHAR(1000),
  confirmed_by UUID REFERENCES users(id),
  confirmed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT academic_attachment_order CHECK (
    attachment_start IS NULL OR attachment_end IS NULL OR attachment_start <= attachment_end
  )
);
INSERT INTO schema_migrations (filename)
VALUES ('022_academic_availability.sql') ON CONFLICT (filename) DO NOTHING;
