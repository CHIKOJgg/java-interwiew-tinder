

import '../../config/env.js'; // ensure .env loaded before reading process.env
import { randomBytes } from 'crypto';
import pool from '../../config/database.js';
import logger from '../../config/logger.js';

// ─── Config ────────────────────────────────────────────────────────────
// Lazy getter — read at call time so a missing/late dotenv load can never
// capture an empty string into a top-level constant.
function getTonWallet() {
  return process.env.TON_WALLET_ADDRESS ?? '';
}
const TONCENTER = 'https://toncenter.com/api/v2';
const API_KEY = process.env.TON_CENTER_API_KEY ?? '';     // optional, raises rate-limit
const INVOICE_TTL = 15 * 60 * 1_000;                         // 15 minutes

function getPriceTon(planId, interval) {
  if (planId === 'pro') {
    const monthly = parseFloat(process.env.TON_PRO_MONTHLY_AMOUNT ?? '2.0');
    const yearly = parseFloat(process.env.TON_PRO_YEARLY_AMOUNT ?? '13.0');
    return interval === 'yearly' ? yearly : monthly;
  }
  throw new Error(`Unknown plan: ${planId}`);
}

function makeInvoiceId(userId) {
  // Short unique ID that fits in a TON memo comment (128 byte max)
  // Format: IT-<userId>-<6 random hex chars>
  const rand = randomBytes(3).toString('hex');
  return `IT-${userId}-${rand}`;
}

