const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { requireUuid, requireString, optionalString } = require('../../utils/validators');
const studentsService = require('../students/students.service');
const notificationsService = require('../notifications/notifications.service');
const { uploadBuffer } = require('../../utils/uploadToCloudinary');

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BACK_DAYS = 90;
const MAX_FILES = 5;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const ENTRY_SELECT = `
  SELECT e.id,
         e.student_id,
         to_char(e.entry_date, 'YYYY-MM-DD') AS entry_date,
         to_char(date_trunc('week', e.entry_date::timestamp)::date, 'YYYY-MM-DD') AS week_start,
         to_char(e.start_time, 'HH24:MI') AS start_time,
         to_char(e.end_time, 'HH24:MI') AS end_time,
         e.activity,
         e.description,
         e.skills_learned,
         e.challenges,
         e.tools_used,
         e.notes,
         e.status,
         e.review_comment,
         e.reviewed_at,
         e.submitted_at,
         e.created_at,
         e.updated_at,
         COALESCE(
           (SELECT json_agg(
                     json_build_object('id', f.id, 'url', f.file_url, 'name', f.file_name, 'type', f.file_type)
                     ORDER BY f.created_at)
            FROM logbook_entry_files f
            WHERE f.entry_id = e.id),
           '[]'::json
         ) AS files
  FROM logbook_entries e`;

function parseDateString(value, name) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError(`${name} must be a date in YYYY-MM-DD format`, 400);
  }
  const time = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) {
    throw new AppError(`${name} is not a valid date`, 400);
  }
  return time;
}

function todayTime() {
  return Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
}

function cleanTime(value, name) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !TIME_PATTERN.test(value)) {
    throw new AppError(`${name} must be a time in HH:MM format`, 400);
  }
  return value;
}

function toMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function parseWeekStart(value) {
  const time = parseDateString(value, 'weekStart');
  if (new Date(time).getUTCDay() !== 1) {
    throw new AppError('weekStart must be a Monday', 400);
  }
  return time;
}

