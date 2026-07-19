import pool from '../config/database.js';

// Schema-drift guard. The authoritative schema is defined incrementally in
// `migrate.js` (run via `npm run setup-db`). `database/schema.sql` is a
// hand-maintained reference copy and can drift. This script compares the
// LIVE database against the authoritative table set and reports any tables
// that are missing or unexpected, so drift is caught in CI / on deploy.
//
// Usage (requires a live DATABASE_URL):
//   node src/scripts/check-schema.js
// Exits non-zero if drift is detected (CI-friendly).

// Tables that MUST exist per migrate.js. Keep in sync with migrate.js
// CREATE TABLE statements.
const EXPECTED_TABLES = [
  'ai_cache',
  'ai_jobs',
  'subscription_plans',
  'user_subscriptions',
  'user_rate_limits',
  'analytics_events',
  'schema_migrations',
  'user_preferences',
  'referrals',
  'question_mastery',
  'question_reports',
  'pending_ton_invoices',
  'saved_questions',
  'users',
  'questions',
  'user_progress',
];

async function check() {
  const drift = [];
  try {
    const { rows } = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const actual = new Set(rows.map((r) => r.table_name));

    const missing = EXPECTED_TABLES.filter((t) => !actual.has(t));
    const unexpected = [...actual].filter((t) => !EXPECTED_TABLES.includes(t));

    console.log('Expected tables present:', EXPECTED_TABLES.filter((t) => actual.has(t)).length, '/', EXPECTED_TABLES.length);
    if (missing.length) {
      console.error('❌ MISSING tables:', missing);
      drift.push(...missing.map((t) => `missing:${t}`));
    }
    if (unexpected.length) {
      console.warn('⚠️  Unexpected (not in authoritative list):', unexpected);
    }

    // Spot-check a few critical columns so column-level drift is caught too.
    const colCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'resume_text'
    `);
    if (colCheck.rows.length === 0) {
      console.error('❌ users.resume_text column missing (expected by /api/user/analyze-resume)');
      drift.push('users.resume_text');
    }

    if (drift.length) {
      console.error(`\nSchema drift detected (${drift.length} issue(s)). Run \`npm run setup-db\` and re-check.`);
      process.exitCode = 1;
    } else {
      console.log('\n✅ Schema matches the authoritative table set.');
    }
  } catch (e) {
    console.error('Failed to check schema:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

check();
