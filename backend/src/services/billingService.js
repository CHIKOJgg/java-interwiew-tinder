import pool from '../config/database.js';
import { activateStarsSubscription } from './billing/starsService.js';

/**
 * Billing Service — Telegram Stars (primary payment provider)
 * No Stripe, no Paddle. Stars invoices are sent via Bot API.
 * Server-side only handles DB state; invoice sending is in starsService.js.
 */
export const billingService = {

  /**
   * Activate a subscription after successful Stars payment.
   * Delegates to starsService for idempotent DB upsert.
   */
  async activateSubscription(userId, planId, interval, chargeId) {
    return activateStarsSubscription(userId, planId, interval ?? 'monthly', chargeId);
  },

  /**
   * Cancel an active Stars subscription.
   * Stars has no external API to call — we just set the local status.
   * User keeps access until expires_at; no automatic renewal to stop.
   */
  async cancelSubscription(userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rowCount } = await client.query(
        `UPDATE user_subscriptions
           SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND status = 'active'`,
        [userId]
      );

      if (rowCount === 0) {
        await client.query('ROLLBACK');
        return { success: true, message: 'No active subscription found' };
      }

      await client.query(
        `UPDATE users
           SET subscription_plan = 'free', subscription_expires_at = NULL
         WHERE telegram_id = $1`,
        [userId]
      );

      await client.query('COMMIT');
      console.log(`✅ Subscription cancelled: user=${userId}`);
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('cancelSubscription error:', err.message);
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Return last N subscription records with plan name.
   */
  async getHistory(userId, limit = 10) {
    try {
      const { rows } = await pool.query(
        `SELECT us.*, sp.name AS plan_name
         FROM user_subscriptions us
         JOIN subscription_plans sp ON us.plan_id = sp.id
         WHERE us.user_id = $1
         ORDER BY us.created_at DESC
         LIMIT $2`,
        [userId, limit]
      );
      return rows;
    } catch (err) {
      console.error('getHistory error:', err.message);
      return [];
    }
  },

  /**
   * Return current active subscription info for billing page.
   */
  async getBillingInfo(userId) {
    try {
      const { rows } = await pool.query(
        `SELECT us.*, sp.name AS plan_name
         FROM user_subscriptions us
         JOIN subscription_plans sp ON us.plan_id = sp.id
         WHERE us.user_id = $1 AND us.status = 'active'
           AND (us.expires_at IS NULL OR us.expires_at > CURRENT_TIMESTAMP)
         ORDER BY us.created_at DESC LIMIT 1`,
        [userId]
      );
      if (rows.length === 0) return { plan: 'free', status: 'active' };
      const r = rows[0];
      return {
        plan:         r.plan_id,
        plan_name:    r.plan_name,
        expires_at:   r.expires_at,
        status:       r.status,
        is_cancelled: r.cancelled_at !== null,
        provider:     r.payment_provider,
      };
    } catch (err) {
      console.error('getBillingInfo error:', err.message);
      return { plan: 'free', status: 'active' };
    }
  },
};