function formatWeek(time) {
  return new Date(time).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function cleanFields(fields) {
  const entryTime = parseDateString(fields.entryDate, 'entryDate');
  const today = todayTime();

  if (entryTime > today + DAY_MS) {
    throw new AppError('Entries cannot be dated in the future', 400);
  }
  if (today - entryTime > MAX_BACK_DAYS * DAY_MS) {
    throw new AppError(`Entries cannot be older than ${MAX_BACK_DAYS} days`, 400);
  }

  const startTime = cleanTime(fields.startTime, 'Start time');
  const endTime = cleanTime(fields.endTime, 'End time');
  if (startTime && endTime && toMinutes(endTime) <= toMinutes(startTime)) {
    throw new AppError('The end time must be after the start time', 400);
  }

  return {
    entryDate: fields.entryDate,
    startTime,
    endTime,
    activity: requireString(fields.activity, 'Task', { min: 1, max: 500 }),
    description: optionalString(fields.description, { max: 4000 }),
    skillsLearned: optionalString(fields.skillsLearned, { max: 2000 }),
    challenges: optionalString(fields.challenges, { max: 2000 }),
    toolsUsed: optionalString(fields.toolsUsed, { max: 1000 }),
  };
}

function assertSubmittable(clean) {
  if (!clean.description) {
    throw new AppError('Add a description before submitting', 400);
  }
}

async function uploadFiles(studentId, files) {
  const list = files || [];
  if (list.length > MAX_FILES) {
    throw new AppError(`You can attach at most ${MAX_FILES} files to one entry`, 400);
  }

  const uploaded = [];
  for (const file of list) {
    const upload = await uploadBuffer(file.buffer, {
      folder: `attachtrack/logbooks/${studentId}`,
      filename: `${Date.now()}-${file.originalname}`,
    });
    uploaded.push({ url: upload.secure_url, name: file.originalname, type: file.mimetype });
  }
  return uploaded;
}

async function saveFiles(entryId, uploaded) {
  for (const file of uploaded) {
    await db.query(
      `INSERT INTO logbook_entry_files (entry_id, file_url, file_name, file_type)
       VALUES ($1, $2, $3, $4)`,
      [entryId, file.url, file.name, file.type]
    );
  }
}

async function fetchEntries(whereSql, params) {
  const { rows } = await db.query(
    `${ENTRY_SELECT}
     ${whereSql}
     ORDER BY e.entry_date DESC, e.start_time DESC NULLS LAST, e.created_at DESC`,
    params
  );
  return rows;
}

async function getEntry(entryId) {
  const rows = await fetchEntries('WHERE e.id = $1', [entryId]);
  return rows[0];
}

async function notifyIndustrySupervisors(student) {
  try {
    const { rows } = await db.query(
      `SELECT isup.user_id
       FROM industry_supervisors isup
       WHERE isup.id = $1::uuid
       UNION
       SELECT isup.user_id
       FROM temp_supervisor_assignments t
       JOIN industry_supervisors isup ON isup.id = t.industry_supervisor_id
       WHERE t.student_id = $2::uuid AND t.end_date IS NULL`,
      [student.industry_supervisor_id, student.id]
    );

    for (const row of rows) {
      const { rows: recent } = await db.query(
        `SELECT 1
         FROM notifications
         WHERE user_id = $1
           AND type = 'logbook_submitted'
           AND related_id = $2
           AND created_at > now() - interval '60 minutes'
         LIMIT 1`,
        [row.user_id, student.id]
      );
      if (recent.length > 0) continue;

      await notificationsService.notifySafe({
        userId: row.user_id,
        type: 'logbook_submitted',
        title: `Logbook entries submitted: ${student.name}`,
        body: `${student.name} submitted logbook entries for your review.`,
        relatedId: student.id,
      });
    }
  } catch (err) {
    console.error('[notifyIndustrySupervisors] failed:', err.message);
  }
}

async function listForStudent(studentId, requester) {
  requireUuid(studentId, 'studentId');
  const student = await studentsService.getById(studentId);

  const isOwnRecord = requester.role === 'student' && student.user_id === requester.id;
  const isIndustrySupervisor =
    requester.role === 'industry_supervisor' &&
    Boolean(requester.supervisorId) &&
    (await studentsService.isIndustrySupervisorOf(student, requester.supervisorId));
  const isUniversitySupervisor =
    requester.role === 'university_supervisor' &&
    requester.supervisorId === student.university_supervisor_id;
  const isOversight = requester.role === 'admin' || requester.role === 'hod';

  if (!isOwnRecord && !isIndustrySupervisor && !isUniversitySupervisor && !isOversight) {
    throw new AppError('You do not have access to this student logbook', 403);
  }

  const where = isOwnRecord
    ? 'WHERE e.student_id = $1'
    : "WHERE e.student_id = $1 AND e.status <> 'draft'";

  return fetchEntries(where, [studentId]);
}

async function listMine(userId) {
  const student = await studentsService.getByUserId(userId);
  return listForStudent(student.id, { role: 'student', id: userId });
}

async function createEntry({ userId, fields, files, submit, clientUuid }) {
  const student = await studentsService.getByUserId(userId);

  if (clientUuid) {
    requireUuid(clientUuid, 'clientUuid');
    const { rows: existing } = await db.query(
      'SELECT id FROM logbook_entries WHERE client_uuid = $1 AND student_id = $2',
      [clientUuid, student.id]
    );
    if (existing[0]) {
      return getEntry(existing[0].id);
    }
  }

  const clean = cleanFields(fields);
  if (submit) assertSubmittable(clean);

  const uploaded = await uploadFiles(student.id, files);

  const { rows } = await db.query(
    `INSERT INTO logbook_entries
       (student_id, entry_date, start_time, end_time, activity, description, skills_learned,
        challenges, tools_used, status, submitted_at, client_uuid)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::logbook_status, $11, $12)
     RETURNING id`,
    [
      student.id,
      clean.entryDate,
      clean.startTime,
      clean.endTime,
      clean.activity,
      clean.description,
      clean.skillsLearned,
      clean.challenges,
      clean.toolsUsed,
      submit ? 'submitted' : 'draft',
      submit ? new Date() : null,
      clientUuid || null,
    ]
  );

  await saveFiles(rows[0].id, uploaded);

  if (submit) {
    await notifyIndustrySupervisors(student);
  }

  return getEntry(rows[0].id);
}

async function updateEntry({ userId, entryId, fields, files, removeFileIds, submit }) {
  requireUuid(entryId, 'entryId');
  const student = await studentsService.getByUserId(userId);

  const { rows: existingRows } = await db.query(
    'SELECT id, status FROM logbook_entries WHERE id = $1 AND student_id = $2',
    [entryId, student.id]
  );
  const existing = existingRows[0];
  if (!existing) {
    throw new AppError('Logbook entry not found', 404);
  }
  if (!['draft', 'returned'].includes(existing.status)) {
    throw new AppError(
      existing.status === 'approved'
        ? 'This entry has been approved and is locked. It can no longer be edited.'
        : 'This entry has been submitted and can no longer be edited',
      409,
      'RECORD_LOCKED'
    );
  }

  const clean = cleanFields(fields);
  if (submit) assertSubmittable(clean);

  const removeIds = removeFileIds || [];
  removeIds.forEach((id) => requireUuid(id, 'removeFileIds'));

  const { rows: countRows } = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM logbook_entry_files
     WHERE entry_id = $1 AND NOT (id = ANY($2::uuid[]))`,
    [entryId, removeIds]
  );
  if (countRows[0].count + (files || []).length > MAX_FILES) {
    throw new AppError(`You can attach at most ${MAX_FILES} files to one entry`, 400);
  }

  const uploaded = await uploadFiles(student.id, files);

  const { rows } = await db.query(
    `UPDATE logbook_entries
     SET entry_date = $3,
         start_time = $4,
         end_time = $5,
         activity = $6,
         description = $7,
         skills_learned = $8,
         challenges = $9,
         tools_used = $10,
         status = CASE WHEN $11::boolean THEN 'submitted'::logbook_status ELSE status END,
         submitted_at = CASE WHEN $11::boolean THEN now() ELSE submitted_at END,
         reviewed_by = CASE WHEN $11::boolean THEN NULL ELSE reviewed_by END,
         reviewed_at = CASE WHEN $11::boolean THEN NULL ELSE reviewed_at END,
         review_comment = CASE WHEN $11::boolean THEN NULL ELSE review_comment END,
         updated_at = now()
     WHERE id = $1 AND student_id = $2 AND status IN ('draft', 'returned')
     RETURNING id`,
    [
      entryId,
      student.id,
      clean.entryDate,
      clean.startTime,
      clean.endTime,
      clean.activity,
      clean.description,
      clean.skillsLearned,
      clean.challenges,
      clean.toolsUsed,
      Boolean(submit),
    ]
  );

  if (rows.length === 0) {
    throw new AppError('This entry has been submitted and can no longer be edited', 409, 'RECORD_LOCKED');
  }

  if (removeIds.length > 0) {
    await db.query(
      'DELETE FROM logbook_entry_files WHERE entry_id = $1 AND id = ANY($2::uuid[])',
      [entryId, removeIds]
    );
  }
  await saveFiles(entryId, uploaded);

  if (submit) {
    await notifyIndustrySupervisors(student);
  }

  return getEntry(entryId);
}

async function addFiles({ userId, entryId, files }) {
  requireUuid(entryId, 'entryId');
  const student = await studentsService.getByUserId(userId);

  const { rows: existingRows } = await db.query(
    'SELECT id, status FROM logbook_entries WHERE id = $1 AND student_id = $2',
    [entryId, student.id]
  );
  const existing = existingRows[0];
  if (!existing) {
    throw new AppError('Logbook entry not found', 404);
  }
  if (!['draft', 'returned'].includes(existing.status)) {
    throw new AppError(
      existing.status === 'approved'
        ? 'This entry has been approved and is locked. Files can no longer be added.'
        : 'This entry has been submitted. Files can no longer be added.',
      409,
      'RECORD_LOCKED'
    );
  }

  if (!files || files.length === 0) {
    throw new AppError('Choose at least one file to upload', 400);
  }

  const { rows: countRows } = await db.query(
    'SELECT COUNT(*)::int AS count FROM logbook_entry_files WHERE entry_id = $1',
    [entryId]
  );
  if (countRows[0].count + files.length > MAX_FILES) {
    throw new AppError(`You can attach at most ${MAX_FILES} files to one entry`, 400);
  }

  const uploaded = await uploadFiles(student.id, files);
  await saveFiles(entryId, uploaded);
  return getEntry(entryId);
}

async function deleteEntry({ userId, entryId }) {
  requireUuid(entryId, 'entryId');
  const student = await studentsService.getByUserId(userId);

  const { rows } = await db.query(
    `DELETE FROM logbook_entries
     WHERE id = $1 AND student_id = $2 AND status = 'draft'
     RETURNING id`,
    [entryId, student.id]
  );

  if (rows.length === 0) {
    const { rows: existing } = await db.query(
      'SELECT status FROM logbook_entries WHERE id = $1 AND student_id = $2',
      [entryId, student.id]
    );
    if (existing[0]) {
      throw new AppError(
        existing[0].status === 'approved'
          ? 'This entry has been approved and is locked. It cannot be deleted.'
          : 'Only drafts can be deleted',
        409,
        'RECORD_LOCKED'
      );
    }
    throw new AppError('Logbook entry not found', 404);
  }

  return { deleted: true };
}

async function submitEntry({ userId, entryId }) {
  requireUuid(entryId, 'entryId');
  const student = await studentsService.getByUserId(userId);

  const { rows } = await db.query(
    `UPDATE logbook_entries
     SET status = 'submitted',
         submitted_at = now(),
         reviewed_by = NULL,
         reviewed_at = NULL,
         review_comment = NULL,
         updated_at = now()
     WHERE id = $1
       AND student_id = $2
       AND status IN ('draft', 'returned')
       AND COALESCE(description, '') <> ''
     RETURNING id`,
    [entryId, student.id]
  );

  if (rows.length === 0) {
    const { rows: existing } = await db.query(
      'SELECT status FROM logbook_entries WHERE id = $1 AND student_id = $2',
      [entryId, student.id]
    );
    if (!existing[0]) {
      throw new AppError('Logbook entry not found', 404);
    }
    if (!['draft', 'returned'].includes(existing[0].status)) {
      throw new AppError(
        existing[0].status === 'approved'
          ? 'This entry has been approved and is locked.'
          : 'This entry has already been submitted',
        409,
        'RECORD_LOCKED'
      );
    }
    throw new AppError('Add a description before submitting', 400);
  }

  await notifyIndustrySupervisors(student);
  return getEntry(entryId);
}

async function submitWeek({ userId, weekStart }) {
  const weekTime = parseWeekStart(weekStart);
  const student = await studentsService.getByUserId(userId);

  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) FILTER (WHERE COALESCE(description, '') <> '')::int AS ready,
            COUNT(*) FILTER (WHERE COALESCE(description, '') = '')::int AS missing
     FROM logbook_entries
     WHERE student_id = $1
       AND status IN ('draft', 'returned')
       AND entry_date >= $2::date
       AND entry_date < ($2::date + 7)`,
    [student.id, weekStart]
  );

  if (countRows[0].ready === 0) {
    if (countRows[0].missing > 0) {
      throw new AppError('Add a description to your entries before submitting the week', 400);
    }
    throw new AppError(`There are no entries to submit for the week of ${formatWeek(weekTime)}`, 409);
  }

  const { rows } = await db.query(
    `UPDATE logbook_entries
     SET status = 'submitted',
         submitted_at = now(),
         reviewed_by = NULL,
         reviewed_at = NULL,
         review_comment = NULL,
         updated_at = now()
     WHERE student_id = $1
       AND status IN ('draft', 'returned')
       AND COALESCE(description, '') <> ''
       AND entry_date >= $2::date
       AND entry_date < ($2::date + 7)
     RETURNING id`,
    [student.id, weekStart]
  );

  await notifyIndustrySupervisors(student);
  return { submitted: rows.length, skipped: countRows[0].missing };
}

