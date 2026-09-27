const db = require('../../config/db');
const notificationsService = require('../notifications/notifications.service');
const { sendNotificationEmail } = require('../../config/mailer');

async function checkMissedSubmissions() {
  const { rows } = await db.query(
    `SELECT s.id AS submission_id, s.due_date, s.recipient_role,
            st.id AS student_id, st.name AS student_name,
            iu.id AS industry_user_id, iu.name AS industry_name, iu.email AS industry_email,
            uu.id AS university_user_id, uu.name AS university_name, uu.email AS university_email
     FROM submissions s
     JOIN students st ON st.id = s.student_id
     LEFT JOIN industry_supervisors isup ON isup.id = st.industry_supervisor_id
     LEFT JOIN users iu ON iu.id = isup.user_id
     LEFT JOIN university_supervisors usup ON usup.id = st.university_supervisor_id
     LEFT JOIN users uu ON uu.id = usup.user_id
     WHERE s.file_url IS NULL
       AND s.due_date IS NOT NULL
       AND s.due_date < now()
       AND s.notified_at IS NULL`
  );

  let notifiedCount = 0;

  for (const row of rows) {
    const isIndustry = row.recipient_role === 'industry_supervisor';
    const supervisorUserId = isIndustry ? row.industry_user_id : row.university_user_id;
    const supervisorName = isIndustry ? row.industry_name : row.university_name;
    const supervisorEmail = isIndustry ? row.industry_email : row.university_email;

    if (supervisorUserId) {
      const title = `Missed submission: ${row.student_name}`;
      const body = `${row.student_name} did not submit their required document by the due date.`;

      await notificationsService.create({
        userId: supervisorUserId,
        type: 'missed_submission',
        title,
        body,
        relatedId: row.submission_id,
      });

      await sendNotificationEmail(
        supervisorEmail,
        supervisorName,
        title,
        body,
        `<div style="font-family:sans-serif;max-width:520px"><h2>${title}</h2><p>${body}</p></div>`
      );

      notifiedCount += 1;
    }

    await db.query('UPDATE submissions SET notified_at = now() WHERE id = $1', [row.submission_id]);
  }

  return { checked: rows.length, notified: notifiedCount };
}

async function checkMissedAttendance() {
  const { rows } = await db.query(
    `SELECT st.id AS student_id, st.user_id, u.name AS student_name, u.email AS student_email
     FROM students st
     JOIN users u ON u.id = st.user_id
     WHERE st.industry_supervisor_id IS NOT NULL
       AND st.user_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM attendance a
         WHERE a.student_id = st.id
           AND a.week_start_date = date_trunc('week', CURRENT_DATE)::date
       )
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
         WHERE n.user_id = st.user_id
           AND n.type = 'missed_attendance'
           AND n.created_at >= date_trunc('week', now())
       )`
  );

  for (const row of rows) {
    const title = 'Attendance reminder';
    const body = 'You have not marked your attendance for this week yet.';

    await notificationsService.create({
      userId: row.user_id,
      type: 'missed_attendance',
      title,
      body,
      relatedId: row.student_id,
    });

    await sendNotificationEmail(
      row.student_email,
      row.student_name,
      title,
      body,
      `<div style="font-family:sans-serif;max-width:520px"><h2>${title}</h2><p>${body}</p></div>`
    );
  }

  return { checked: rows.length, notified: rows.length };
}

module.exports = { checkMissedSubmissions, checkMissedAttendance };
