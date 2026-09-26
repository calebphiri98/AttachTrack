const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { requireUuid, requireString, optionalString } = require('../../utils/validators');
const { sendNotificationEmail } = require('../../config/mailer');
const studentsService = require('../students/students.service');

async function assignGrade({ universitySupervisorId, studentId, gradeValue, comments }) {
  requireUuid(studentId, 'studentId');
  const cleanGradeValue = requireString(gradeValue, 'gradeValue', { min: 1, max: 10 }); // matches grades.grade_value VARCHAR(10)
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
     DO UPDATE SET grade_value = EXCLUDED.grade_value, comments = EXCLUDED.comments
     RETURNING *`,
    [studentId, universitySupervisorId, cleanGradeValue, cleanComments]
  );

  const gradeEntry = rows[0];
  const { rows: studentRows } = await db.query(
    `SELECT u.email, u.name
     FROM students s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1`,
    [studentId]
  );

  if (studentRows[0]) {
    await sendNotificationEmail(
     studentRows[0].email,
     studentRows[0].name,
     'A grade has been recorded',
     `Your final placement grade has been recorded: ${cleanGradeValue}.\n\n${cleanComments || 'No additional comments were provided.'}`,
     `<div style="font-family:sans-serif;max-width:520px"><h2>A grade has been recorded</h2><p>Your final placement grade has been recorded: <strong>${cleanGradeValue}</strong>.</p><p>${(cleanComments || 'No additional comments were provided.').replace(/\n/g, '<br />')}</p></div>`
    );
  }

  return gradeEntry;
}

async function getForStudent(studentId, requester) {
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