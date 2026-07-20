const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');

function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('No access token provided', 401));
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.jwt.accessSecret);
    // decoded = { sub: userId, role, iat, exp }
    req.user = { id: decoded.sub, role: decoded.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Access token expired', 401));
    }
    return next(new AppError('Invalid access token', 401));
  }
}

module.exports = auth;
