import nodemailer from 'nodemailer';
import logger from '../config/logger.js';

/**
 * Env-gated SMTP transport.
 *
 * Configure via .env / CI secrets:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 *
 * If SMTP is not configured the transport is null and callers fall back to
 * logging the message (dev / preview). This keeps email auth functional in
 * production without breaking local dev.
 */
let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: (process.env.SMTP_PORT || '587') === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendEmail({ to, subject, text, html }) {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@interviewtinder.app';

  if (!transporter) {
    logger.warn({ to, subject }, 'SMTP not configured — email not sent (dev fallback)');
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[email] to=${to} subject="${subject}"\n${text}`);
    }
    return false;
  }

  try {
    await transporter.sendMail({ from, to, subject, text, html });
    logger.info({ to, subject }, 'Email sent');
    return true;
  } catch (err) {
    logger.error({ err, to, subject }, 'Failed to send email');
    return false;
  }
}

export default sendEmail;
