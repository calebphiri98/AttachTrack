const brevo = require('@getbrevo/brevo');
const env = require('./env');

// Render (and many hosting platforms) block outbound SMTP connections
// (ports 587/465/25) as an anti-spam measure — Nodemailer's direct Gmail
// SMTP transport worked locally but timed out (ETIMEDOUT) in production.
// Brevo's transactional API sends over HTTPS instead, which isn't blocked
// the same way. Unlike Resend's free sandbox tier, Brevo's free tier does
// NOT require a verified domain to send to arbitrary recipients — it just
// caps daily volume (currently 300 emails/day on the free plan).
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, env.mail.brevoApiKey);

async function sendVerificationEmail(toEmail, name, code) {
  const sendSmtpEmail = new brevo.SendSmtpEmail();

  sendSmtpEmail.sender = { name: 'AttachTrack', email: env.mail.senderEmail };
  sendSmtpEmail.to = [{ email: toEmail, name }];
  sendSmtpEmail.subject = 'Verify your AttachTrack account';
  sendSmtpEmail.textContent =
    `Hi ${name},\n\n` +
    `Your AttachTrack verification code is: ${code}\n\n` +
    `This code expires in ${env.verification.codeExpiryMinutes} minutes.\n\n` +
    `If you didn't request this, you can ignore this email.`;
  sendSmtpEmail.htmlContent = `
    <div style="font-family: sans-serif; max-width: 480px;">
      <h2>Verify your AttachTrack account</h2>
      <p>Hi ${name},</p>
      <p>Your verification code is:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${code}</p>
      <p>This code expires in ${env.verification.codeExpiryMinutes} minutes.</p>
      <p style="color:#888;">If you didn't request this, you can ignore this email.</p>
    </div>
  `;

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
  } catch (err) {
    // Same pattern as before: let the caller (auth.service.js) decide how to
    // handle this rather than throwing a raw Brevo SDK error upstream.
    const brevoMessage = err?.response?.body?.message || err.message || 'Unknown error';
    throw new Error(`Failed to send verification email: ${brevoMessage}`);
  }
}

module.exports = { sendVerificationEmail };