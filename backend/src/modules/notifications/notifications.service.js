const db = require('../../config/db');

async function create({ userId, type, title, body, relatedId }) {
  const { rows } = await db.query(
    `INSERT INTO notifications (user_id, type, title, body, related_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, type, title, body, relatedId || null]
  );
  return rows[0];
}

async function listForUser(userId) {
  const { rows } = await db.query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
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

module.exports = { create, listForUser, markRead };
