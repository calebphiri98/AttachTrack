const env = require('./env');

// Render (and many hosting platforms) block outbound SMTP connections
// (ports 587/465/25) as an anti-spam measure — Nodemailer's direct Gmail
// SMTP transport worked locally but timed out (ETIMEDOUT) in production.
// Brevo's transactional email HTTP API sends over HTTPS instead, which
// isn't blocked the same way. Calling the REST API directly (rather than
// via the @getbrevo/brevo SDK) avoids that package's inconsistent export
// shape across versions, which crashed the app at startup.
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
    // Same pattern as before: let the caller (auth.service.js) decide how
    // to handle this rather than throwing a raw fetch/HTTP error upstream.
    throw new Error(`Failed to send verification email: ${body.message || res.statusText}`);
  }
}

module.exports = { sendVerificationEmail };