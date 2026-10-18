UPDATE students
SET link_status = (CASE
  WHEN user_id IS NOT NULL
       AND industry_supervisor_id IS NOT NULL
       AND university_supervisor_id IS NOT NULL
  THEN 'linked'
  ELSE 'unlinked'
END)::link_status
WHERE link_status IS DISTINCT FROM (CASE
  WHEN user_id IS NOT NULL
       AND industry_supervisor_id IS NOT NULL
       AND university_supervisor_id IS NOT NULL
  THEN 'linked'
  ELSE 'unlinked'
END)::link_status;
