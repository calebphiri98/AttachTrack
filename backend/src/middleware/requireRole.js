const AppError = require('../utils/AppError');

// Usage: router.get('/path', auth, requireRole('university_supervisor'), handler)
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to do this', 403));
    }
    next();
  };
}

module.exports = requireRole;
