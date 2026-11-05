ALTER TABLE placements
  ADD COLUMN IF NOT EXISTS attachment_start_date DATE,
  ADD COLUMN IF NOT EXISTS attachment_end_date DATE;
