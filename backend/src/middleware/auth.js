const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../config/db');
const AppError = require('../utils/AppError');

async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('No access token provided', 401));
  }
  const token = header.slice(7).trim();
  let decoded;
  try {
    decoded = jwt.verify(token, env.jwt.accessSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Access token expired', 401));
    }
    return next(new AppError('Invalid access token', 401));
  }
  if (!decoded || typeof decoded.sub !== 'string') {
    return next(new AppError('Invalid access token', 401));
  }
  try {
    const { rows } = await db.query(
      'SELECT id, role, is_active FROM users WHERE id = $1',
      [decoded.sub]
    );
    const user = rows[0];
    if (!user || user.is_active === false) {
      return next(new AppError('Account is inactive or no longer exists', 401));
    }
    req.user = { id: user.id, role: user.role };
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = auth;
