import pool from '../config/database.js';
import { sendTelegramMessage } from './billing/starsService.js';
import logger from '../config/logger.js';

// ─── Reward config (env-overridable) ──────────────────────────────────
// Two-sided model: both people get Pro the moment the friend signs up, and
// the referrer gets an extra bonus if that friend later pays.
const REFEREE_SIGNUP_DAYS = parseInt(process.env.REFERRAL_REFEREE_DAYS ?? '7', 10);
const REFERRER_SIGNUP_DAYS = parseInt(process.env.REFERRAL_REFERRER_DAYS ?? '7', 10);
const REFERRER_CONVERSION_DAYS = parseInt(process.env.REFERRAL_CONVERSION_DAYS ?? '7', 10);

/**
 * Grant N days of Pro to a user (idempotent, additive). Creates the
 * subscription row if the user has none — the previous implementation only
 * ran UPDATE ... WHERE status='active', which silently no-op'd for free users
 * who never had a subscription row, so rewards were effectively lost.
 */
async function grantProDays(client, userId, days) {
  if (!days || days <= 0) return;
  await client.query(
    `INSERT INTO user_subscriptions (user_id, plan_id, status, started_at, expires_at)
     VALUES ($1, 'pro', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ($2 || ' days')::interval)
     ON CONFLICT (user_id, plan_id, status) DO UPDATE SET
       expires_at = GREATEST(user_subscriptions.expires_at, CURRENT_TIMESTAMP) + ($2 || ' days')::interval,
       status = 'active'`,
    [userId, String(days)]
  );
  await client.query(
    `UPDATE users
     SET subscription_expires_at = GREATEST(COALESCE(subscription_expires_at, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP) + ($2 || ' days')::interval,
         subscription_plan = CASE WHEN subscription_plan = 'free' OR subscription_plan IS NULL THEN 'pro' ELSE subscription_plan END
     WHERE telegram_id = $1`,
    [userId, String(days)]
  );
}

export const referralService = {
  grantProDays,

  /**
   * Track a referral when a new user joins, and grant the two-sided signup
   * reward: both the referrer and the new user get Pro immediately.
   * Called during /auth/login (only for genuinely new users).
   */
  async trackReferral(referrerId, referredId) {
    if (String(referrerId) === String(referredId)) return;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Only reward on the first insert for this referred user. The FK on
      // referrer_id guarantees the referrer actually exists — a bad ?ref=
      // throws here and we roll back without granting anything.
      const { rows } = await client.query(
        `INSERT INTO referrals (referrer_id, referred_id)
         VALUES ($1, $2)
         ON CONFLICT (referred_id) DO NOTHING
         RETURNING id`,
        [referrerId, referredId]
      );

      if (rows.length === 0) {
        await client.query('COMMIT');
        return; // already referred — no double reward
      }

      const referralId = rows[0].id;

      // Two-sided instant reward.
      await grantProDays(client, referredId, REFEREE_SIGNUP_DAYS);
      await grantProDays(client, referrerId, REFERRER_SIGNUP_DAYS);
      await client.query(
        `UPDATE referrals SET signup_reward_granted = true WHERE id = $1`,
        [referralId]
      );

      await client.query('COMMIT');
      logger.info({ referrerId, referredId }, '🤝 Referral tracked + two-sided reward granted');

      // Notify both sides (best-effort; only real Telegram ids receive it).
      const { rows: names } = await pool.query(
        'SELECT telegram_id, first_name FROM users WHERE telegram_id = ANY($1)',
        [[referrerId, referredId]]
      );
      const nameOf = (id) => names.find((n) => String(n.telegram_id) === String(id))?.first_name || 'A friend';

      sendTelegramMessage(
        referrerId,
        `🎉 ${nameOf(referredId)} joined via your link — you both got ${REFERRER_SIGNUP_DAYS} days of Pro!`
      ).catch((err) => logger.warn({ err }, 'Referrer signup notify failed'));
      sendTelegramMessage(
        referredId,
        `🎁 Welcome! You've got ${REFEREE_SIGNUP_DAYS} days of Pro free — every mode unlocked.`
      ).catch((err) => logger.warn({ err }, 'Referee signup notify failed'));
    } catch (err) {
      await client.query('ROLLBACK').catch((e) => logger.error({ e }, 'ROLLBACK failed after trackReferral error'));
      logger.error({ err, referrerId, referredId }, 'trackReferral error');
    } finally {
      client.release();
    }
  },

  /**
   * Mark referral as converted and grant the on-payment bonus to the referrer.
   * Called when a referred user completes their first payment.
   */
  async processConversion(referredId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

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

      await client.query(
        `UPDATE referrals SET converted = true, reward_granted = true WHERE id = $1`,
        [referralId]
      );

      await grantProDays(client, referrer_id, REFERRER_CONVERSION_DAYS);

      await client.query('COMMIT');
      logger.info({ referrer_id, referredId }, '🎁 Referral conversion reward granted');

      const { rows: referredUser } = await pool.query('SELECT first_name FROM users WHERE telegram_id = $1', [referredId]);
      const name = referredUser[0]?.first_name || 'A friend';

      await sendTelegramMessage(referrer_id,
        `🎉 ${name} subscribed via your link — you got ${REFERRER_CONVERSION_DAYS} more free Pro days!`
      ).catch(err => logger.error({ err }, 'Referral conversion notify failed'));
    } catch (err) {
      await client.query('ROLLBACK').catch(e => logger.error({ e }, 'ROLLBACK failed after referral error'));
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
      const total = parseInt(stats.total_referrals || 0);
      const converted = parseInt(stats.converted_referrals || 0);
      return {
        total,
        converted,
        // Signup reward for every friend + conversion bonus for those who paid.
        rewardDays: total * REFERRER_SIGNUP_DAYS + converted * REFERRER_CONVERSION_DAYS,
      };
    } catch (err) {
      logger.error({ err, userId }, 'getReferralStats error');
      return { total: 0, converted: 0, rewardDays: 0 };
    }
  }
};