// ─── Create a new pending invoice ──────────────────────────────────────
export async function createTonInvoice(userId, planId, interval = 'monthly') {
  if (!getTonWallet()) throw new Error('TON_WALLET_ADDRESS is not configured');

  const amountTon = getPriceTon(planId, interval);
  const invoiceId = makeInvoiceId(userId);
  const expiresAt = new Date(Date.now() + INVOICE_TTL);

  // Cancel any existing pending invoice for this user first (one at a time)
  await pool.query(
    `UPDATE pending_ton_invoices SET fulfilled = true
     WHERE user_id = $1 AND fulfilled = false`,
    [userId]
  );

  await pool.query(
    `INSERT INTO pending_ton_invoices
       (invoice_id, user_id, plan_id, interval, amount_ton, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [invoiceId, userId, planId, interval, amountTon, expiresAt]
  );

  logger.info({ userId, invoiceId, amountTon }, '💎 TON invoice created');
  return { address: getTonWallet(), amountTon, comment: invoiceId, invoiceId, expiresAt };
}

// ─── Check a specific user's pending invoice ────────────────────────────
export async function getUserPendingInvoice(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM pending_ton_invoices
     WHERE user_id = $1 AND fulfilled = false AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

// ─── Query TON Center for recent inbound transactions ───────────────────
async function fetchRecentTransactions(address) {
  // TON Center v2 getTransactions requires the `lt` (logical time) of the
  // account's latest transaction. Fetch it first, then page backwards from it.
  const infoParams = new URLSearchParams({ address });
  if (API_KEY) infoParams.set('api_key', API_KEY);
  const infoRes = await fetch(`${TONCENTER}/getAddressInformation?${infoParams}`);
  if (!infoRes.ok) throw new Error(`TON Center getAddressInformation HTTP ${infoRes.status}`);
  const infoJson = await infoRes.json();
  if (!infoJson.ok) throw new Error(`TON Center getAddressInformation error: ${infoJson.error}`);
  const lt = infoJson.result?.last_transaction_lt ?? '0';

  const params = new URLSearchParams({ address, limit: '30', lt, to_lt: '0' });
  if (API_KEY) params.set('api_key', API_KEY);

  const res = await fetch(`${TONCENTER}/getTransactions?${params}`);
  if (!res.ok) throw new Error(`TON Center HTTP ${res.status}`);

  const json = await res.json();
  if (!json.ok) throw new Error(`TON Center error: ${json.error}`);
  return json.result ?? [];
}

// ─── Try to fulfill one invoice against fetched transactions ─────────────
async function tryFulfillInvoice(invoice, transactions) {
  const expectedNanotons = BigInt(Math.round(invoice.amount_ton * 1e9));

  for (const tx of transactions) {
    const msg = tx.in_msg;
    if (!msg || !msg.message) continue;

    const comment = msg.message.trim();
    const valueNano = BigInt(msg.value ?? '0');

    if (comment !== invoice.invoice_id) continue;
    if (valueNano < expectedNanotons) continue;

    // Match found
    const txHash = tx.transaction_id?.hash ?? tx.hash ?? String(tx.utime);
    await activateTonSubscription(
      invoice.user_id, invoice.plan_id, invoice.interval,
      txHash, invoice.invoice_id
    );
    return true;
  }
  return false;
}

// ─── Activate subscription after confirmed TON payment ─────────────────
export async function activateTonSubscription(userId, planId, interval, txHash, invoiceId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const isYearly = interval === 'yearly';
    const expiresAt = new Date();
    isYearly
      ? expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      : expiresAt.setDate(expiresAt.getDate() + 30);

    // Idempotent upsert — ton_tx_hash unique index prevents duplicates
    await client.query(
      `INSERT INTO user_subscriptions
         (user_id, plan_id, status, expires_at, payment_provider, payment_id, ton_tx_hash, ton_invoice_id)
       VALUES ($1, $2, 'active', $3, 'ton', $4, $4, $5)
       ON CONFLICT (user_id, plan_id, status) DO UPDATE
         SET expires_at      = EXCLUDED.expires_at,
             payment_id      = EXCLUDED.payment_id,
             ton_tx_hash     = EXCLUDED.ton_tx_hash,
             ton_invoice_id  = EXCLUDED.ton_invoice_id,
             started_at      = CURRENT_TIMESTAMP`,
      [userId, planId, expiresAt, txHash, invoiceId]
    );

    await client.query(
      `UPDATE users
         SET subscription_plan = $1, subscription_expires_at = $2
       WHERE telegram_id = $3`,
      [planId, expiresAt, userId]
    );

    // Mark invoice as fulfilled
    if (invoiceId) {
      await client.query(
        `UPDATE pending_ton_invoices
           SET fulfilled = true, tx_hash = $1
         WHERE invoice_id = $2`,
        [txHash, invoiceId]
      );
    }

    await client.query('COMMIT');
    logger.info({ userId, planId, txHash }, '✅ TON subscription activated');

    // Process referral conversion if applicable
    import('../referralService.js')
      .then(m => m.referralService.processConversion(userId))
      .catch((err) => logger.error({ err, userId }, 'Failed to process TON referral conversion'));

    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => { });
    // If it's a unique_violation on ton_tx_hash, it's a replay — safe to ignore
    if (err.code === '23505') {
      logger.warn({ txHash }, '⚠️ TON tx already processed (duplicate ignored)');
      return { success: true, duplicate: true };
    }
    logger.error({ err, userId, txHash }, 'activateTonSubscription error');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Background poller — call this from server.js on startup ───────────
export async function pollPendingInvoices() {
  if (!getTonWallet()) return; // not configured, skip silently

  let pending;
  try {
    const { rows } = await pool.query(
      `SELECT * FROM pending_ton_invoices
       WHERE fulfilled = false AND expires_at > NOW()
       ORDER BY created_at ASC`
    );
    pending = rows;
  } catch (err) {
    logger.error({ err }, 'TON poller DB error');
    return;
  }

  if (pending.length === 0) return;

  let transactions;
  try {
    transactions = await fetchRecentTransactions(getTonWallet());
  } catch (err) {
    logger.error({ err }, 'TON Center fetch error');
    return;
  }

  for (const invoice of pending) {
    try {
      const fulfilled = await tryFulfillInvoice(invoice, transactions);
      if (fulfilled) {
        logger.info({ invoiceId: invoice.invoice_id }, '💎 TON invoice fulfilled');
      }
    } catch (err) {
      logger.error({ err, invoiceId: invoice.invoice_id }, 'TON poller error for invoice');
    }
  }
}
