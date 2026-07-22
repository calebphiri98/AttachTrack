const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { requireUuid, optionalString } = require('../../utils/validators');
const studentsService = require('../students/students.service');
const industrySupervisorsService = require('../industrySupervisors/industrySupervisors.service');
const universitySupervisorsService = require('../universitySupervisors/universitySupervisors.service');
const { uploadBuffer } = require('../../utils/uploadToCloudinary');

async function getUserBasic(userId) {
  const { rows } = await db.query('SELECT id, name, role FROM users WHERE id = $1', [userId]);
  return rows[0] || null;
}

async function assertCanMessage(sender, recipientId) {
  if (sender.id === recipientId) {
    throw new AppError('You cannot message yourself', 400);
  }

  const recipient = await getUserBasic(recipientId);
  if (!recipient) {
    throw new AppError('Recipient not found', 404);
  }

  if (sender.role === 'university_supervisor') {
    return recipient;
  }

  if (sender.role === 'student') {
    const student = await studentsService.getByUserId(sender.id);

    if (recipient.role === 'industry_supervisor') {
      const record = await industrySupervisorsService.getSupervisorRecordByUserId(recipient.id);
      if (student.industry_supervisor_id === record.id) return recipient;
    }
    if (recipient.role === 'university_supervisor') {
      const record = await universitySupervisorsService.getSupervisorRecordByUserId(recipient.id);
      if (student.university_supervisor_id === record.id) return recipient;
    }
    throw new AppError('You can only message your own linked supervisors', 403);
  }

  if (sender.role === 'industry_supervisor') {
    const own = await industrySupervisorsService.getSupervisorRecordByUserId(sender.id);

    if (recipient.role === 'student') {
      const { rows } = await db.query(
        'SELECT id FROM students WHERE user_id = $1 AND industry_supervisor_id = $2',
        [recipient.id, own.id]
      );
      if (rows.length) return recipient;
    }
    if (recipient.role === 'university_supervisor') {
      const uni = await universitySupervisorsService.getSupervisorRecordByUserId(recipient.id);
      const { rows } = await db.query(
        `SELECT id FROM students
         WHERE industry_supervisor_id = $1 AND university_supervisor_id = $2`,
        [own.id, uni.id]
      );
      if (rows.length) return recipient;
    }
    throw new AppError(
      'You can only message your own students or a university supervisor who shares one',
      403
    );
  }

  throw new AppError('Not permitted to send messages', 403);
}

async function sendMessage({ sender, recipientId, content, file }) {
  requireUuid(recipientId, 'recipientId');
  const cleanContent = optionalString(content, { max: 5000 });

  if (!cleanContent && !file) {
    throw new AppError('A message must have content or an attachment', 400);
  }

  await assertCanMessage(sender, recipientId);

  let attachmentUrl = null;
  let attachmentName = null;

  if (file) {
    const uploadResult = await uploadBuffer(file.buffer, {
      folder: `attachtrack/messages/${sender.id}`,
      filename: `${Date.now()}-${file.originalname}`,
    });
    attachmentUrl = uploadResult.secure_url;
    attachmentName = file.originalname;
  }

  const { rows } = await db.query(
    `INSERT INTO messages (sender_id, recipient_id, content, attachment_url, attachment_name)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [sender.id, recipientId, cleanContent, attachmentUrl, attachmentName]
  );
  return rows[0];
}

async function listThreads(userId) {
  const { rows } = await db.query(
    `SELECT
       other.id AS user_id,
       other.name,
       other.role,
       last_msg.content AS last_content,
       last_msg.sent_at AS last_sent_at,
       last_msg.sender_id AS last_sender_id,
       COALESCE(unread.count, 0) AS unread_count
     FROM (
       SELECT DISTINCT
         CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END AS partner_id
       FROM messages
       WHERE sender_id = $1 OR recipient_id = $1
     ) partners
     JOIN users other ON other.id = partners.partner_id
     JOIN LATERAL (
       SELECT content, sent_at, sender_id
       FROM messages
       WHERE (sender_id = $1 AND recipient_id = partners.partner_id)
          OR (sender_id = partners.partner_id AND recipient_id = $1)
       ORDER BY sent_at DESC
       LIMIT 1
     ) last_msg ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS count
       FROM messages
       WHERE sender_id = partners.partner_id
         AND recipient_id = $1
         AND read_at IS NULL
     ) unread ON true
     ORDER BY last_msg.sent_at DESC`,
    [userId]
  );
  return rows;
}

async function getThread(userId, otherUserId) {
  requireUuid(otherUserId, 'userId');
  const { rows } = await db.query(
    `SELECT *
     FROM messages
     WHERE (sender_id = $1 AND recipient_id = $2)
        OR (sender_id = $2 AND recipient_id = $1)
     ORDER BY sent_at ASC`,
    [userId, otherUserId]
  );
  return rows;
}

async function markRead(messageId, userId) {
  requireUuid(messageId, 'messageId');
  const { rows } = await db.query(
    `UPDATE messages
     SET read_at = now()
     WHERE id = $1 AND recipient_id = $2 AND read_at IS NULL
     RETURNING *`,
    [messageId, userId]
  );
  if (!rows.length) {
    throw new AppError('Message not found or already marked as read', 404);
  }
  return rows[0];
}

async function getContacts(user) {
  if (user.role === 'university_supervisor') {
    const { rows } = await db.query(
      `SELECT id, name, role
       FROM users
       WHERE role IN ('student', 'industry_supervisor')
       ORDER BY name`
    );
    return rows;
  }

  if (user.role === 'student') {
    const student = await studentsService.getByUserId(user.id);
    const contacts = [];

    if (student.industry_supervisor_id) {
      const { rows } = await db.query(
        `SELECT u.id, u.name, u.role
         FROM industry_supervisors isup
         JOIN users u ON u.id = isup.user_id
         WHERE isup.id = $1`,
        [student.industry_supervisor_id]
      );
      if (rows[0]) contacts.push(rows[0]);
    }

    if (student.university_supervisor_id) {
      const { rows } = await db.query(
        `SELECT u.id, u.name, u.role
         FROM university_supervisors usup
         JOIN users u ON u.id = usup.user_id
         WHERE usup.id = $1`,
        [student.university_supervisor_id]
      );
      if (rows[0]) contacts.push(rows[0]);
    }

    return contacts;
  }

  if (user.role === 'industry_supervisor') {
    const own = await industrySupervisorsService.getSupervisorRecordByUserId(user.id);

    const { rows: students } = await db.query(
      `SELECT u.id, u.name, u.role
       FROM students s
       JOIN users u ON u.id = s.user_id
       WHERE s.industry_supervisor_id = $1 AND s.user_id IS NOT NULL
       ORDER BY u.name`,
      [own.id]
    );

    const { rows: universitySupervisors } = await db.query(
      `SELECT DISTINCT u.id, u.name, u.role
       FROM students s
       JOIN university_supervisors usup ON usup.id = s.university_supervisor_id
       JOIN users u ON u.id = usup.user_id
       WHERE s.industry_supervisor_id = $1 AND s.university_supervisor_id IS NOT NULL
       ORDER BY u.name`,
      [own.id]
    );

    return [...students, ...universitySupervisors];
  }

  throw new AppError('Not permitted to list contacts', 403);
}

module.exports = { sendMessage, listThreads, getThread, markRead, getContacts };