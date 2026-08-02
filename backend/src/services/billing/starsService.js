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
  try {
    const isYearly = interval === 'yearly';

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
        payload,
        currency:       'XTR',
        prices:         [{ label, amount }],
        provider_token: '',
      }),
    });

    const json = await res.json();
    if (!json.ok) throw new Error(`sendInvoice failed: ${json.description}`);
    return json;
  } catch (err) {
    logger.error({ err, telegramUserId, planId, interval }, 'sendStarsInvoice failed');
    throw err;
  }
}

// ─── Answer pre_checkout_query (must happen within 10 s) ───────────
export async function answerPreCheckout(preCheckoutQueryId, ok = true, errorMsg = null) {
  try {
    const body = { pre_checkout_query_id: preCheckoutQueryId, ok };
    if (!ok && errorMsg) body.error_message = errorMsg;

    await fetch(`${tgApi()}/answerPreCheckoutQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    logger.error({ err, preCheckoutQueryId }, 'answerPreCheckout failed');
    throw err;
  }
}

// ─── Send a simple text message to a chat ─────────────────────────
export async function sendTelegramMessage(chatId, text) {
  try {
    await fetch(`${tgApi()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (err) {
    logger.error({ err, chatId }, 'sendTelegramMessage failed');
    throw err;
  }
}

import logger from '../../config/logger.js';

// ─── Activate subscription after confirmed payment ─────────────────
// Idempotent by chargeId: webhook replays are detected up front and ignored,
// and a genuine re-purchase extends the subscription from its current expiry
// (never resets the clock).
export async function activateStarsSubscription(userId, planId, interval, chargeId) {
  if (!chargeId) throw new Error('Missing chargeId — cannot activate subscription');
  const client = await pool.connect();
  try {
    // Replay guard: this charge has already been processed.
    const existingCharge = await client.query(
      `SELECT id FROM user_subscriptions WHERE stars_charge_id = $1 OR payment_id = $1 LIMIT 1`,
      [chargeId]
    );
    if (existingCharge.rows.length > 0) {
      logger.info({ userId, planId, chargeId }, '⭐ Stars webhook replay ignored (charge already processed)');
      return { success: true, replayed: true };
    }

    await client.query('BEGIN');

    const isYearly   = interval === 'yearly';
    // Extend from the current expiry if the user still has an active
    // subscription — a re-purchase stacks on top instead of wiping days.
    const activeSub = await client.query(
      `SELECT expires_at FROM user_subscriptions
       WHERE user_id = $1 AND status = 'active' AND plan_id = $2
       ORDER BY expires_at DESC NULLS LAST LIMIT 1`,
      [userId, planId]
    );
    const base = new Date(activeSub.rows[0]?.expires_at || Date.now());
    if (base.getTime() < Date.now()) base.setTime(Date.now());
    const expiresAt = new Date(base);
    isYearly
      ? expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      : expiresAt.setDate(expiresAt.getDate() + 30);

    // Upsert subscription row — conflict only fires on a genuine re-purchase
    // of the same plan; extend from the greatest expiry.
    await client.query(
      `INSERT INTO user_subscriptions
         (user_id, plan_id, status, expires_at, payment_provider, payment_id, stars_charge_id)
       VALUES ($1, $2, 'active', $3, 'stars', $4, $4)
       ON CONFLICT (user_id, plan_id, status) DO UPDATE
         SET expires_at      = GREATEST(user_subscriptions.expires_at, EXCLUDED.expires_at),
             payment_id      = EXCLUDED.payment_id,
             stars_charge_id = EXCLUDED.stars_charge_id`,
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
