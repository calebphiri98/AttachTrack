const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { requireUuid, requireString, optionalString } = require('../../utils/validators');
const studentsService = require('../students/students.service');
const notificationsService = require('../notifications/notifications.service');

async function assignGrade({ universitySupervisorId, studentId, gradeValue, comments }) {
  requireUuid(studentId, 'studentId');
  const cleanGradeValue = requireString(gradeValue, 'gradeValue', { min: 1, max: 10 });
  const cleanComments = optionalString(comments, { max: 2000 });

  await studentsService.assertSupervises(
    studentId,
    'university_supervisor_id',
    universitySupervisorId
  );

  const { rows } = await db.query(
    `INSERT INTO grades (student_id, university_supervisor_id, grade_value, comments)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (student_id)
     DO UPDATE SET grade_value = EXCLUDED.grade_value,
                   comments = EXCLUDED.comments,
                   updated_at = now()
     WHERE grades.released_at IS NULL
     RETURNING *`,
    [studentId, universitySupervisorId, cleanGradeValue, cleanComments]
  );

  if (rows.length === 0) {
    throw new AppError('This result has already been released and can no longer be changed', 409);
  }

  return rows[0];
}

async function getForStudent(studentId, requester) {
  requireUuid(studentId, 'studentId');
  const student = await studentsService.getById(studentId);

  const isOwnRecord = requester.role === 'student' && student.user_id === requester.id;
  const isUniversitySupervisor =
    requester.role === 'university_supervisor' &&
    requester.supervisorId === student.university_supervisor_id;

  if (!isOwnRecord && !isUniversitySupervisor) {
    throw new AppError('You do not have access to this student\'s grade', 403);
  }

  if (isOwnRecord) {
    throw new AppError('Attachment grades are not available through AttachTrack', 403);
  }

  const { rows } = await db.query(
    `SELECT id, grade_value, comments, attendance_score, presentation_score,
            computed_final_score, released_at, created_at, updated_at
     FROM grades
     WHERE student_id = $1`,
    [studentId]
  );
  return rows[0] || null;
}

async function listResultsOverview() {
  const { rows } = await db.query(
    `SELECT s.id AS student_id,
            s.name,
            s.email,
            s.programme,
            u.name AS university_supervisor_name,
            g.grade_value,
            g.computed_final_score,
            g.released_at,
            CASE
              WHEN g.id IS NULL THEN 'not_graded'
              WHEN g.released_at IS NULL THEN 'ready'
              ELSE 'released'
            END AS status
     FROM students s
     LEFT JOIN grades g ON g.student_id = s.id
     LEFT JOIN university_supervisors us ON us.id = s.university_supervisor_id
     LEFT JOIN users u ON u.id = us.user_id
     ORDER BY s.name`
  );
  return rows;
}

async function releaseGrade() {
  throw new AppError('Attachment grades cannot be published through AttachTrack before official university release', 403);
}

async function releaseAll() {
  throw new AppError('Attachment grades cannot be published through AttachTrack before official university release', 403);
}

module.exports = {
  assignGrade,
  getForStudent,
  listResultsOverview,
  releaseGrade,
  releaseAll,
};
