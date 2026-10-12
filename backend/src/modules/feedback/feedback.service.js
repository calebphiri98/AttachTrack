const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { requireUuid, requireString } = require('../../utils/validators');
const studentsService = require('../students/students.service');
const notificationsService = require('../notifications/notifications.service');

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
    'SELECT user_id FROM students WHERE id = $1 AND user_id IS NOT NULL',
    [studentId]
  );

  if (studentRows[0]) {
    await notificationsService.notifySafe({
      userId: studentRows[0].user_id,
      type: 'feedback_received',
      title: 'New feedback received',
      body: `You have received new feedback from your industry supervisor.\n\n${cleanContent}`,
      relatedId: feedbackEntry.id,
    });
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