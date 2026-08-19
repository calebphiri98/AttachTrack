const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { requireUuid, requireDate, requireString, optionalString } = require('../../utils/validators');
const studentsService = require('../students/students.service');
const { uploadBuffer } = require('../../utils/uploadToCloudinary');

async function listForStudent(studentId, requester) {
  requireUuid(studentId, 'studentId');
  const student = await studentsService.getById(studentId);

  const isOwnRecord = requester.role === 'student' && student.user_id === requester.id;
  const isUniversitySupervisor =
    requester.role === 'university_supervisor' && requester.supervisorId === student.university_supervisor_id;

  if (!isOwnRecord && !isUniversitySupervisor) {
    throw new AppError('You do not have access to this student site visits', 403);
  }

  const { rows } = await db.query(
    `SELECT sv.*, u.name AS supervisor_name
     FROM site_visits sv
     JOIN university_supervisors us ON us.id = sv.university_supervisor_id
     JOIN users u ON u.id = us.user_id
     WHERE sv.student_id = $1
     ORDER BY sv.visit_date DESC, sv.created_at DESC`,
    [studentId]
  );

  return rows;
}

async function createVisit({ userId, studentId, visitDate, notes, file }) {
  requireUuid(studentId, 'studentId');
  const student = await studentsService.getById(studentId);
  const universitySupervisor = await db.query('SELECT * FROM university_supervisors WHERE user_id = $1', [userId]);

  if (!universitySupervisor.rows[0]) {
    throw new AppError('Only university supervisors can log site visits', 403);
  }

  if (student.university_supervisor_id !== universitySupervisor.rows[0].id) {
    throw new AppError('You do not supervise this student', 403);
  }

  const cleanDate = requireDate(visitDate, 'visitDate');
  const cleanNotes = optionalString(notes, { max: 4000 });
  const cleanContent = cleanNotes || 'Site visit recorded';
  requireString(cleanContent, 'notes', { max: 4000 });

  let photoUrl = null;
  let photoName = null;

  if (file) {
    const upload = await uploadBuffer(file.buffer, {
      folder: `attachtrack/site-visits/${student.id}`,
      filename: `${Date.now()}-${file.originalname}`,
    });
    photoUrl = upload.secure_url;
    photoName = file.originalname;
  }

  const { rows } = await db.query(
    `INSERT INTO site_visits (student_id, university_supervisor_id, visit_date, notes, photo_url, photo_name)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [student.id, universitySupervisor.rows[0].id, cleanDate, cleanNotes, photoUrl, photoName]
  );

  return rows[0];
}

module.exports = { createVisit, listForStudent };
