import pool from '../config/database.js';
import redis from '../config/redis.js';

// ─── Admin: reset a user's rate-limit counters (unblock after quota burn) ──
// Railway Shell:  node src/scripts/reset-quota.mjs <telegram_id> [ai|all]
// Examples:
//   node src/scripts/reset-quota.mjs 123456789 ai    # monthly AI generations
//   node src/scripts/reset-quota.mjs 123456789 all   # every counter

const userId = process.argv[2];
const what = process.argv[3] || 'ai';
if (!userId) {
  console.error('Usage: reset-quota.mjs <telegram_id> [ai|all]');
  process.exit(1);
}

const AI_FIELDS = ['ai_generations_this_month', 'resume_analyses_this_month', 'interview_evals_this_month'];
const ALL_FIELDS = [...AI_FIELDS, 'requests_today', 'code_executions_today', 'sd_evaluations_today', 'ai_explanations_today'];
const fields = what === 'all' ? ALL_FIELDS : AI_FIELDS;

try {
  const sets = fields.map((f) => `${f} = 0`).join(', ');
  const r = await pool.query(
    `UPDATE user_rate_limits SET ${sets}, daily_reset_at = CURRENT_TIMESTAMP, monthly_reset_at = CURRENT_TIMESTAMP
     WHERE user_id = $1`,
    [userId]
  );
  console.log('db rows updated: ' + r.rowCount);
  if (redis) {
    for (const f of fields) {
      await redis.del(`counter:${userId}:${f}`).catch(() => {});
    }
    await redis.del(`limits:${userId}`).catch(() => {});
    console.log('redis counters cleared');
  } else {
    console.log('redis not connected — DB reset only (Redis counters expire on their own TTL)');
  }
} catch (e) {
  console.error('RESET FAILED: ' + e.message);
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => {});
}
