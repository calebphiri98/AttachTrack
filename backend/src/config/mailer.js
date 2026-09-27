const env = require('./env');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

async function sendVerificationEmail(toEmail, name, code) {
  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'api-key': env.mail.brevoApiKey,
    },
    body: JSON.stringify({
      sender: { name: 'AttachTrack', email: env.mail.senderEmail },
      to: [{ email: toEmail, name }],
      subject: 'Verify your AttachTrack account',
      textContent:
        `Hi ${name},\n\n` +
        `Your AttachTrack verification code is: ${code}\n\n` +
        `This code expires in ${env.verification.codeExpiryMinutes} minutes.\n\n` +
        `If you didn't request this, you can ignore this email.`,
      htmlContent: `
        <div style="font-family: sans-serif; max-width: 480px;">
          <h2>Verify your AttachTrack account</h2>
          <p>Hi ${name},</p>
          <p>Your verification code is:</p>
          <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${code}</p>
          <p>This code expires in ${env.verification.codeExpiryMinutes} minutes.</p>
          <p style="color:#888;">If you didn't request this, you can ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Failed to send verification email: ${body.message || res.statusText}`);
  }
}

async function sendPasswordResetEmail(toEmail, name, resetLink) {
  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'api-key': env.mail.brevoApiKey,
    },
    body: JSON.stringify({
      sender: { name: 'AttachTrack', email: env.mail.senderEmail },
      to: [{ email: toEmail, name }],
      subject: 'Reset your AttachTrack password',
      textContent:
        `Hi ${name},\n\n` +
        `We received a request to reset your AttachTrack password.\n\n` +
        `Use this link to choose a new password: ${resetLink}\n\n` +
        `If you did not request this, you can safely ignore this email.`,
      htmlContent: `
        <div style="font-family: sans-serif; max-width: 480px;">
          <h2>Reset your AttachTrack password</h2>
          <p>Hi ${name},</p>
          <p>We received a request to reset your password.</p>
          <p><a href="${resetLink}">Reset password</a></p>
          <p>If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Failed to send password reset email: ${body.message || res.statusText}`);
  }
}

async function sendAccountCreatedEmail(toEmail, name, role, tempPassword) {
  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'api-key': env.mail.brevoApiKey,
    },
    body: JSON.stringify({
      sender: { name: 'AttachTrack', email: env.mail.senderEmail },
      to: [{ email: toEmail, name }],
      subject: 'Your AttachTrack account has been created',
      textContent:
        `Hi ${name},\n\n` +
        `An AttachTrack account has been created for you with the role: ${role}.\n\n` +
        `Email: ${toEmail}\n` +
        `Temporary password: ${tempPassword}\n\n` +
        `You can log in with this password now, or reset it at any time using the "Forgot password" link on the login page.`,
      htmlContent: `
        <div style="font-family: sans-serif; max-width: 480px;">
          <h2>Your AttachTrack account has been created</h2>
          <p>Hi ${name},</p>
          <p>An AttachTrack account has been created for you with the role: <strong>${role}</strong>.</p>
          <p>Email: ${toEmail}</p>
          <p>Temporary password: <strong>${tempPassword}</strong></p>
          <p>You can log in with this password now, or reset it at any time using the "Forgot password" link on the login page.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Failed to send account created email: ${body.message || res.statusText}`);
  }
}

async function sendNotificationEmail(toEmail, name, subject, bodyText, bodyHtml) {
  if (env.nodeEnv === 'test' || !env.mail?.brevoApiKey || !env.mail?.senderEmail) {
    return;
  }

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'api-key': env.mail.brevoApiKey,
    },
    body: JSON.stringify({
      sender: { name: 'AttachTrack', email: env.mail.senderEmail },
      to: [{ email: toEmail, name }],
      subject,
      textContent: bodyText,
      htmlContent: bodyHtml || bodyText.replace(/\n/g, '<br />'),
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error('[sendNotificationEmail] failed:', body.message || res.statusText);
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAccountCreatedEmail,
  sendNotificationEmail,
};
