const AppError = require('./AppError');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireString(value, fieldName, { min = 1, max = Infinity } = {}) {
  if (typeof value !== 'string' || value.trim().length < min) {
    throw new AppError(`${fieldName} is required`, 400);
  }
  if (value.length > max) {
    throw new AppError(`${fieldName} must be ${max} characters or fewer`, 400);
  }
  return value.trim();
}

function requireEmail(value) {
  const trimmed = requireString(value, 'email', { max: 320 }); // RFC 5321 practical max
  if (!EMAIL_REGEX.test(trimmed)) {
    throw new AppError('Please provide a valid email address', 400);
  }
  return trimmed.toLowerCase();
}

function requirePassword(value) {
  if (typeof value !== 'string') {
    throw new AppError('password is required', 400);
  }
  if (value.length < 8) {
    throw new AppError('Password must be at least 8 characters', 400);
  }
  if (value.length > 128) {
    throw new AppError('Password must be 128 characters or fewer', 400);
  }
  return value;
}

function requireUuid(value, fieldName = 'id') {
  if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }
  return value;
}

function requireDate(value, fieldName) {
  const parsed = new Date(value);
  if (typeof value !== 'string' || Number.isNaN(parsed.getTime())) {
    throw new AppError(`${fieldName} must be a valid date`, 400);
  }
  return value;
}

function optionalString(value, { max = Infinity } = {}) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new AppError('Invalid text field', 400);
  }
  if (value.length > max) {
    throw new AppError(`Text must be ${max} characters or fewer`, 400);
  }
  return value.trim();
}

module.exports = {
  requireString,
  requireEmail,
  requirePassword,
  requireUuid,
  requireDate,
  optionalString,
};