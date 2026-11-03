const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { requireUuid, requireDate, optionalString } = require('../../utils/validators');
const studentsService = require('../students/students.service');
const { uploadBuffer } = require('../../utils/uploadToCloudinary');
const notificationsService = require('../notifications/notifications.service');

function validateSchedule({ visitDate, visitTime, audience }) {
  const date = requireDate(visitDate, 'visitDate');
  if (typeof visitTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(visitTime)) {
    throw new AppError('Visit time must be HH:MM (24-hour format)', 400);
  }
  if (!['student', 'industry', 'both'].includes(audience)) {
    throw new AppError('Notification recipients must be student, industry, or both', 400);
  }
  return { date, time: visitTime, audience };
}

function validateScore(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+(\.\d{1,2})?$/.test(value))) {
    throw new AppError('Visit score must be a number between 0 and 100', 400);
  }
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new AppError('Visit score must be between 0 and 100', 400);
  }
  return score;
}

async function assignedSupervisor(studentId, userId) {
  requireUuid(studentId, 'studentId');
  const student = await studentsService.getById(studentId);
  const { rows } = await db.query('SELECT id FROM university_supervisors WHERE user_id = $1', [userId]);
  if (!rows[0] || student.university_supervisor_id !== rows[0].id) {
    throw new AppError('You do not supervise this student', 403);
  }
  return { student, supervisorId: rows[0].id };
}

async function listForStudent(studentId, requester) {
  requireUuid(studentId, 'studentId');
  const student = await studentsService.getById(studentId);
  const own = requester.role === 'student' && student.user_id === requester.id;
  const university = requester.role === 'university_supervisor' && requester.supervisorId === student.university_supervisor_id;
  const industry = requester.role === 'industry_supervisor' && requester.supervisorId === student.industry_supervisor_id;
  if (!own && !university && !industry) throw new AppError('You do not have access to this student site visits', 403);
  const { rows } = await db.query(
    `SELECT sv.id, sv.student_id, sv.university_supervisor_id, sv.visit_date,
            sv.visit_time, sv.status, sv.notes, sv.photo_url, sv.created_at,
            sv.notify_audience, u.name AS supervisor_name
            ${university ? ', sv.score' : ''}
     FROM site_visits sv
     JOIN university_supervisors us ON us.id = sv.university_supervisor_id
     JOIN users u ON u.id = us.user_id
     WHERE sv.student_id = $1
       AND (sv.status = 'completed' OR sv.notify_audience = 'both' OR sv.notify_audience = $2 OR $3::boolean)
     ORDER BY sv.visit_date DESC, sv.created_at DESC`,
    [studentId, own ? 'student' : 'industry', university]
  );
  return rows;
}

async function scheduleVisit({ userId, studentId, visitDate, visitTime, audience }) {
  const { student, supervisorId } = await assignedSupervisor(studentId, userId);
  const cleaned = validateSchedule({ visitDate, visitTime, audience });
  if ((cleaned.audience === 'student' || cleaned.audience === 'both') && !student.user_id) {
    throw new AppError('Student account is not linked; cannot notify student', 400);
  }
  let industryUserId = null;
  if (cleaned.audience === 'industry' || cleaned.audience === 'both') {
    if (!student.industry_supervisor_id) throw new AppError('No industrial supervisor assigned', 400);
    const { rows } = await db.query('SELECT user_id FROM industry_supervisors WHERE id = $1', [student.industry_supervisor_id]);
    if (!rows[0]) throw new AppError('Industrial supervisor account not found', 400);
    industryUserId = rows[0].user_id;
  }
  const { rows } = await db.query(
    `INSERT INTO site_visits (student_id, university_supervisor_id, visit_date, visit_time, notify_audience, status)
     VALUES ($1, $2, $3, $4, $5, 'scheduled') RETURNING *`,
    [student.id, supervisorId, cleaned.date, cleaned.time, cleaned.audience]
  );
  const visit = rows[0];
  const userIds = [];
  if (cleaned.audience !== 'industry') userIds.push(student.user_id);
  if (cleaned.audience !== 'student') userIds.push(industryUserId);
  const localDate = String(cleaned.date).slice(0, 10);
  for (const recipientId of new Set(userIds)) {
    await notificationsService.notifySafe({
      userId: recipientId,
      type: 'site_visit_scheduled',
      title: 'Upcoming university site visit',
      body: `A university supervisor has scheduled a site visit on ${localDate} at ${cleaned.time}. Check your student attachment site visit section.`,
      relatedId: visit.id,
    });
  }
  return visit;
}

async function uploadPhoto(file, studentId) {
  if (!file) return { photoUrl: null, photoName: null };
  const upload = await uploadBuffer(file.buffer, {
    folder: `attachtrack/site-visits/${studentId}`,
    filename: `${Date.now()}-${file.originalname}`,
  });
  return { photoUrl: upload.secure_url, photoName: file.originalname };
}

async function createVisit({ userId, studentId, visitDate, notes, file, score }) {
  const { student, supervisorId } = await assignedSupervisor(studentId, userId);
  const date = requireDate(visitDate, 'visitDate');
  const cleanNotes = optionalString(notes, { max: 4000 });
  const grade = validateScore(score);
  const { photoUrl, photoName } = await uploadPhoto(file, student.id);
  const { rows } = await db.query(
    `INSERT INTO site_visits (student_id, university_supervisor_id, visit_date, notes, photo_url, photo_name, score, status, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', now()) RETURNING *`,
    [student.id, supervisorId, date, cleanNotes, photoUrl, photoName, grade]
  );
  return rows[0];
}

async function completeVisit({ userId, visitId, notes, file, score }) {
  requireUuid(visitId, 'visitId');
  const { rows: prior } = await db.query('SELECT * FROM site_visits WHERE id = $1', [visitId]);
  if (!prior[0]) throw new AppError('Site visit not found', 404);
  const { student, supervisorId } = await assignedSupervisor(prior[0].student_id, userId);
  if (prior[0].university_supervisor_id !== supervisorId) throw new AppError('You cannot complete another supervisor’s visit', 403);
  if (prior[0].status !== 'scheduled') throw new AppError('This site visit is already completed', 409);
  const cleanNotes = optionalString(notes, { max: 4000 });
  const grade = validateScore(score);
  const { photoUrl, photoName } = await uploadPhoto(file, student.id);
  const { rows } = await db.query(
    `UPDATE site_visits SET status = 'completed', notes = $2, score = $3, photo_url = $4, photo_name = $5, completed_at = now()
     WHERE id = $1 AND status = 'scheduled' AND university_supervisor_id = $6 RETURNING *`,
    [visitId, cleanNotes, grade, photoUrl, photoName, supervisorId]
  );
  if (!rows[0]) throw new AppError('This visit was already completed', 409);
  return rows[0];
}

module.exports = { createVisit, scheduleVisit, completeVisit, listForStudent, validateSchedule, validateScore };
