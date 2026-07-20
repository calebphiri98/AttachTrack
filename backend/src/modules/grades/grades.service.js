const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const studentsService = require('../students/students.service');

async function assignGrade({ universitySupervisorId, studentId, gradeValue, comments }) {
  if (!studentId || !gradeValue) {
    throw new AppError('studentId and gradeValue are required', 400);
  }

  await studentsService.assertSupervises(
    studentId,
    'university_supervisor_id',
    universitySupervisorId
  );

  const { rows } = await db.query(
    `INSERT INTO grades (student_id, university_supervisor_id, grade_value, comments)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (student_id)
     DO UPDATE SET grade_value = EXCLUDED.grade_value, comments = EXCLUDED.comments
     RETURNING *`,
    [studentId, universitySupervisorId, gradeValue, comments || null]
  );
  return rows[0];
}

// Visible to: the student themselves, their industry supervisor, and their
// university supervisor — per spec section 5.7.
async function getForStudent(studentId, requester) {
  const student = await studentsService.getById(studentId);

  const isOwnRecord = requester.role === 'student' && student.user_id === requester.id;
  const isIndustrySupervisor =
    requester.role === 'industry_supervisor' &&
    requester.supervisorId === student.industry_supervisor_id;
  const isUniversitySupervisor =
    requester.role === 'university_supervisor' &&
    requester.supervisorId === student.university_supervisor_id;

  if (!isOwnRecord && !isIndustrySupervisor && !isUniversitySupervisor) {
    throw new AppError('You do not have access to this student\'s grade', 403);
  }

  const { rows } = await db.query(
    `SELECT id, grade_value, comments, created_at, updated_at
     FROM grades
     WHERE student_id = $1`,
    [studentId]
  );
  return rows[0] || null;
}

module.exports = { assignGrade, getForStudent };
