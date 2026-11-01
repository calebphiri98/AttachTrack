const env = require('./env');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const EMAIL_TIMEOUT_MS = 12000;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

async function sendBrevoEmail(kind, toEmail, name, subject, textContent, htmlContent) {
  if (!env.mail?.brevoApiKey || !env.mail?.senderEmail) {
    throw new Error('Email provider is not configured');
  }

  const started = Date.now();
  let response;

  try {
    response = await fetch(BREVO_API_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'api-key': env.mail.brevoApiKey,
      },
      body: JSON.stringify({
        sender: { name: 'AttachTrack', email: env.mail.senderEmail },
        to: [{ email: toEmail, name }],
        subject,
        textContent,
        htmlContent,
      }),
    });
  } catch (error) {
    const elapsed = Date.now() - started;
    console.error(`[email:${kind}] Brevo request failed after ${elapsed}ms (${error.name})`);
    throw new Error(`Email service request failed: ${error.name === 'TimeoutError' ? 'request timed out' : 'connection error'}`);
  }

  const elapsed = Date.now() - started;
  if (!response.ok) {
    let detail = 'Unknown Brevo error';
    try {
      const body = await response.json();
      detail = body?.message || detail;
    } catch (_) {
      detail = response.statusText || detail;
    }
    console.error(`[email:${kind}] Brevo rejected request: HTTP ${response.status} (${elapsed}ms)`);
    throw new Error(`Failed to send ${kind} email: ${detail}`);
  }

  console.info(`[email:${kind}] Brevo accepted request: HTTP ${response.status} (${elapsed}ms)`);
}

async function sendVerificationEmail(toEmail, name, code) {
  const textContent =
    `Hi ${name},\n\n` +
    `Your AttachTrack verification code is: ${code}\n\n` +
    `This code expires in ${env.verification.codeExpiryMinutes} minutes.\n\n` +
    `If you didn't request this, you can ignore this email.`;
  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 480px;">
      <h2>Verify your AttachTrack account</h2>
      <p>Hi ${escapeHtml(name)},</p>
      <p>Your verification code is:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${escapeHtml(code)}</p>
      <p>This code expires in ${env.verification.codeExpiryMinutes} minutes.</p>
      <p style="color:#888;">If you didn't request this, you can ignore this email.</p>
    </div>
  `;
  return sendBrevoEmail('verification', toEmail, name, 'Verify your AttachTrack account', textContent, htmlContent);
}

async function sendPasswordResetEmail(toEmail, name, resetLink) {
  const textContent =
    `Hi ${name},\n\n` +
    `We received a request to reset your AttachTrack password.\n\n` +
    `Use this link to choose a new password: ${resetLink}\n\n` +
    `If you did not request this, you can safely ignore this email.`;
  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 480px;">
      <h2>Reset your AttachTrack password</h2>
      <p>Hi ${escapeHtml(name)},</p>
      <p>We received a request to reset your password.</p>
      <p><a href="${escapeHtml(resetLink)}">Reset password</a></p>
      <p>If you did not request this, you can safely ignore this email.</p>
    </div>
  `;
  return sendBrevoEmail('password-reset', toEmail, name, 'Reset your AttachTrack password', textContent, htmlContent);
}

async function sendAccountCreatedEmail(toEmail, name, role, tempPassword) {
  const textContent =
    `Hi ${name},\n\n` +
    `An AttachTrack account has been created for you with the role: ${role}.\n\n` +
    `Email: ${toEmail}\n` +
    `Temporary password: ${tempPassword}\n\n` +
    `You can log in with this password now, or reset it at any time using the "Forgot password" link on the login page.`;
  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 480px;">
      <h2>Your AttachTrack account has been created</h2>
      <p>Hi ${escapeHtml(name)},</p>
      <p>An AttachTrack account has been created for you with the role: <strong>${escapeHtml(role)}</strong>.</p>
      <p>Email: ${escapeHtml(toEmail)}</p>
      <p>Temporary password: <strong>${escapeHtml(tempPassword)}</strong></p>
      <p>You can log in with this password now, or reset it at any time using the "Forgot password" link on the login page.</p>
    </div>
  `;
  return sendBrevoEmail('account-created', toEmail, name, 'Your AttachTrack account has been created', textContent, htmlContent);
}

async function sendNotificationEmail(toEmail, name, subject, bodyText, bodyHtml) {
  if (env.nodeEnv === 'test' || !env.mail?.brevoApiKey || !env.mail?.senderEmail) return;

  try {
    await sendBrevoEmail(
      'notification',
      toEmail,
      name,
      subject,
      bodyText,
      bodyHtml || escapeHtml(bodyText).replace(/\n/g, '<br />')
    );
  } catch (error) {
    console.error(`[email:notification] ${error.message}`);
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAccountCreatedEmail,
  sendNotificationEmail,
};