async function reviewWeek({ supervisorContext, userId, studentId, weekStart, decision, comment }) {
  requireUuid(studentId, 'studentId');
  if (!supervisorContext || supervisorContext.column !== 'industry_supervisor_id') {
    throw new AppError('Only industrial supervisors can review the logbook', 403);
  }
  if (!['approve', 'return'].includes(decision)) {
    throw new AppError('decision must be approve or return', 400);
  }

  const weekTime = parseWeekStart(weekStart);
  const cleanComment = optionalString(comment, { max: 2000 });
  if (decision === 'return' && !cleanComment) {
    throw new AppError('Add a comment explaining what needs to be fixed', 400);
  }

  const student = await studentsService.assertSupervises(
    studentId,
    'industry_supervisor_id',
    supervisorContext.id
  );

  const newStatus = decision === 'approve' ? 'approved' : 'returned';

  const { rows } = await db.query(
    `UPDATE logbook_entries
     SET status = $3::logbook_status,
         reviewed_by = $4,
         reviewed_at = now(),
         review_comment = $5,
         updated_at = now()
     WHERE student_id = $1
       AND status = 'submitted'
       AND entry_date >= $2::date
       AND entry_date < ($2::date + 7)
     RETURNING id`,
    [studentId, weekStart, newStatus, userId, cleanComment]
  );

  if (rows.length === 0) {
    throw new AppError('There are no submitted entries to review in that week', 409);
  }

  await db.query(
    `INSERT INTO logbook_week_reviews (student_id, week_start, decision, comment, entry_count, reviewed_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [studentId, weekStart, newStatus, cleanComment, rows.length, userId]
  );

  if (student.user_id) {
    const count = rows.length;
    const weekLabel = formatWeek(weekTime);
    const body =
      newStatus === 'approved'
        ? `Your industrial supervisor approved ${count} logbook entr${count === 1 ? 'y' : 'ies'} for the week of ${weekLabel}.`
        : `Your industrial supervisor returned ${count} logbook entr${count === 1 ? 'y' : 'ies'} for the week of ${weekLabel}.\n\n${cleanComment}`;

    await notificationsService.notifySafe({
      userId: student.user_id,
      type: 'logbook_reviewed',
      title: newStatus === 'approved' ? 'Logbook approved' : 'Logbook returned for changes',
      body,
      relatedId: studentId,
    });
  }

  return { reviewed: rows.length, decision: newStatus };
}

module.exports = {
  listMine,
  listForStudent,
  createEntry,
  updateEntry,
  addFiles,
  deleteEntry,
  submitEntry,
  submitWeek,
  reviewWeek,
};

