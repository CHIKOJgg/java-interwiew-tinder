import pool from '../config/database.js';

/**
 * Billing Service
 * Handles subscription lifecycle: create, cancel, history.
 * In production integrate Stripe/Telegram Payments here.
 */
export const billingService = {

  async createSubscription(userId, planId) {
    const client = await pool.connect();
    try {
      const { rows: planRows } = await client.query(
        'SELECT * FROM subscription_plans WHERE id = $1', [planId]
      );
      if (planRows.length === 0) throw new Error(`Plan '${planId}' not found`);

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      await client.query('BEGIN');

      // ── Delete ALL previous active subscriptions for this user.
      // We use DELETE instead of UPDATE to 'cancelled' to avoid the
      // UNIQUE(user_id, plan_id, status) constraint — updating two rows
      // to 'cancelled' for the same plan would violate it if a cancelled
      // row for that plan already exists.
      await client.query(
        `DELETE FROM user_subscriptions WHERE user_id=$1 AND status='active'`,
        [userId]
      );

      // ── Insert new active subscription (always unique since we just deleted)
      const paymentId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await client.query(
        `INSERT INTO user_subscriptions (user_id, plan_id, status, expires_at, payment_id, payment_provider)
         VALUES ($1, $2, 'active', $3, $4, 'mock')
         ON CONFLICT (user_id, plan_id, status) DO UPDATE
           SET expires_at=$3, payment_id=$4, started_at=CURRENT_TIMESTAMP`,
        [userId, planId, expiresAt, paymentId]
      );

      // ── Fast-lookup columns on users table
      await client.query(
        `UPDATE users
         SET subscription_plan=$1, subscription_expires_at=$2
         WHERE telegram_id=$3`,
        [planId, expiresAt, userId]
      );

      await client.query('COMMIT');
      console.log(`✅ Subscription created: user=${userId} plan=${planId}`);
      return { success: true, planId, expiresAt };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error(`❌ createSubscription error user=${userId} plan=${planId}:`, err.message);
      throw err;
    } finally {
      client.release();
    }
  },

  async cancelSubscription(userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rowCount } = await client.query(
        `UPDATE user_subscriptions
         SET status='cancelled', cancelled_at=CURRENT_TIMESTAMP
         WHERE user_id=$1 AND status='active'`,
        [userId]
      );

      if (rowCount === 0) {
        await client.query('ROLLBACK');
        // Idempotent — already cancelled is fine
        return { success: true, message: 'No active subscription found' };
      }

      await client.query(
        `UPDATE users SET subscription_plan='free', subscription_expires_at=NULL WHERE telegram_id=$1`,
        [userId]
      );

      await client.query('COMMIT');
      console.log(`✅ Subscription cancelled: user=${userId}`);
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error(`❌ cancelSubscription error user=${userId}:`, err.message);
      throw err; // let server.js return 500 with real message
    } finally {
      client.release();
    }
  },

  async getHistory(userId) {
    try {
      const { rows } = await pool.query(
        `SELECT us.*, sp.name as plan_name
         FROM user_subscriptions us
         JOIN subscription_plans sp ON us.plan_id = sp.id
         WHERE us.user_id=$1
         ORDER BY us.created_at DESC`,
        [userId]
      );
      return rows;
    } catch (err) {
      console.error('getHistory error:', err.message);
      return [];
    }
  },
};
