import crypto from 'crypto';
import '../config/env.js'; // ensure .env loaded before reading process.env
import { validateTelegramWebAppData, mockValidation } from './telegram.js';
import pool from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Multi-provider authentication for Telegram Mini App + standalone Web/PWA.
 *
 * Telegram stays the primary provider. For web access we mint a synthetic
 * telegram_id (g_<google_sub> / e_<sha1(email)>) so the rest of the codebase
 * — which keys everything off telegram_id — keeps working unchanged.
 */

function syntheticId(prefix, value) {
  return `${prefix}_${crypto.createHash('sha1').update(value).digest('hex').slice(0, 16)}`;
}

// ─── Telegram ────────────────────────────────────────────────────────
function verifyTelegram(initData, isDev) {
  if (process.env.BOT_TOKEN && initData) {
    const data = validateTelegramWebAppData(initData, process.env.BOT_TOKEN);
    if (data) return data;
  }
  if (isDev) return mockValidation();
  return null;
}

// ─── Google (ID token) ──────────────────────────────────────────────
// Verifies a Google OAuth2 ID token and returns normalized user data.
// Uses Google's tokeninfo endpoint (no SDK dependency) — suitable for the
// scope we need (sub, email, name). Set ENABLE_GOOGLE_AUTH=true to activate.
export async function verifyGoogle(idToken) {
  if (process.env.ENABLE_GOOGLE_AUTH !== 'true') {
    throw new Error('Google auth is not enabled');
  }
  if (!idToken) return null;

  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );
  if (!res.ok) throw new Error('Google token validation failed');
  const payload = await res.json();

  // aud must match our client id
  if (process.env.GOOGLE_CLIENT_ID && payload.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw new Error('Google token audience mismatch');
  }
  if (payload.exp * 1000 < Date.now()) throw new Error('Google token expired');

  const sub = payload.sub;
  return {
    telegram_id: syntheticId('g', sub),
    external_id: sub,
    auth_provider: 'google',
    email: payload.email || null,
    username: payload.email ? payload.email.split('@')[0] : null,
    first_name: payload.given_name || payload.name || 'Google User',
    last_name: payload.family_name || null,
  };
}

// ─── Email magic-link ───────────────────────────────────────────────
// Step 1: create/send a 6-digit code. Step 2: verify code → user.
const emailCodes = new Map(); // email -> { code, expiresAt }

export async function issueEmailCode(email) {
  if (process.env.ENABLE_EMAIL_AUTH !== 'true') {
    throw new Error('Email auth is not enabled');
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || '')) {
    throw new Error('Invalid email');
  }
  const code = String(crypto.randomInt(100000, 999999));
  emailCodes.set(email.toLowerCase(), { code, expiresAt: Date.now() + 10 * 60 * 1000 });
  logger.info({ email }, '📧 Email magic-link code issued');
  // TODO: send via email provider (SES/SendGrid). For now log in dev.
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[magic-link] ${email} -> ${code}`);
  }
  return true;
}

export function verifyEmailCode(email, code) {
  const entry = emailCodes.get((email || '').toLowerCase());
  if (!entry) throw new Error('No code requested');
  if (entry.expiresAt < Date.now()) { emailCodes.delete(email.toLowerCase()); throw new Error('Code expired'); }
  if (entry.code !== String(code)) throw new Error('Invalid code');
  emailCodes.delete(email.toLowerCase());

  const lower = email.toLowerCase();
  return {
    telegram_id: syntheticId('e', lower),
    external_id: lower,
    auth_provider: 'email',
    email: lower,
    username: lower.split('@')[0],
    first_name: lower.split('@')[0],
    last_name: null,
  };
}

// ─── Resolve identity from a login request ──────────────────────────
export async function resolveAuth({ provider, initData, idToken, email, code }, isDev) {
  switch (provider) {
    case 'google':
      return await verifyGoogle(idToken);
    case 'email':
      return verifyEmailCode(email, code);
    case 'telegram':
    default:
      return verifyTelegram(initData, isDev);
  }
}

// ─── Upsert + issue JWT (shared by all providers) ───────────────────
export async function upsertUser(userData, referralId, jwtSign) {
  const result = await pool.query(
    `INSERT INTO users (telegram_id, username, first_name, last_name, auth_provider, external_id, email)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (telegram_id) DO UPDATE SET
       username = COALESCE(EXCLUDED.username, users.username),
       first_name = COALESCE(EXCLUDED.first_name, users.first_name),
       last_name = COALESCE(EXCLUDED.last_name, users.last_name),
       auth_provider = EXCLUDED.auth_provider,
       external_id = COALESCE(EXCLUDED.external_id, users.external_id),
       email = COALESCE(EXCLUDED.email, users.email)
     RETURNING *, (xmax = 0) AS is_new_user`,
    [
      userData.telegram_id, userData.username, userData.first_name, userData.last_name,
      userData.auth_provider || 'telegram', userData.external_id || null, userData.email || null,
    ]
  );

  const user = result.rows[0];
  if (referralId && user.is_new_user) {
    try {
      const { referralService } = await import('../services/referralService.js');
      await referralService.trackReferral(referralId, user.telegram_id);
    } catch (err) {
      logger.error({ err, userId: user.telegram_id }, 'Referral tracking failed');
    }
  }

  const token = jwtSign({ userId: String(user.telegram_id), plan: user.subscription_plan });
  return { user, token };
}
