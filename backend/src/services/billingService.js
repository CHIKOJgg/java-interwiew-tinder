import pool from '../config/database.js';

/**
 * Mock Billing Service
 * In production, this would integrate with Stripe, Apple Pay, or Telegram Payments.
 */
export const billingService = {
  async createSubscription(userId, planId, paymentId = 'mock_payment') {
    const { rows: planRows } = await pool.query('SELECT * FROM subscription_plans WHERE id = $1', [planId]);
    if (planRows.length === 0) throw new Error('Invalid plan');

    const plan = planRows[0];
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await pool.query('BEGIN');
    try {
      // Deactivate current active subscriptions
      await pool.query(
        "UPDATE user_subscriptions SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND status = 'active'",
        [userId]
      );

      // Create new subscription
      await pool.query(
        `INSERT INTO user_subscriptions (user_id, plan_id, status, expires_at, payment_id, payment_provider)
         VALUES ($1, $2, 'active', $3, $4, 'mock')`,
        [userId, planId, expiresAt, paymentId]
      );

      // Update user table for fast lookup
      await pool.query(
        'UPDATE users SET subscription_plan = $1, subscription_expires_at = $2 WHERE telegram_id = $3',
        [planId, expiresAt, userId]
      );

      await pool.query('COMMIT');
      return { success: true, expiresAt };
    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }
  },

  async cancelSubscription(userId) {
    await pool.query(
      "UPDATE user_subscriptions SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND status = 'active'",
      [userId]
    );
    await pool.query(
      'UPDATE users SET subscription_plan = $1 WHERE telegram_id = $2',
      ['free', userId]
    );
    return { success: true };
  },

  async getHistory(userId) {
    const { rows } = await pool.query(
      'SELECT us.*, sp.name as plan_name FROM user_subscriptions us JOIN subscription_plans sp ON us.plan_id = sp.id WHERE us.user_id = $1 ORDER BY us.created_at DESC',
      [userId]
    );
    return rows;
  }
};
