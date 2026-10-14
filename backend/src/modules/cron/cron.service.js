const db = require('../../config/db');
const notificationsService = require('../notifications/notifications.service');
const attendanceService = require('../attendance/attendance.service');

const MAX_NAMES_LISTED = 10;

async function checkMissedSubmissions() {
  const { rows } = await db.query(
    `SELECT s.id AS submission_id,
            s.recipient_role,
            st.name AS student_name,
            isup.user_id AS industry_user_id,
            usup.user_id AS university_user_id
     FROM submissions s
     JOIN students st ON st.id = s.student_id
     LEFT JOIN industry_supervisors isup ON isup.id = st.industry_supervisor_id
     LEFT JOIN university_supervisors usup ON usup.id = st.university_supervisor_id
     WHERE s.file_url IS NULL
       AND s.due_date IS NOT NULL
       AND s.due_date < now()
       AND s.notified_at IS NULL`
  );

  let notifiedCount = 0;

  for (const row of rows) {
    const isIndustry = row.recipient_role === 'industry_supervisor';
    const supervisorUserId = isIndustry ? row.industry_user_id : row.university_user_id;

    if (supervisorUserId) {
      const sent = await notificationsService.notifySafe({
        userId: supervisorUserId,
        type: 'missed_submission',
        title: `Missed submission: ${row.student_name}`,
        body: `${row.student_name} did not submit their required document by the due date.`,
        relatedId: row.submission_id,
      });

      if (sent) {
        notifiedCount += 1;
      }
    }

    await db.query('UPDATE submissions SET notified_at = now() WHERE id = $1', [row.submission_id]);
  }

  return { checked: rows.length, notified: notifiedCount };
}

async function checkMissedAttendance() {
  const reminderDays = await attendanceService.getSettingNumber('attendance_reminder_days', 7);
  if (reminderDays <= 0) {
    return { checked: 0, notified: 0 };
  }

  const { rows } = await db.query(
    `SELECT u.id AS user_id,
            array_agg(DISTINCT st.name ORDER BY st.name) AS student_names
     FROM students st
     JOIN industry_supervisors isup
       ON isup.id = st.industry_supervisor_id
       OR EXISTS (
            SELECT 1
            FROM temp_supervisor_assignments t
            WHERE t.student_id = st.id
              AND t.industry_supervisor_id = isup.id
              AND t.start_date <= CURRENT_DATE
              AND (t.end_date IS NULL OR t.end_date >= CURRENT_DATE)
          )
     JOIN users u ON u.id = isup.user_id AND u.is_active = TRUE
     LEFT JOIN LATERAL (
       SELECT MAX(a.attendance_date) AS last_date
       FROM attendance a
       WHERE a.student_id = st.id
     ) la ON TRUE
     WHERE st.user_id IS NOT NULL
       AND COALESCE(la.last_date, st.created_at::date) <= CURRENT_DATE - $1::int
       AND NOT EXISTS (
         SELECT 1
         FROM notifications n
         WHERE n.user_id = u.id
           AND n.type = 'missed_attendance'
           AND n.created_at >= now() - make_interval(days => $1::int)
       )
     GROUP BY u.id`,
    [reminderDays]
  );

  let notifiedCount = 0;

  for (const row of rows) {
    const names = row.student_names;
    const listed = names.slice(0, MAX_NAMES_LISTED).join(', ');
    const remaining = names.length - MAX_NAMES_LISTED;
    const suffix = remaining > 0 ? ` and ${remaining} more` : '';
    const count = names.length;

    const sent = await notificationsService.notifySafe({
      userId: row.user_id,
      type: 'missed_attendance',
      title: 'Attendance not recorded',
      body: `${count} student${count === 1 ? ' has' : 's have'} had no attendance recorded for ${reminderDays} days or more: ${listed}${suffix}.`,
    });

    if (sent) {
      notifiedCount += 1;
    }
  }

  return { checked: rows.length, notified: notifiedCount };
}

module.exports = { checkMissedSubmissions, checkMissedAttendance };