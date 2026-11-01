const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { requireUuid } = require('../../utils/validators');

const READ_ROLES = new Set(['admin', 'student', 'industry_supervisor', 'university_supervisor']);
const AUDIENCES = new Set(['all', 'students', 'supervisors']);

function assertMember(user) {
  if (!user || !READ_ROLES.has(user.role)) throw new AppError('Not permitted to access announcements', 403);
}

function textField(value, label, maximum) {
  if (typeof value !== 'string' || !value.trim()) throw new AppError(`${label} is required`, 400);
  const result = value.trim();
  if (result.length > maximum) throw new AppError(`${label} must be ${maximum} characters or fewer`, 400);
  return result;
}

function canRead(user, audience) {
  return user.role === 'admin' || audience === 'all' ||
    (audience === 'students' && user.role === 'student') ||
    (audience === 'supervisors' && ['industry_supervisor', 'university_supervisor'].includes(user.role));
}

async function getVisible(user, announcementId) {
  assertMember(user);
  requireUuid(announcementId, 'announcementId');
  const { rows } = await db.query('SELECT id, audience FROM announcements WHERE id = $1', [announcementId]);
  if (!rows[0] || !canRead(user, rows[0].audience)) throw new AppError('Announcement not found', 404);
  return rows[0];
}

async function list(user) {
  assertMember(user);
  const audience = user.role === 'student' ? 'students' : 'supervisors';
  const { rows } = await db.query(
    `SELECT a.id, a.title, a.body, a.audience, a.created_at,
            u.name AS author_name,
            (SELECT COUNT(*)::int FROM announcement_replies r WHERE r.announcement_id = a.id) AS reply_count
     FROM announcements a JOIN users u ON u.id = a.author_id
     WHERE ($1::boolean OR a.audience IN ('all', $2))
     ORDER BY a.created_at DESC LIMIT 100`,
    [user.role === 'admin', audience]
  );
  return rows;
}

async function create(user, { title, body, audience = 'all' } = {}) {
  if (user?.role !== 'admin') throw new AppError('Only the Coordinator can publish announcements', 403);
  const cleanTitle = textField(title, 'Title', 180);
  const cleanBody = textField(body, 'Announcement', 5000);
  if (!AUDIENCES.has(audience)) throw new AppError('Invalid audience', 400);
  const { rows } = await db.query(
    `INSERT INTO announcements (author_id, title, body, audience) VALUES ($1, $2, $3, $4)
     RETURNING id, title, body, audience, created_at`,
    [user.id, cleanTitle, cleanBody, audience]
  );
  const announcement = rows[0];
  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, title, body, related_id, in_app_visible)
       SELECT u.id, 'announcement_posted', $2, $3, $4, COALESCE(np.in_app, TRUE)
       FROM users u LEFT JOIN notification_preferences np
         ON np.user_id = u.id AND np.type = 'announcement_posted'
       WHERE u.id <> $1 AND u.role IN ('student','industry_supervisor','university_supervisor')
         AND COALESCE(u.is_active, TRUE) = TRUE
         AND ($5 = 'all' OR ($5 = 'students' AND u.role = 'student')
           OR ($5 = 'supervisors' AND u.role IN ('industry_supervisor','university_supervisor')))`,
      [user.id, `New announcement: ${cleanTitle}`, cleanBody.slice(0, 250), announcement.id, audience]
    );
  } catch (error) {
    console.error('[announcements] notification creation failed:', error.message);
  }
  return announcement;
}

async function listReplies(user, announcementId) {
  await getVisible(user, announcementId);
  const { rows } = await db.query(
    `SELECT r.id, r.body, r.created_at, u.name AS author_name, u.role AS author_role
     FROM announcement_replies r JOIN users u ON u.id = r.author_id
     WHERE r.announcement_id = $1 ORDER BY r.created_at ASC LIMIT 500`,
    [announcementId]
  );
  return rows;
}

async function reply(user, announcementId, body) {
  await getVisible(user, announcementId);
  const cleanBody = textField(body, 'Reply', 2000);
  const { rows } = await db.query(
    `INSERT INTO announcement_replies (announcement_id, author_id, body) VALUES ($1, $2, $3)
     RETURNING id, body, created_at`,
    [announcementId, user.id, cleanBody]
  );
  return rows[0];
}

module.exports = { list, create, listReplies, reply };
