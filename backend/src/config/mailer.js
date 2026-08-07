const { Resend } = require('resend');
const env = require('./env');

const resend = new Resend(env.mail.resendApiKey);

// Render (and many hosting platforms) block outbound SMTP connections
// (ports 587/465/25) as an anti-spam measure — Nodemailer's direct Gmail
// SMTP transport worked locally but timed out (ETIMEDOUT) in production.
// Resend sends over HTTPS instead, which isn't blocked the same way.
async function sendVerificationEmail(toEmail, name, code) {
  const { error } = await resend.emails.send({
    from: 'AttachTrack <onboarding@resend.dev>',
    to: toEmail,
    subject: 'Verify your AttachTrack account',
    text:
      `Hi ${name},\n\n` +
      `Your AttachTrack verification code is: ${code}\n\n` +
      `This code expires in ${env.verification.codeExpiryMinutes} minutes.\n\n` +
      `If you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px;">
        <h2>Verify your AttachTrack account</h2>
        <p>Hi ${name},</p>
        <p>Your verification code is:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${code}</p>
        <p>This code expires in ${env.verification.codeExpiryMinutes} minutes.</p>
        <p style="color:#888;">If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    // Let the caller decide how to handle this (see auth.service.js) rather
    // than throwing here — a raw exception type from the Resend SDK isn't
    // as useful upstream as a plain Error with a clear message.
    throw new Error(`Failed to send verification email: ${error.message || 'Unknown error'}`);
  }
}

module.exports = { sendVerificationEmail };