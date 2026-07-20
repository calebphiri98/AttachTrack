const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const db = require('../../config/db');
const env = require('../../config/env');
const AppError = require('../../utils/AppError');
const { sendVerificationEmail } = require('../../config/mailer');
const studentsService = require('../students/students.service');

const SALT_ROUNDS = 10;
const VALID_ROLES = ['student', 'industry_supervisor', 'university_supervisor'];

function generateCode() {
  // 6-digit numeric code, zero-padded
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
}

function hashToken(rawToken) {
  // Refresh tokens are already high-entropy random values, so a plain SHA-256
  // digest (fast lookup by exact match) is appropriate here — unlike
  // passwords, which need bcrypt's slow, salted hashing.
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiry,
  });
}

async function issueRefreshToken(userId) {
  const rawToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + env.jwt.refreshExpiryDays * 24 * 60 * 60 * 1000);

  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );

  return rawToken;
}

async function signup({ name, email, password, role }) {
  if (!name || !email || !password || !role) {
    throw new AppError('name, email, password and role are all required', 400);
  }
  if (!VALID_ROLES.includes(role)) {
    throw new AppError('Invalid role', 400);
  }
  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters', 400);
  }

  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw new AppError('An account with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const { rows } = await db.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, email_verified, created_at`,
    [name, email, passwordHash, role]
  );
  const user = rows[0];

  // Each role gets its own profile row — industry/university supervisors need
  // one to be referenced by students.industry_supervisor_id /
  // university_supervisor_id. Students don't get a row here; theirs gets
  // created/matched at verify-email time (see verifyEmail below), since
  // that's the point the spec treats as "the account is real."
  if (role === 'industry_supervisor') {
    await db.query('INSERT INTO industry_supervisors (user_id) VALUES ($1)', [user.id]);
  } else if (role === 'university_supervisor') {
    await db.query('INSERT INTO university_supervisors (user_id) VALUES ($1)', [user.id]);
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + env.verification.codeExpiryMinutes * 60 * 1000);

  await db.query(
    `INSERT INTO email_verifications (user_id, code, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, code, expiresAt]
  );

  await sendVerificationEmail(user.email, user.name, code);

  return user;
}

async function verifyEmail({ email, code }) {
  if (!email || !code) {
    throw new AppError('email and code are required', 400);
  }

  const { rows: userRows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = userRows[0];
  if (!user) {
    throw new AppError('No account found with this email', 404);
  }
  if (user.email_verified) {
    return { message: 'Email already verified' };
  }

  const { rows: codeRows } = await db.query(
    `SELECT * FROM email_verifications
     WHERE user_id = $1 AND code = $2 AND consumed_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [user.id, code]
  );
  const verification = codeRows[0];

  if (!verification) {
    throw new AppError('Invalid verification code', 400);
  }
  if (new Date(verification.expires_at) < new Date()) {
    throw new AppError('Verification code has expired', 400);
  }

  await db.query('UPDATE email_verifications SET consumed_at = now() WHERE id = $1', [
    verification.id,
  ]);
  await db.query('UPDATE users SET email_verified = TRUE WHERE id = $1', [user.id]);

  if (user.role === 'student') {
    // Matches this now-verified account against any student record a
    // supervisor may have already created for this email, or creates a
    // fresh (still supervisor-less) one if nobody has added them yet.
    await studentsService.attachUserAccount({
      email: user.email,
      name: user.name,
      userId: user.id,
    });
  }

  return { message: 'Email verified successfully' };
}

async function resendVerificationCode({ email }) {
  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user) {
    throw new AppError('No account found with this email', 404);
  }
  if (user.email_verified) {
    throw new AppError('Email is already verified', 400);
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + env.verification.codeExpiryMinutes * 60 * 1000);

  await db.query(
    `INSERT INTO email_verifications (user_id, code, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, code, expiresAt]
  );

  await sendVerificationEmail(user.email, user.name, code);

  return { message: 'Verification code resent' };
}

async function login({ email, password }) {
  if (!email || !password) {
    throw new AppError('email and password are required', 400);
  }

  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.email_verified) {
    throw new AppError('Please verify your email before logging in', 403);
  }

  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

async function refresh({ refreshToken }) {
  if (!refreshToken) {
    throw new AppError('refreshToken is required', 400);
  }

  const tokenHash = hashToken(refreshToken);
  const { rows } = await db.query(
    `SELECT * FROM refresh_tokens
     WHERE token_hash = $1 AND revoked = FALSE AND expires_at > now()`,
    [tokenHash]
  );
  const stored = rows[0];
  if (!stored) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  // Rotate: revoke the used token, issue a new pair.
  await db.query('UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1', [stored.id]);

  const { rows: userRows } = await db.query('SELECT * FROM users WHERE id = $1', [
    stored.user_id,
  ]);
  const user = userRows[0];
  if (!user) {
    throw new AppError('User no longer exists', 401);
  }

  const newAccessToken = signAccessToken(user);
  const newRefreshToken = await issueRefreshToken(user.id);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

async function logout({ refreshToken }) {
  if (!refreshToken) {
    return { message: 'Logged out' };
  }
  const tokenHash = hashToken(refreshToken);
  await db.query('UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1', [tokenHash]);
  return { message: 'Logged out' };
}

module.exports = {
  signup,
  verifyEmail,
  resendVerificationCode,
  login,
  refresh,
  logout,
};
