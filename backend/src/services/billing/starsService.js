import '../../config/env.js'; // ensure .env loaded before reading process.env
import pool from '../../config/database.js';
import { metricsService } from '../metricsService.js';

// Lazy getter — BOT_TOKEN is read at call time, not at module import, so a
// missing/late dotenv load can never capture `undefined` into a constant.
function tgApi() {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error('BOT_TOKEN is not configured');
  return `https://api.telegram.org/bot${token}`;
}

// ─── Resolve Stars amount for a plan (single source of truth) ────────
// Reads from the DB; falls back to env defaults. Exported so other code
// (e.g. createInvoiceLink) can show the exact same number the UI shows.
export async function getStarsAmount(planId, interval = 'monthly') {
  const isYearly = interval === 'yearly';
  try {
    const { rows } = (await pool.query(
      `SELECT ${isYearly ? 'stars_yearly' : 'stars_monthly'} AS amount FROM subscription_plans WHERE id = $1`,
      [planId]
    )) || {};
    if (rows?.[0]?.amount) return rows[0].amount;
  } catch { /* fall through to env defaults */ }
  return isYearly
    ? parseInt(process.env.STARS_PRO_YEARLY_AMOUNT  || '3000')
    : parseInt(process.env.STARS_PRO_MONTHLY_AMOUNT || '450');
}

// ─── Send Stars invoice to user's Telegram chat ────────────────────
export async function sendStarsInvoice(telegramUserId, planId, interval) {
  const isYearly = interval === 'yearly';

  // Single source of truth: pull the Stars amount from the plan in the DB so
  // the invoice always matches what the UI shows. Fall back to env defaults.
  const amount = await getStarsAmount(planId, interval);

  const label    = isYearly ? 'Pro — 1 year' : 'Pro — 1 month';
  const payload  = JSON.stringify({ userId: telegramUserId.toString(), planId, interval });

  const res = await fetch(`${tgApi()}/sendInvoice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id:        telegramUserId,
      title:          'Interview Tinder Pro',
      description:    'Unlimited AI explanations · All languages · All study modes',
      payload,                         // Returned verbatim in successful_payment
      currency:       'XTR',           // XTR = Telegram Stars
      prices:         [{ label, amount }],
      provider_token: '',              // Empty = Stars payment (no external provider)
    }),
  });

  const json = await res.json();
  if (!json.ok) throw new Error(`sendInvoice failed: ${json.description}`);
  return json;
}

// ─── Answer pre_checkout_query (must happen within 10 s) ───────────
export async function answerPreCheckout(preCheckoutQueryId, ok = true, errorMsg = null) {
  const body = { pre_checkout_query_id: preCheckoutQueryId, ok };
  if (!ok && errorMsg) body.error_message = errorMsg;

  await fetch(`${tgApi()}/answerPreCheckoutQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Send a simple text message to a chat ─────────────────────────
export async function sendTelegramMessage(chatId, text) {
  await fetch(`${tgApi()}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

import logger from '../../config/logger.js';

// ─── Activate subscription after confirmed payment ─────────────────
// Idempotent: ON CONFLICT … DO UPDATE so replays are harmless.
export async function activateStarsSubscription(userId, planId, interval, chargeId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const isYearly   = interval === 'yearly';
    const expiresAt  = new Date();
    isYearly
      ? expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      : expiresAt.setDate(expiresAt.getDate() + 30);

    // Upsert subscription row — idempotent on chargeId
    await client.query(
      `INSERT INTO user_subscriptions
         (user_id, plan_id, status, expires_at, payment_provider, payment_id, stars_charge_id)
       VALUES ($1, $2, 'active', $3, 'stars', $4, $4)
       ON CONFLICT (user_id, plan_id, status) DO UPDATE
         SET expires_at      = EXCLUDED.expires_at,
             payment_id      = EXCLUDED.payment_id,
             stars_charge_id = EXCLUDED.stars_charge_id,
             started_at      = CURRENT_TIMESTAMP`,
      [userId, planId, expiresAt, chargeId]
    );

    // Fast-lookup columns on users table
    await client.query(
      `UPDATE users
         SET subscription_plan = $1, subscription_expires_at = $2
       WHERE telegram_id = $3`,
      [planId, expiresAt, userId]
    );

    await client.query('COMMIT');
    logger.info({ userId, planId, chargeId }, '⭐ Stars subscription activated');

    // Process referral conversion if applicable
    import('../referralService.js').then(m => m.referralService.processConversion(userId)).catch(err => logger.error({ err, userId }, 'Referral conversion failed after Stars payment'));

    // Track subscription start
    metricsService.trackEvent(userId, 'subscription_started', { planId, interval, provider: 'stars' });

    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK').catch(err => logger.error({ err }, 'ROLLBACK failed after Stars activation error'));
    logger.error({ err, userId, chargeId }, 'activateStarsSubscription error');
    throw err;
  } finally {
    client.release();
  }
}
