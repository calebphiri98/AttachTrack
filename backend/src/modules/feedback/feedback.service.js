const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { requireUuid, requireString } = require('../../utils/validators');
const { sendNotificationEmail } = require('../../config/mailer');
const studentsService = require('../students/students.service');

async function createFeedback({ industrySupervisorId, studentId, content, flaggedConcern }) {
  requireUuid(studentId, 'studentId');
  const cleanContent = requireString(content, 'content', { max: 5000 });

  await studentsService.assertSupervises(studentId, 'industry_supervisor_id', industrySupervisorId);

  const { rows } = await db.query(
    `INSERT INTO feedback (student_id, industry_supervisor_id, content, flagged_concern)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [studentId, industrySupervisorId, cleanContent, !!flaggedConcern]
  );

  const feedbackEntry = rows[0];
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
     'New feedback received',
     `You have received new feedback from your industry supervisor.\n\n${cleanContent}`,
     `<div style="font-family:sans-serif;max-width:520px"><h2>New feedback received</h2><p>You have received new feedbackfrom your industry supervisor.</p><p>${cleanContent.replace(/\n/g, '<br />')}</p></div>`
    );
  }

  return feedbackEntry;
}

async function listForStudent(studentId, requester) {
  requireUuid(studentId, 'studentId');
  const student = await studentsService.getById(studentId);

  const isOwnRecord = requester.role === 'student' && student.user_id === requester.id;
  const isIndustrySupervisor =
    requester.role === 'industry_supervisor' &&
    (await studentsService.isIndustrySupervisorOf(student, requester.supervisorId));
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