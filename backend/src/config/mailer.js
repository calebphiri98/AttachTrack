const nodemailer = require('nodemailer');
const env = require('./env');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.mail.gmailUser,
    pass: env.mail.gmailAppPassword,
  },
});

async function sendVerificationEmail(toEmail, name, code) {
  await transporter.sendMail({
    from: `AttachTrack <${env.mail.gmailUser}>`,
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
}

module.exports = { transporter, sendVerificationEmail };
