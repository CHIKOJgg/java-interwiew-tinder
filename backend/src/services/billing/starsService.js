import pool from '../../config/database.js';
import { metricsService } from '../metricsService.js';

const TG_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

// ─── Send Stars invoice to user's Telegram chat ────────────────────
export async function sendStarsInvoice(telegramUserId, planId, interval) {
  const isYearly = interval === 'yearly';
  const amount   = isYearly
    ? parseInt(process.env.STARS_PRO_YEARLY_AMOUNT  || '3000')
    : parseInt(process.env.STARS_PRO_MONTHLY_AMOUNT || '450');
  const label    = isYearly ? 'Pro — 1 year' : 'Pro — 1 month';
  const payload  = JSON.stringify({ userId: telegramUserId.toString(), planId, interval });

  const res = await fetch(`${TG_API}/sendInvoice`, {
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

  await fetch(`${TG_API}/answerPreCheckoutQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Send a simple text message to a chat ─────────────────────────
export async function sendTelegramMessage(chatId, text) {
  await fetch(`${TG_API}/sendMessage`, {
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

    // Track subscription start
    metricsService.trackEvent(userId, 'subscription_started', { planId, interval, provider: 'stars' });

    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, userId, chargeId }, 'activateStarsSubscription error');
    throw err;
  } finally {
    client.release();
  }
}
