const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const db = require('../../config/db');
const env = require('../../config/env');
const AppError = require('../../utils/AppError');
const { requireString, requireEmail, requirePassword } = require('../../utils/validators');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../../config/mailer');
const studentsService = require('../students/students.service');

const SALT_ROUNDS = 10;
const MUBAS_EMAIL_REGEX = /^[^\s@]+@([a-zA-Z0-9-]+\.)*mubas\.ac\.mw$/i;

function generateCode() {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
}

function hashToken(rawToken) {
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

async function signup({ name, email, password }) {
  const cleanName = requireString(name, 'name', { min: 1, max: 150 });
  const cleanEmail = requireEmail(email);
  const cleanPassword = requirePassword(password);

  if (!MUBAS_EMAIL_REGEX.test(cleanEmail)) {
    throw new AppError('Signup is only available for MUBAS email addresses', 400);
  }

  const existing = await db.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
  if (existing.rows.length > 0) {
    throw new AppError('An account with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(cleanPassword, SALT_ROUNDS);

  const { rows } = await db.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, email_verified, created_at`,
    [cleanName, cleanEmail, passwordHash, 'student']
  );
  const user = rows[0];

  const code = generateCode();
  const expiresAt = new Date(Date.now() + env.verification.codeExpiryMinutes * 60 * 1000);

  await db.query(
    `INSERT INTO email_verifications (user_id, code, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, code, expiresAt]
  );

  try {
    await sendVerificationEmail(user.email, user.name, code);
  } catch (err) {
    console.error('[signup] verification email failed to send:', err.message);
  }

  return user;
}

async function verifyEmail({ email, code }) {
  const cleanEmail = requireEmail(email);
  const cleanCode = requireString(code, 'code', { min: 6, max: 6 });
  if (!/^\d{6}$/.test(cleanCode)) {
    throw new AppError('Invalid verification code', 400);
  }

  const { rows: userRows } = await db.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
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
    [user.id, cleanCode]
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
    await studentsService.attachUserAccount({
      email: user.email,
      name: user.name,
      userId: user.id,
    });
  }

  return { message: 'Email verified successfully' };
}

async function resendVerificationCode({ email }) {
  const cleanEmail = requireEmail(email);

  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
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

  try {
    await sendVerificationEmail(user.email, user.name, code);
  } catch (err) {
    console.error('[resendVerificationCode] email failed to send:', err.message);
    throw new AppError(
      'Could not send verification email right now. Please try again shortly.',
      502
    );
  }

  return { message: 'Verification code resent' };
}

async function login({ email, password }) {
  if (!email || !password) {
    throw new AppError('email and password are required', 400);
  }
  const cleanEmail = email.trim().toLowerCase();

  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
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

async function requestPasswordReset({ email }) {
  const cleanEmail = requireEmail(email);
  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
  const user = rows[0];

  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    console.log('RESET TOKEN:', rawToken);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );

    try {
      await sendPasswordResetEmail(
        user.email,
        user.name,
        `${env.mail.clientUrl}/reset-password?token=${rawToken}`
      );
    } catch (err) {
      console.error('[requestPasswordReset] email failed to send:', err.message);
    }
  }

  return { message: 'If an account exists for that email, a reset link has been sent.' };
}

async function resetPassword({ token, newPassword }) {
  const cleanToken = requireString(token, 'token', { min: 1, max: 1024 });
  const cleanPassword = requirePassword(newPassword);
  const tokenHash = hashToken(cleanToken);

  const { rows: resetRows } = await db.query(
    `SELECT * FROM password_resets
     WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC
     LIMIT 1`,
    [tokenHash]
  );
  const resetRecord = resetRows[0];
  if (!resetRecord) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  const { rows: userRows } = await db.query('SELECT * FROM users WHERE id = $1', [resetRecord.user_id]);
  const user = userRows[0];
  if (!user) {
    throw new AppError('User no longer exists', 404);
  }

  const passwordHash = await bcrypt.hash(cleanPassword, SALT_ROUNDS);
  await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);
  await db.query('UPDATE password_resets SET consumed_at = now() WHERE id = $1', [resetRecord.id]);
  await db.query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1', [user.id]);

  return { message: 'Password reset successfully' };
}

module.exports = {
  signup,
  verifyEmail,
  resendVerificationCode,
  login,
  refresh,
  logout,
  requestPasswordReset,
  resetPassword,
};
