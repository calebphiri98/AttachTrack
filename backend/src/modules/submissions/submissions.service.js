const crypto = require('crypto');
const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const studentsService = require('../students/students.service');
const { uploadBuffer } = require('../../utils/uploadToCloudinary');

async function createSubmission({ studentUserId, file, clientUuid }) {
  if (!file) {
    throw new AppError('A file is required', 400);
  }

  const student = await studentsService.getByUserId(studentUserId);
  if (student.link_status !== 'linked') {
    throw new AppError(
      'You must be linked to a supervisor before you can submit documents',
      403
    );
  }

  // In Phase 3 (online-only) the server can safely generate this if the
  // client didn't send one. Once offline submission (Phase 6) lands, the
  // client generates it itself at "Submit" time, before this endpoint is
  // even reachable — this fallback just keeps things working either way.
  const finalClientUuid = clientUuid || crypto.randomUUID();

  const uploadResult = await uploadBuffer(file.buffer, {
    folder: `attachtrack/submissions/${student.id}`,
    filename: finalClientUuid,
  });

  const submittedAt = new Date();

  try {
    const { rows } = await db.query(
      `INSERT INTO submissions
        (client_uuid, student_id, file_url, file_name, file_type, submitted_at, synced_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, now(), 'synced')
       RETURNING *`,
      [
        finalClientUuid,
        student.id,
        uploadResult.secure_url,
        file.originalname,
        file.mimetype,
        submittedAt,
      ]
    );
    return rows[0];
  } catch (err) {
    if (err.code === '23505') {
      // Same client_uuid already recorded (a retry) — return the existing
      // row instead of erroring, since this is exactly the dedup behavior
      // the schema's client_uuid unique constraint exists for.
      const { rows } = await db.query('SELECT * FROM submissions WHERE client_uuid = $1', [
        finalClientUuid,
      ]);
      return rows[0];
    }
    throw err;
  }
}

async function listMine(studentUserId) {
  const student = await studentsService.getByUserId(studentUserId);
  const { rows } = await db.query(
    `SELECT id, file_url, file_name, file_type, submitted_at, synced_at, status
     FROM submissions
     WHERE student_id = $1
     ORDER BY submitted_at DESC`,
    [student.id]
  );
  return rows;
}

// supervisorContext = { column: 'industry_supervisor_id' | 'university_supervisor_id', id: supervisorRowId }
async function listForStudent(studentId, supervisorContext) {
  await studentsService.assertSupervises(studentId, supervisorContext.column, supervisorContext.id);

  const { rows } = await db.query(
    `SELECT id, file_url, file_name, file_type, submitted_at, synced_at, status
     FROM submissions
     WHERE student_id = $1
     ORDER BY submitted_at DESC`,
    [studentId]
  );
  return rows;
}

module.exports = { createSubmission, listMine, listForStudent };
