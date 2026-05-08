import pool from '../config/database.js';
import { sendTelegramMessage } from './billing/starsService.js';
import logger from '../config/logger.js';

export const referralService = {
  /**
   * Track a referral when a new user joins.
   * Called during /auth/login if ref parameter is present.
   */
  async trackReferral(referrerId, referredId) {
    if (String(referrerId) === String(referredId)) return;

    try {
      await pool.query(
        `INSERT INTO referrals (referrer_id, referred_id)
         VALUES ($1, $2)
         ON CONFLICT (referred_id) DO NOTHING`,
        [referrerId, referredId]
      );
      logger.info({ referrerId, referredId }, '🤝 Referral tracked');
    } catch (err) {
      logger.error({ err, referrerId, referredId }, 'trackReferral error');
    }
  },

  /**
   * Mark referral as converted and grant reward to referrer.
   * Called when a user completes their first payment.
   */
  async processConversion(referredId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Find if this user was referred and not yet rewarded
      const { rows } = await client.query(
        `SELECT referrer_id, id FROM referrals 
         WHERE referred_id = $1 AND converted = false AND reward_granted = false
         FOR UPDATE`,
        [referredId]
      );

      if (rows.length === 0) {
        await client.query('COMMIT');
        return;
      }

      const { referrer_id, id: referralId } = rows[0];

      // Mark as converted
      await client.query(
        `UPDATE referrals SET converted = true, reward_granted = true WHERE id = $1`,
        [referralId]
      );

      // Grant 7 days of Pro to referrer
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await client.query(
        `UPDATE user_subscriptions
         SET expires_at = COALESCE(expires_at, CURRENT_TIMESTAMP) + INTERVAL '7 days',
             status = 'active'
         WHERE user_id = $1 AND status = 'active'`,
        [referrer_id]
      );

      // Also update users table fast-lookup column
      await client.query(
        `UPDATE users
         SET subscription_expires_at = COALESCE(subscription_expires_at, CURRENT_TIMESTAMP) + INTERVAL '7 days',
             subscription_plan = CASE WHEN subscription_plan = 'free' THEN 'pro' ELSE subscription_plan END
         WHERE telegram_id = $1`,
        [referrer_id]
      );

      await client.query('COMMIT');
      logger.info({ referrer_id, referredId }, '🎁 Referral reward granted');

      // Notify referrer
      const { rows: referredUser } = await pool.query('SELECT first_name FROM users WHERE telegram_id = $1', [referredId]);
      const name = referredUser[0]?.first_name || 'A friend';
      
      await sendTelegramMessage(referrer_id, 
        `🎉 ${name} subscribed via your link — you got 7 free Pro days!`
      ).catch(() => {});

    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      logger.error({ err, referredId }, 'processConversion error');
    } finally {
      client.release();
    }
  },

  /**
   * Get referral stats for a user.
   */
  async getStats(userId) {
    try {
      const { rows } = await pool.query(
        `SELECT 
           COUNT(*) as total_referrals,
           COUNT(*) FILTER (WHERE converted = true) as converted_referrals
         FROM referrals WHERE referrer_id = $1`,
        [userId]
      );
      
      const stats = rows[0];
      return {
        total: parseInt(stats.total_referrals || 0),
        converted: parseInt(stats.converted_referrals || 0),
        rewardDays: parseInt(stats.converted_referrals || 0) * 7
      };
    } catch (err) {
      logger.error({ err, userId }, 'getReferralStats error');
      return { total: 0, converted: 0, rewardDays: 0 };
    }
  }
};
