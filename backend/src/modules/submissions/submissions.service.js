const crypto = require('crypto');
const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const studentsService = require('../students/students.service');
const notificationsService = require('../notifications/notifications.service');
const { requireUuid, requireDate, optionalNumber } = require('../../utils/validators');
const { uploadBuffer } = require('../../utils/uploadToCloudinary');

const VALID_RECIPIENT_ROLES = ['industry_supervisor', 'university_supervisor'];

function deriveState(row) {
  if (row.file_url) {
    return 'submitted';
  }
  if (!row.due_date) {
    return 'open';
  }
  const isPastDue = new Date(row.due_date).getTime() < Date.now();
  if (!isPastDue) {
    return 'open';
  }
  return row.reopened_at ? 'reopened' : 'closed';
}

function withState(row) {
  return { ...row, state: deriveState(row) };
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

async function findRecipientUserIds(student, recipientRole) {
  if (recipientRole === 'university_supervisor') {
    if (!student.university_supervisor_id) return [];
    const { rows } = await db.query(
      'SELECT user_id FROM university_supervisors WHERE id = $1',
      [student.university_supervisor_id]
    );
    return rows.map((row) => row.user_id);
  }

  const { rows } = await db.query(
    `SELECT DISTINCT isup.user_id
     FROM industry_supervisors isup
     WHERE isup.id = $1
        OR isup.id IN (
          SELECT t.industry_supervisor_id
          FROM temp_supervisor_assignments t
          WHERE t.student_id = $2
            AND t.start_date <= CURRENT_DATE
            AND (t.end_date IS NULL OR t.end_date >= CURRENT_DATE)
        )`,
    [student.industry_supervisor_id, student.id]
  );
  return rows.map((row) => row.user_id);
}

async function notifySubmissionReceived(student, recipientRole, submission) {
  try {
    const userIds = await findRecipientUserIds(student, recipientRole);
    for (const userId of userIds) {
      await notificationsService.notifySafe({
        userId,
        type: 'submission_received',
        title: `New submission from ${student.name}`,
        body: `${student.name} submitted ${submission.file_name || 'a document'}.`,
        relatedId: submission.id,
      });
    }
  } catch (err) {
    console.error('[notifySubmissionReceived] failed:', err.message);
  }
}

async function notifyStudent(studentId, payload) {
  try {
    const { rows } = await db.query(
      'SELECT user_id FROM students WHERE id = $1 AND user_id IS NOT NULL',
      [studentId]
    );
    if (rows[0]) {
      await notificationsService.notifySafe({ userId: rows[0].user_id, ...payload });
    }
  } catch (err) {
    console.error('[notifyStudent] failed:', err.message);
  }
}

async function createSubmission({ studentUserId, file, clientUuid, recipientRole }) {
  if (!file) {
    throw new AppError('A file is required', 400);
  }

  if (!VALID_RECIPIENT_ROLES.includes(recipientRole)) {
    throw new AppError('recipientRole must be industry_supervisor or university_supervisor', 400);
  }

  const student = await studentsService.getByUserId(studentUserId);
  if (student.link_status !== 'linked') {
    throw new AppError(
      'You must be linked to a supervisor before you can submit documents',
      403
    );
  }

  if (recipientRole === 'industry_supervisor' && !student.industry_supervisor_id) {
    throw new AppError('You are not linked to an industry supervisor', 400);
  }
  if (recipientRole === 'university_supervisor' && !student.university_supervisor_id) {
    throw new AppError('You are not linked to a university supervisor', 400);
  }

  const finalClientUuid = clientUuid || crypto.randomUUID();

  const uploadResult = await uploadBuffer(file.buffer, {
    folder: `attachtrack/submissions/${student.id}`,
    filename: finalClientUuid,
  });

  const submittedAt = new Date();

  try {
    const { rows } = await db.query(
      `INSERT INTO submissions
        (client_uuid, student_id, recipient_role, file_url, file_name, file_type, submitted_at, synced_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now(), 'synced')
       RETURNING *`,
      [
        finalClientUuid,
        student.id,
        recipientRole,
        uploadResult.secure_url,
        file.originalname,
        file.mimetype,
        submittedAt,
      ]
    );

    await notifySubmissionReceived(student, recipientRole, rows[0]);

    return withState(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      const { rows } = await db.query('SELECT * FROM submissions WHERE client_uuid = $1', [
        finalClientUuid,
      ]);
      return withState(rows[0]);
    }
    throw err;
  }
}

async function createRequirement({ studentId, dueDate, supervisorContext }) {
  requireUuid(studentId, 'studentId');
  requireDate(dueDate, 'dueDate');

  const student = await studentsService.assertSupervises(
    studentId,
    supervisorContext.column,
    supervisorContext.id
  );

  const recipientRole =
    supervisorContext.column === 'industry_supervisor_id'
      ? 'industry_supervisor'
      : 'university_supervisor';

  const finalClientUuid = crypto.randomUUID();

  const { rows } = await db.query(
    `INSERT INTO submissions
       (client_uuid, student_id, recipient_role, due_date, status)
     VALUES ($1, $2, $3, $4, 'pending_sync')
     RETURNING *`,
    [finalClientUuid, student.id, recipientRole, dueDate]
  );

  await notifyStudent(student.id, {
    type: 'submission_requested',
    title: 'New submission requested',
    body: `Your supervisor has asked you to submit a document by ${formatDate(rows[0].due_date)}.`,
    relatedId: rows[0].id,
  });

  return withState(rows[0]);
}

async function fulfillRequirement({ submissionId, studentUserId, file }) {
  requireUuid(submissionId, 'submissionId');
  if (!file) {
    throw new AppError('A file is required', 400);
  }

  const student = await studentsService.getByUserId(studentUserId);

  const { rows: existingRows } = await db.query('SELECT * FROM submissions WHERE id = $1', [
    submissionId,
  ]);
  const submission = existingRows[0];
  if (!submission) {
    throw new AppError('Submission not found', 404);
  }
  if (submission.student_id !== student.id) {
    throw new AppError('This submission does not belong to you', 403);
  }
  if (submission.file_url) {
    throw new AppError('This submission has already been fulfilled', 409);
  }

  const state = deriveState(submission);
  if (state === 'closed') {
    throw new AppError(
      'This submission is past its due date and closed. Ask your supervisor to reopen it.',
      403
    );
  }

  const finalClientUuid = submission.client_uuid || crypto.randomUUID();

  const uploadResult = await uploadBuffer(file.buffer, {
    folder: `attachtrack/submissions/${student.id}`,
    filename: finalClientUuid,
  });

  const { rows } = await db.query(
    `UPDATE submissions
     SET file_url = $1,
         file_name = $2,
         file_type = $3,
         submitted_at = now(),
         synced_at = now(),
         status = 'synced'
     WHERE id = $4
     RETURNING *`,
    [uploadResult.secure_url, file.originalname, file.mimetype, submissionId]
  );

  await notifySubmissionReceived(student, submission.recipient_role, rows[0]);

  return withState(rows[0]);
}

async function reopenRequirement({ submissionId, supervisorContext, reopenedByUserId, penaltyPercent }) {
  requireUuid(submissionId, 'submissionId');
  const cleanPenalty = optionalNumber(penaltyPercent, 'penaltyPercent', { min: 0, max: 100 });

  const { rows: existingRows } = await db.query('SELECT * FROM submissions WHERE id = $1', [
    submissionId,
  ]);
  const submission = existingRows[0];
  if (!submission) {
    throw new AppError('Submission not found', 404);
  }

  await studentsService.assertSupervises(
    submission.student_id,
    supervisorContext.column,
    supervisorContext.id
  );

  const expectedRole =
    supervisorContext.column === 'industry_supervisor_id'
      ? 'industry_supervisor'
      : 'university_supervisor';
  if (submission.recipient_role !== expectedRole) {
    throw new AppError('You cannot reopen a submission addressed to a different supervisor role', 403);
  }

  if (submission.file_url) {
    throw new AppError('This submission has already been fulfilled, nothing to reopen', 400);
  }

  const state = deriveState(submission);
  if (state !== 'closed' && state !== 'reopened') {
    throw new AppError('This submission is not past its due date yet', 400);
  }

  const { rows } = await db.query(
    `UPDATE submissions
     SET reopened_at = now(),
         reopened_by = $1,
         penalty_percent = $2
     WHERE id = $3
     RETURNING *`,
    [reopenedByUserId, cleanPenalty, submissionId]
  );

  const penaltyText =
    Number(cleanPenalty) > 0 ? `, with a ${Number(cleanPenalty)}% mark deduction` : '';

  await notifyStudent(submission.student_id, {
    type: 'submission_reopened',
    title: 'A submission was reopened',
    body: `Your supervisor reopened a submission that was past its due date. You can now submit it${penaltyText}.`,
    relatedId: submissionId,
  });

  return withState(rows[0]);
}

async function listMine(studentUserId) {
  const student = await studentsService.getByUserId(studentUserId);
  const { rows } = await db.query(
    `SELECT id, recipient_role, file_url, file_name, file_type, submitted_at, synced_at, status,
            due_date, reopened_at, reopened_by, penalty_percent
     FROM submissions
     WHERE student_id = $1
     ORDER BY due_date ASC NULLS LAST, submitted_at DESC`,
    [student.id]
  );
  return rows.map(withState);
}

async function listForStudent(studentId, supervisorContext) {
  await studentsService.assertSupervises(studentId, supervisorContext.column, supervisorContext.id);

  const recipientRole =
    supervisorContext.column === 'industry_supervisor_id'
      ? 'industry_supervisor'
      : 'university_supervisor';

  const { rows } = await db.query(
    `SELECT id, recipient_role, file_url, file_name, file_type, submitted_at, synced_at, status,
            due_date, reopened_at, reopened_by, penalty_percent
     FROM submissions
     WHERE student_id = $1 AND recipient_role = $2
     ORDER BY due_date ASC NULLS LAST, submitted_at DESC`,
    [studentId, recipientRole]
  );
  return rows.map(withState);
}

module.exports = {
  createSubmission,
  createRequirement,
  fulfillRequirement,
  reopenRequirement,
  listMine,
  listForStudent,
};