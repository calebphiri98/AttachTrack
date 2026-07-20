const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const studentsService = require('../students/students.service');

async function createFeedback({ industrySupervisorId, studentId, content, flaggedConcern }) {
  if (!studentId || !content) {
    throw new AppError('studentId and content are required', 400);
  }

  await studentsService.assertSupervises(studentId, 'industry_supervisor_id', industrySupervisorId);

  const { rows } = await db.query(
    `INSERT INTO feedback (student_id, industry_supervisor_id, content, flagged_concern)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [studentId, industrySupervisorId, content, !!flaggedConcern]
  );
  return rows[0];
}

async function listForStudent(studentId, requester) {
  const student = await studentsService.getById(studentId);

  const isOwnRecord = requester.role === 'student' && student.user_id === requester.id;
  const isIndustrySupervisor =
    requester.role === 'industry_supervisor' &&
    requester.supervisorId === student.industry_supervisor_id;
  const isUniversitySupervisor =
    requester.role === 'university_supervisor' &&
    requester.supervisorId === student.university_supervisor_id;

  if (!isOwnRecord && !isIndustrySupervisor && !isUniversitySupervisor) {
    throw new AppError('You do not have access to this student\'s feedback', 403);
  }

  const { rows } = await db.query(
    `SELECT id, content, flagged_concern, created_at
     FROM feedback
     WHERE student_id = $1
     ORDER BY created_at DESC`,
    [studentId]
  );
  return rows;
}

module.exports = { createFeedback, listForStudent };
