import pool from '../config/database.js';
import logger from '../config/logger.js';

export const metricsService = {
  /**
   * Log an event to the analytics_events table.
   */
  async trackEvent(userId, eventType, properties = {}, latencyMs = null) {
    try {
      await pool.query(
        `INSERT INTO analytics_events (user_id, event_type, properties, latency_ms)
         VALUES ($1, $2, $3, $4)`,
        [userId, eventType, JSON.stringify(properties), latencyMs]
      );
    } catch (err) {
      logger.error({ err, userId, eventType }, 'Failed to track event');
    }
  },

  /**
   * Get comprehensive system metrics for the admin panel.
   */
  async getSystemOverview() {
    try {
      // 1. Basic Stats
      const stats = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM questions) as total_questions,
          (SELECT COUNT(*) FROM user_subscriptions WHERE status = 'active') as active_subscribers
      `);

      // 2. Active Users (DAU, WAU, MAU)
      const activeUsers = await pool.query(`
        SELECT 
          COUNT(DISTINCT user_id) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as dau,
          COUNT(DISTINCT user_id) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as wau,
          COUNT(DISTINCT user_id) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as mau
        FROM analytics_events
      `);

      // 3. Monthly Revenue (Estimated from active subscriptions)
      // Note: In a real app, this would query a 'payments' table.
      const revenue = await pool.query(`
        SELECT SUM(sp.price_monthly) as monthly_revenue
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.status = 'active' AND us.created_at > date_trunc('month', NOW())
      `);

      // 4. AI Usage this month
      const aiUsage = await pool.query(`
        SELECT COUNT(*) as count
        FROM analytics_events
        WHERE event_type IN ('ai_generation', 'ai_explanation_requested')
          AND created_at > date_trunc('month', NOW())
      `);

      // 5. Top 5 "Unknown" Questions (Most failed/skipped)
      const topFailed = await pool.query(`
        SELECT q.question_text, COUNT(*) as fail_count
        FROM user_progress up
        JOIN questions q ON up.question_id = q.id
        WHERE up.status = 'unknown'
        GROUP BY q.id, q.question_text
        ORDER BY fail_count DESC
        LIMIT 5
      `);

      // 6. AI Job Statuses
      const jobs = await pool.query('SELECT status, COUNT(*) FROM ai_jobs GROUP BY status');

      return {
        overview: {
          totalUsers: parseInt(stats.rows[0].total_users),
          totalQuestions: parseInt(stats.rows[0].total_questions),
          activeSubscribers: parseInt(stats.rows[0].active_subscribers),
          monthlyRevenue: parseFloat(revenue.rows[0].monthly_revenue || 0).toFixed(2),
        },
        activity: {
          dau: parseInt(activeUsers.rows[0].dau || 0),
          wau: parseInt(activeUsers.rows[0].wau || 0),
          mau: parseInt(activeUsers.rows[0].mau || 0),
          aiCallsThisMonth: parseInt(aiUsage.rows[0].count || 0),
        },
        topFailedQuestions: topFailed.rows,
        jobs: jobs.rows.reduce((acc, row) => {
          acc[row.status] = parseInt(row.count);
          return acc;
        }, {}),
      };
    } catch (err) {
      logger.error({ err }, 'Failed to get system metrics');
      throw err;
    }
  }
};
