import pool from '../config/database.js';

/**
 * Production migration script
 * All schema changes must go through here — no manual SQL.
 * Idempotent: safe to run multiple times.
 */
const migrations = [
  // ── 001: Expand users table ────────────────────────────────────────
  {
    id: '001_expand_users',
    sql: `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20) DEFAULT 'free';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(20) DEFAULT 'Java';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_token_usage INT DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_token_reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_text TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS parsed_resume_data JSONB;
    `
  },

  // ── 002: Expand questions table ────────────────────────────────────
  {
    id: '002_expand_questions',
    sql: `
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS language VARCHAR(20) DEFAULT 'Java';
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS topic VARCHAR(100);
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'Junior';
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS prompt_version VARCHAR(10) DEFAULT 'v1';
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS generated_at TIMESTAMP;
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS options TEXT[];
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS bug_hunting_data JSONB;
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS blitz_data JSONB;
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS code_completion_data JSONB;
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS cached_explanation TEXT;
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS cached_test_options JSONB;
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS cached_bug_hunting_data JSONB;
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS cached_blitz_data JSONB;
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS cached_code_completion_data JSONB;
    `
  },

  // ── 003: AI cache table ────────────────────────────────────────────
  {
    id: '003_ai_cache',
    sql: `
      CREATE TABLE IF NOT EXISTS ai_cache (
        id SERIAL PRIMARY KEY,
        cluster_id VARCHAR(64) NOT NULL,
        mode VARCHAR(50) NOT NULL,
        model VARCHAR(100) NOT NULL,
        prompt_version VARCHAR(10) NOT NULL,
        language VARCHAR(20) DEFAULT 'Java',
        response TEXT NOT NULL,
        token_usage INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
        UNIQUE(cluster_id, mode, model, prompt_version, language)
      );
      CREATE INDEX IF NOT EXISTS idx_ai_cache_lookup 
        ON ai_cache(cluster_id, mode, model, prompt_version, language);
      CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_cache(expires_at);
    `
  },

  // ── 004: AI jobs queue table ───────────────────────────────────────
  {
    id: '004_ai_jobs',
    sql: `
      CREATE TABLE IF NOT EXISTS ai_jobs (
        id SERIAL PRIMARY KEY,
        task_type VARCHAR(50) NOT NULL,
        payload JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        attempts INT DEFAULT 0,
        max_attempts INT DEFAULT 5,
        next_run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(task_type, payload)
      );
      CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_jobs(status, next_run_at);
      CREATE INDEX IF NOT EXISTS idx_ai_jobs_type ON ai_jobs(task_type);
    `
  },

  // ── 005: Subscription plans table ──────────────────────────────────
  {
    id: '005_subscription_plans',
    sql: `
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id VARCHAR(20) PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        price_monthly DECIMAL(10,2) DEFAULT 0,
        requests_per_day INT DEFAULT 50,
        ai_generations_per_month INT DEFAULT 100,
        available_languages TEXT[] DEFAULT '{Java}',
        available_modes TEXT[] DEFAULT '{swipe,test}',
        resume_analysis_limit INT DEFAULT 0,
        interview_eval_limit INT DEFAULT 0,
        model_priority VARCHAR(20) DEFAULT 'fast',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

       INSERT INTO subscription_plans (id, name, price_monthly, requests_per_day, ai_generations_per_month, available_languages, available_modes, resume_analysis_limit, interview_eval_limit, model_priority, stars_monthly, stars_yearly)
       VALUES 
         ('free', 'Free', 0, 50, 100, '{Java}', '{swipe,test}', 0, 0, 'fast', 0, 0),
         ('pro', 'Pro', 9.99, 300, 1000, '{Java,Python}', '{swipe,test,bug-hunting,blitz,code-completion,mock-interview}', 5, 20, 'quality', 450, 3000),
         ('premium', 'Premium', 19.99, 1000, 5000, '{Java,Python,TypeScript}', '{swipe,test,bug-hunting,blitz,code-completion,mock-interview}', 50, 100, 'quality', 900, 5400)
      ON CONFLICT (id) DO NOTHING;
    `
  },

  // ── 006: User subscriptions table ──────────────────────────────────
  {
    id: '006_user_subscriptions',
    sql: `
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        plan_id VARCHAR(20) NOT NULL REFERENCES subscription_plans(id),
        status VARCHAR(20) DEFAULT 'active',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        cancelled_at TIMESTAMP,
        payment_provider VARCHAR(50),
        payment_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, plan_id, status)
      );
      CREATE INDEX IF NOT EXISTS idx_user_subs_user ON user_subscriptions(user_id, status);
    `
  },

  // ── 007: Rate limits table (persistent) ────────────────────────────
  {
    id: '007_rate_limits',
    sql: `
      CREATE TABLE IF NOT EXISTS user_rate_limits (
        user_id BIGINT PRIMARY KEY REFERENCES users(telegram_id) ON DELETE CASCADE,
        requests_today INT DEFAULT 0,
        ai_generations_this_month INT DEFAULT 0,
        resume_analyses_this_month INT DEFAULT 0,
        interview_evals_this_month INT DEFAULT 0,
        last_request_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        daily_reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        monthly_reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `
  },

  // ── 008: Analytics events table ────────────────────────────────────
  {
    id: '008_analytics_events',
    sql: `
      CREATE TABLE IF NOT EXISTS analytics_events (
        id SERIAL PRIMARY KEY,
        user_id BIGINT,
        event_type VARCHAR(50) NOT NULL,
        endpoint VARCHAR(100),
        latency_ms INT,
        model VARCHAR(100),
        cache_hit BOOLEAN DEFAULT false,
        token_usage INT,
        fallback_used BOOLEAN DEFAULT false,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type, created_at);
    `
  },

  // ── 009: Required indexes ──────────────────────────────────────────
  {
    id: '009_indexes',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_questions_lang_cat ON questions(language, category);
      CREATE INDEX IF NOT EXISTS idx_questions_cat_diff ON questions(category, difficulty);
      CREATE INDEX IF NOT EXISTS idx_user_progress_uid_qid ON user_progress(user_id, question_id);
      CREATE INDEX IF NOT EXISTS idx_user_progress_uid_status ON user_progress(user_id, status);
      
      -- Add unique constraint for idempotent seeding
      ALTER TABLE questions ADD CONSTRAINT unique_question_lang UNIQUE (question_text, language);
    `
  },

  // ── 010: Migration tracking table ──────────────────────────────────
  {
    id: '010_migration_tracking',
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(100) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `
  },

  // ── 011: User preferences expand ──────────────────────────────────
  {
    id: '011_user_preferences_expand',
    sql: `
      CREATE TABLE IF NOT EXISTS user_preferences (
        telegram_id BIGINT PRIMARY KEY,
        selected_categories TEXT[],
        selected_language VARCHAR(20) DEFAULT 'Java',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS selected_language VARCHAR(20) DEFAULT 'Java';
    `
  },

  // ── 012: Unique constraint for questions ───────────────────────────
  {
    id: '012_unique_questions',
    sql: `
      DELETE FROM questions q1 USING questions q2 
      WHERE q1.id > q2.id 
      AND q1.question_text = q2.question_text 
      AND q1.language = q2.language;
      
      ALTER TABLE questions DROP CONSTRAINT IF EXISTS unique_question_lang;
      ALTER TABLE questions ADD CONSTRAINT unique_question_lang UNIQUE (question_text, language);
    `
  },

  // ── 013: User subscription columns ─────────────────────────────────
  {
    id: '013_user_subscription_cols',
    sql: `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20) DEFAULT 'free' REFERENCES subscription_plans(id);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;
      CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_plan);
    `
  },

  // ── 014: Events table enhancement ──────────────────────────────────
  {
    id: '014_analytics_enhancement',
    sql: `
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS properties JSONB;
      -- Ensure event_type is our primary filter column
      CREATE INDEX IF NOT EXISTS idx_analytics_type_date ON analytics_events(event_type, created_at);
    `
  },

  // ── 015: User streaks ─────────────────────────────────────────────
  {
    id: '015_user_streaks',
    sql: `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_date DATE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS longest_streak INT DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_users_streak_activity ON users(last_activity_date);
    `
  },

  // ── 016: Referral System ──────────────────────────────────────────
  {
    id: '016_referral_system',
    sql: `
      CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        referrer_id BIGINT REFERENCES users(telegram_id),
        referred_id BIGINT REFERENCES users(telegram_id) UNIQUE,
        converted BOOLEAN DEFAULT FALSE,
        reward_granted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
    `
  },

  // ── 017: Question mastery (SM-2 spaced repetition) ────────────────
  // Columns MUST match services/questionService.js (ease_factor, interval_days,
  // repetitions, next_review). Do not use the legacy mastery_level schema.
  {
    id: '017_question_mastery',
    sql: `
      CREATE TABLE IF NOT EXISTS question_mastery (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        ease_factor DOUBLE PRECISION DEFAULT 2.5,
        interval_days INTEGER DEFAULT 0,
        repetitions INTEGER DEFAULT 0,
        next_review TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, question_id)
      );
      CREATE INDEX IF NOT EXISTS idx_question_mastery_user ON question_mastery(user_id, next_review);
    `
  },

  // ── 018: Question reports / moderation queue ──────────────────────
  {
    id: '018_question_reports',
    sql: `
      CREATE TABLE IF NOT EXISTS question_reports (
        id SERIAL PRIMARY KEY,
        question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        user_id BIGINT REFERENCES users(telegram_id) ON DELETE SET NULL,
        reason VARCHAR(50) NOT NULL,
        comment TEXT,
        resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_question_reports_unresolved
        ON question_reports(question_id, resolved);
    `
  },

  // ── 019: Pending TON invoices ─────────────────────────────────────
  // Columns MUST match services/billing/tonService.js (invoice_id, interval,
  // fulfilled, tx_hash). Do not use the legacy id/wallet_address/status schema.
  {
    id: '019_pending_ton_invoices',
    sql: `
      CREATE TABLE IF NOT EXISTS pending_ton_invoices (
        invoice_id VARCHAR(255) PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        plan_id VARCHAR(50) NOT NULL,
        interval VARCHAR(20),
        amount_ton DECIMAL(10,4),
        fulfilled BOOLEAN DEFAULT FALSE,
        tx_hash VARCHAR(255),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_ton_tx_hash
        ON pending_ton_invoices(tx_hash) WHERE tx_hash IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_pending_ton_pending
        ON pending_ton_invoices(fulfilled, expires_at);
    `
  },

  // ── 020: Daily AI explanation limit (free tier) ───────────────────
  // Tracks how many AI explanations a free user has generated today so we
  // can enforce a hard (but honest) daily cap and nudge them toward Pro.
  {
    id: '020_daily_ai_explain_limit',
    sql: `
      ALTER TABLE user_rate_limits ADD COLUMN IF NOT EXISTS ai_explanations_today INT DEFAULT 0;
      ALTER TABLE user_rate_limits ADD COLUMN IF NOT EXISTS ai_explain_date DATE;
    `
  },

  // ── 021: Telegram Stars pricing on plans ──────────────────────────
  // Single source of truth for Stars amounts so the invoice, the plans API
  // and the UI all show the same number (no more "$9/mo vs 450 Stars" drift).
  {
    id: '021_plan_stars_pricing',
    sql: `
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS stars_monthly INT DEFAULT 0;
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS stars_yearly INT DEFAULT 0;

      UPDATE subscription_plans SET stars_monthly = 0,    stars_yearly = 0    WHERE id = 'free';
      UPDATE subscription_plans SET stars_monthly = 450,  stars_yearly = 3000 WHERE id = 'pro';
      UPDATE subscription_plans SET stars_monthly = 900,  stars_yearly = 5400 WHERE id = 'premium';
    `
  },

  // ── 022: Saved / bookmarked questions ─────────────────────────────
  // Lets users bookmark questions to review later (requested feature: "can't
  // save questions I want to come back to").
  {
    id: '022_saved_questions',
    sql: `
      CREATE TABLE IF NOT EXISTS saved_questions (
        user_id    BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        question_id INT   NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, question_id)
      );
      CREATE INDEX IF NOT EXISTS idx_saved_questions_user ON saved_questions(user_id, created_at DESC);
    `
  }
];

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting migrations...\n');

    // Ensure migration tracking table exists first
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(100) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    for (const migration of migrations) {
      // Check if already applied
      const { rows } = await client.query(
        'SELECT id FROM schema_migrations WHERE id = $1',
        [migration.id]
      );

      if (rows.length > 0) {
        console.log(`  ⏭️  ${migration.id} (already applied)`);
        continue;
      }

      try {
        await client.query('BEGIN');
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO schema_migrations (id) VALUES ($1) ON CONFLICT DO NOTHING',
          [migration.id]
        );
        await client.query('COMMIT');
        console.log(`  ✅ ${migration.id}`);
      } catch (err) {
        await client.query('ROLLBACK');
        // Some ALTER TABLE IF NOT EXISTS may fail on older PG, but we continue
        if (err.code === '42701' || err.code === '42P07') {
          // Column/table already exists
          await client.query(
            'INSERT INTO schema_migrations (id) VALUES ($1) ON CONFLICT DO NOTHING',
            [migration.id]
          );
          console.log(`  ⚠️  ${migration.id} (partial — already exists)`);
        } else {
          console.error(`  ❌ ${migration.id}: ${err.message}`);
          throw err;
        }
      }
    }

    console.log('\n🎉 All migrations complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
