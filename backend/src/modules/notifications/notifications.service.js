const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const escapeHtml = require('../../utils/escapeHtml');
const { sendNotificationEmail } = require('../../config/mailer');
const { findType, typesForRole } = require('./notificationTypes');

const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;

function buildEmailHtml(title, body) {
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body || '').replace(/\n/g, '<br />');
  return `<div style="font-family:sans-serif;max-width:520px"><h2>${safeTitle}</h2><p>${safeBody}</p></div>`;
}

async function resolveChannels(userId, entry) {
  const { rows } = await db.query(
    'SELECT in_app, email FROM notification_preferences WHERE user_id = $1 AND type = $2',
    [userId, entry.type]
  );

  if (rows[0]) {
    return { inApp: rows[0].in_app, email: rows[0].email };
  }
  return { inApp: entry.defaults.inApp, email: entry.defaults.email };
}

async function notify({ userId, type, title, body, relatedId }) {
  const entry = findType(type);
  if (!entry) {
    throw new Error(`Unknown notification type: ${type}`);
  }

  const { rows: userRows } = await db.query(
    'SELECT name, email, is_active FROM users WHERE id = $1',
    [userId]
  );
  const user = userRows[0];
  if (!user || user.is_active === false) {
    return null;
  }

  const channels = await resolveChannels(userId, entry);

  const { rows } = await db.query(
    `INSERT INTO notifications (user_id, type, title, body, related_id, in_app_visible)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, type, title, body || null, relatedId || null, channels.inApp]
  );

  if (channels.email) {
    try {
      await sendNotificationEmail(
        user.email,
        user.name,
        title,
        body || title,
        buildEmailHtml(title, body)
      );
    } catch (err) {
      console.error('[notify] email failed:', err.message);
    }
  }

  return rows[0];
}

async function notifySafe(payload) {
  try {
    return await notify(payload);
  } catch (err) {
    console.error('[notifySafe] failed:', err.message);
    return null;
  }
}

async function listForUser(userId, limit) {
  const safeLimit = Math.min(
    Math.max(parseInt(limit, 10) || DEFAULT_LIST_LIMIT, 1),
    MAX_LIST_LIMIT
  );

  const { rows } = await db.query(
    `SELECT id, type, title, body, related_id, read_at, created_at
     FROM notifications
     WHERE user_id = $1 AND in_app_visible = TRUE
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, safeLimit]
  );
  return rows;
}

async function countUnread(userId) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM notifications
     WHERE user_id = $1 AND in_app_visible = TRUE AND read_at IS NULL`,
    [userId]
  );
  return rows[0].count;
}

async function markRead(notificationId, userId) {
  const { rows } = await db.query(
    `UPDATE notifications SET read_at = now()
     WHERE id = $1 AND user_id = $2 AND read_at IS NULL
     RETURNING *`,
    [notificationId, userId]
  );
  return rows[0] || null;
}

async function markAllRead(userId) {
  const { rows } = await db.query(
    `UPDATE notifications SET read_at = now()
     WHERE user_id = $1 AND in_app_visible = TRUE AND read_at IS NULL
     RETURNING id`,
    [userId]
  );
  return { updated: rows.length };
}

async function getPreferencesForUser(userId, role) {
  const entries = typesForRole(role);

  const { rows } = await db.query(
    'SELECT type, in_app, email FROM notification_preferences WHERE user_id = $1',
    [userId]
  );
  const saved = new Map(rows.map((row) => [row.type, row]));

  return entries.map((entry) => {
    const row = saved.get(entry.type);
    return {
      type: entry.type,
      label: entry.label,
      description: entry.description,
      defaults: entry.defaults,
      inApp: row ? row.in_app : entry.defaults.inApp,
      email: row ? row.email : entry.defaults.email,
    };
  });
}

async function updatePreferences(userId, role, updates) {
  if (!Array.isArray(updates) || updates.length === 0) {
    throw new AppError('updates must be a non-empty list', 400);
  }

  const allowed = new Set(typesForRole(role).map((entry) => entry.type));
  const byType = new Map();

  for (const item of updates) {
    if (!item || !allowed.has(item.type)) {
      throw new AppError('Unknown notification type for your role', 400);
    }
    if (typeof item.inApp !== 'boolean' || typeof item.email !== 'boolean') {
      throw new AppError('inApp and email must be true or false', 400);
    }
    byType.set(item.type, item);
  }

  const items = Array.from(byType.values());

  await db.query(
    `INSERT INTO notification_preferences (user_id, type, in_app, email)
     SELECT $1, x.type, x.in_app, x.email
     FROM unnest($2::text[], $3::boolean[], $4::boolean[]) AS x(type, in_app, email)
     ON CONFLICT (user_id, type)
     DO UPDATE SET in_app = EXCLUDED.in_app,
                   email = EXCLUDED.email,
                   updated_at = now()`,
    [
      userId,
      items.map((item) => item.type),
      items.map((item) => item.inApp),
      items.map((item) => item.email),
    ]
  );

  return getPreferencesForUser(userId, role);
}

module.exports = {
  notify,
  notifySafe,
  listForUser,
  countUnread,
  markRead,
  markAllRead,
  getPreferencesForUser,
  updatePreferences,
};