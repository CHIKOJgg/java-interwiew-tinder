import pool from '../config/database.js';

export const metricsService = {
  async getSystemOverview() {
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
    const totalQuestions = await pool.query('SELECT COUNT(*) FROM questions');
    const totalJobs = await pool.query('SELECT status, COUNT(*) FROM ai_jobs GROUP BY status');
    const cacheHitRate = await pool.query(`
      SELECT 
        (COUNT(*) FILTER (WHERE event_type = 'ai_cache_hit'))::float / 
        NULLIF(COUNT(*) FILTER (WHERE event_type IN ('ai_cache_hit', 'ai_generation')), 0) * 100 as rate
      FROM analytics_events
    `);

    const latencyP95 = await pool.query(`
      SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95
      FROM analytics_events WHERE latency_ms IS NOT NULL
    `);

    return {
      users: parseInt(totalUsers.rows[0].count),
      questions: parseInt(totalQuestions.rows[0].count),
      jobs: totalJobs.rows,
      cacheHitRate: parseFloat(cacheHitRate.rows[0].rate || 0).toFixed(2) + '%',
      p95Latency: Math.round(latencyP95.rows[0].p95 || 0) + 'ms'
    };
  }
};
