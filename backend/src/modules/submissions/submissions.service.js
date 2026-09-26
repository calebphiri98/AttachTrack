const crypto = require('crypto');
const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const studentsService = require('../students/students.service');
const { uploadBuffer } = require('../../utils/uploadToCloudinary');

const VALID_RECIPIENT_ROLES = ['industry_supervisor', 'university_supervisor'];

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
    return rows[0];
  } catch (err) {
    if (err.code === '23505') {
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
    `SELECT id, recipient_role, file_url, file_name, file_type, submitted_at, synced_at, status
     FROM submissions
     WHERE student_id = $1
     ORDER BY submitted_at DESC`,
    [student.id]
  );
  return rows;
}

async function listForStudent(studentId, supervisorContext) {
  await studentsService.assertSupervises(studentId, supervisorContext.column, supervisorContext.id);

  const recipientRole =
    supervisorContext.column === 'industry_supervisor_id'
      ? 'industry_supervisor'
      : 'university_supervisor';

  const { rows } = await db.query(
    `SELECT id, recipient_role, file_url, file_name, file_type, submitted_at, synced_at, status
     FROM submissions
     WHERE student_id = $1 AND recipient_role = $2
     ORDER BY submitted_at DESC`,
    [studentId, recipientRole]
  );
  return rows;
}

module.exports = { createSubmission, listMine, listForStudent };