import { randomUUID, createHmac, timingSafeEqual } from 'crypto';
import pool from '../../config/database.js';
import logger from '../../config/logger.js';
import { metricsService } from '../metricsService.js';

/**
 * U-Kassa (ЮKassa / YooKassa) bank-card billing provider.
 *
 * Enablement is gated on the single optional env var UKASSA_TOKEN:
 *   - if UKASSA_TOKEN is set  → card payments are available
 *   - if UKASSA_TOKEN is unset → the whole provider is disabled and the
 *     card option is hidden in the UI. This keeps card payments opt-in.
 *
 * UKASSA_TOKEN is used both for API auth (Bearer, or Basic shopId:token when
 * UKASSA_SHOP_ID is also provided) and for webhook signature verification.
 */

const UKASSA_API = 'https://api.yookassa.ru/v3';

export function isUkassaEnabled() {
  return !!process.env.UKASSA_TOKEN;
}

function getAuthHeader() {
  const token = process.env.UKASSA_TOKEN;
  const shopId = process.env.UKASSA_SHOP_ID;
  if (shopId) {
    const basic = Buffer.from(`${shopId}:${token}`).toString('base64');
    return `Basic ${basic}`;
  }
  return `Bearer ${token}`;
}

function getPriceRub(planId, interval) {
  if (planId !== 'pro') throw new Error(`Unknown plan: ${planId}`);
  const monthly = parseFloat(process.env.UKASSA_PRO_MONTHLY_AMOUNT ?? '590');
  const yearly = parseFloat(process.env.UKASSA_PRO_YEARLY_AMOUNT ?? '5900');
  return interval === 'yearly' ? yearly : monthly;
}

// ─── Create a card payment (redirect to YooKassa) ──────────────────
export async function createUkassaPayment(userId, planId, interval, returnUrl) {
  if (!isUkassaEnabled()) throw new Error('U-Kassa is not configured');

  const value = getPriceRub(planId, interval).toFixed(2);
  const idempotencyKey = randomUUID();
  const metadata = { userId: String(userId), planId, interval };

  const body = {
    amount: { value, currency: 'RUB' },
    payment_method_data: { type: 'bank_card' },
    confirmation: { type: 'redirect', return_url: returnUrl },
    description: `Interview Tinder Pro — ${interval === 'yearly' ? '1 год' : '1 месяц'}`,
    metadata,
    capture: true,
  };

  const res = await fetch(`${UKASSA_API}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      'Authorization': getAuthHeader(),
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    logger.error({ status: res.status, json }, '💳 U-Kassa create payment failed');
    throw new Error(json.description || json.message || `U-Kassa error ${res.status}`);
  }

  logger.info({ userId, paymentId: json.id, value }, '💳 U-Kassa payment created');
  return {
    paymentId: json.id,
    status: json.status,
    confirmationUrl: json.confirmation?.confirmation_url || null,
  };
}

// ─── Activate subscription after confirmed card payment ────────────
export async function activateUkassaSubscription(userId, planId, interval, paymentId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const isYearly = interval === 'yearly';
    const expiresAt = new Date();
    isYearly
      ? expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      : expiresAt.setDate(expiresAt.getDate() + 30);

    // Idempotent upsert — ukassa_payment_id unique index prevents duplicates
    await client.query(
      `INSERT INTO user_subscriptions
         (user_id, plan_id, status, expires_at, payment_provider, payment_id, ukassa_payment_id)
       VALUES ($1, $2, 'active', $3, 'ukassa', $4, $4)
       ON CONFLICT (user_id, plan_id, status) DO UPDATE
         SET expires_at       = EXCLUDED.expires_at,
             payment_id       = EXCLUDED.payment_id,
             ukassa_payment_id = EXCLUDED.ukassa_payment_id,
             started_at       = CURRENT_TIMESTAMP`,
      [userId, planId, expiresAt, paymentId]
    );

    await client.query(
      `UPDATE users
         SET subscription_plan = $1, subscription_expires_at = $2
       WHERE telegram_id = $3`,
      [planId, expiresAt, userId]
    );

    await client.query('COMMIT');
    logger.info({ userId, planId, paymentId }, '✅ U-Kassa subscription activated');

    import('../referralService.js')
      .then(m => m.referralService.processConversion(userId))
      .catch(() => { });

    metricsService.trackEvent(userId, 'subscription_started', { planId, interval, provider: 'ukassa' });
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => { });
    // Replay of an already-processed payment — safe to ignore
    if (err.code === '23505') {
      logger.warn({ paymentId }, '⚠️ U-Kassa payment already processed (duplicate ignored)');
      return { success: true, duplicate: true };
    }
    logger.error({ err, userId, paymentId }, 'activateUkassaSubscription error');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Verify YooKassa webhook signature ────────────────────────────
// YooKassa signs the raw notification body with HMAC-SHA256 using the
// shop secret key (our UKASSA_TOKEN). The hex digest is sent in the
// `X-Request-Signature` header.
export function verifyUkassaSignature(rawBody, signature) {
  const token = process.env.UKASSA_TOKEN;
  if (!token || !signature || !rawBody) return false;
  const expected = createHmac('sha256', token).update(rawBody).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ─── Handle a YooKassa webhook event ──────────────────────────────
export async function handleUkassaEvent(event) {
  const obj = event?.object;
  if (!obj) return { ignored: true };

  // We capture automatically (capture: true), so success arrives as
  // 'payment.succeeded'. Also handle the rare waiting_for_capture case.
  if (event.event === 'payment.succeeded' || event.event === 'payment.waiting_for_capture') {
    const { userId, planId, interval } = obj.metadata || {};
    if (!userId) return { ignored: true };
    await activateUkassaSubscription(
      userId,
      planId || 'pro',
      interval || 'monthly',
      obj.id
    );
    return { activated: true, paymentId: obj.id };
  }

  if (event.event === 'payment.canceled') {
    logger.info({ paymentId: obj.id }, '💳 U-Kassa payment canceled');
  }

  return { ignored: true };
}
