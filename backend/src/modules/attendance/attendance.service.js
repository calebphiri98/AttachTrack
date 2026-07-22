const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { requireUuid, requireDate, optionalString } = require('../../utils/validators');
const studentsService = require('../students/students.service');

const VALID_STATUSES = ['present', 'absent', 'partial'];

async function markAttendance({ industrySupervisorId, studentId, weekStartDate, status, notes }) {
  requireUuid(studentId, 'studentId');
  requireDate(weekStartDate, 'weekStartDate');
  if (!status || !VALID_STATUSES.includes(status)) {
    throw new AppError('Invalid attendance status', 400);
  }
  const cleanNotes = optionalString(notes, { max: 2000 });

  await studentsService.assertSupervises(studentId, 'industry_supervisor_id', industrySupervisorId);

  const { rows } = await db.query(
    `INSERT INTO attendance (student_id, industry_supervisor_id, week_start_date, status, notes)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (student_id, week_start_date)
     DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes
     RETURNING *`,
    [studentId, industrySupervisorId, weekStartDate, status, cleanNotes]
  );
  return rows[0];
}

async function listForStudent(studentId, requester) {
  requireUuid(studentId, 'studentId');
  const student = await studentsService.getById(studentId);

  const isOwnRecord = requester.role === 'student' && student.user_id === requester.id;
  const isIndustrySupervisor =
    requester.role === 'industry_supervisor' &&
    requester.supervisorId === student.industry_supervisor_id;
  const isUniversitySupervisor =
    requester.role === 'university_supervisor' &&
    requester.supervisorId === student.university_supervisor_id;

  if (!isOwnRecord && !isIndustrySupervisor && !isUniversitySupervisor) {
    throw new AppError('You do not have access to this student\'s attendance', 403);
  }

  const { rows } = await db.query(
    `SELECT id, week_start_date, status, notes, created_at
     FROM attendance
     WHERE student_id = $1
     ORDER BY week_start_date DESC`,
    [studentId]
  );
  return rows;
}

module.exports = { markAttendance, listForStudent };