import pool, { rbPool } from '../config/database.js';

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
       ALTER TABLE questions ADD COLUMN IF NOT EXISTS options JSONB;
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
        stars_monthly INT DEFAULT 0,
        stars_yearly INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

       INSERT INTO subscription_plans (id, name, price_monthly, requests_per_day, ai_generations_per_month, available_languages, available_modes, resume_analysis_limit, interview_eval_limit, model_priority, stars_monthly, stars_yearly)
       VALUES 
         ('free', 'Free', 0, 40, 45, '{Java,Python,TypeScript}', '{swipe,test}', 1, 3, 'standard', 0, 0),
         ('pro', 'Pro', 9.99, 1000, 1000, '{Java,Python,TypeScript}', '{swipe,test,bug-hunting,blitz,code-completion,mock-interview,concept-linker}', 10, 50, 'quality', 450, 3000)
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
  },

  // ── 023: Web auth providers (Google / Email magic-link) ───────────
  // Telegram remains the primary provider. For web/PWA access we mint a
  // synthetic telegram_id (e.g. g_<google_sub> / e_<sha1(email)>) so the rest
  // of the codebase (which keys everything off telegram_id) keeps working.
  // These columns store the real identity for debugging / dedupe.
  {
    id: '023_web_auth_providers',
    sql: `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'telegram';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS external_id  VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email        VARCHAR(255);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_external_id
        ON users(auth_provider, external_id) WHERE external_id IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
        ON users(email) WHERE email IS NOT NULL;
    `
  },

  // ── 024: Reconcile plans to the canonical 2-plan model ─────────────
  // Kills the pricing/limit drift on existing DBs. Free becomes a tight
  // funnel (protects AI-token cost); Pro is unified to $9.99 / 450 Stars.
  // Legacy 'premium' is retired — but only if nobody still holds it, so we
  // never orphan an active paying subscription.
  {
    id: '024_reconcile_plans',
    sql: `
      UPDATE subscription_plans SET
        name = 'Free', price_monthly = 0,
        requests_per_day = 40, ai_generations_per_month = 45,
        available_languages = '{Java,Python,TypeScript}',
        available_modes = '{swipe,test}',
        resume_analysis_limit = 1, interview_eval_limit = 3,
        model_priority = 'standard', stars_monthly = 0, stars_yearly = 0
      WHERE id = 'free';

      UPDATE subscription_plans SET
        name = 'Pro', price_monthly = 9.99,
        requests_per_day = 1000, ai_generations_per_month = 1000,
        available_languages = '{Java,Python,TypeScript}',
        available_modes = '{swipe,test,bug-hunting,blitz,code-completion,mock-interview,concept-linker}',
        resume_analysis_limit = 10, interview_eval_limit = 50,
        model_priority = 'quality', stars_monthly = 450, stars_yearly = 3000
      WHERE id = 'pro';

      DELETE FROM subscription_plans
      WHERE id = 'premium'
        AND NOT EXISTS (
          SELECT 1 FROM user_subscriptions
          WHERE plan_id = 'premium' AND status = 'active'
        );
    `
  },

  // ── 025: Two-sided referral (signup reward) ───────────────────────
  // Track whether the instant, both-sides Pro reward has been granted for a
  // referral, so signup rewards stay idempotent (separate from the existing
  // `reward_granted`, which covers the on-payment referrer bonus).
  {
    id: '025_referral_signup_reward',
    sql: `
      ALTER TABLE referrals ADD COLUMN IF NOT EXISTS signup_reward_granted BOOLEAN DEFAULT FALSE;
    `
  },

  // ── 026: Waitlist / lead capture (Belarus data-protection compliant) ──
  // Stores explicit marketing-consent leads. PII is minimized: only the email
  // is kept in clear text; the visitor IP is hashed (never stored raw), and
  // unsubscribe performs *erasure* (pseudonymizes the email + nulls PII) to
  // honor the subject's right to withdraw consent under the Law of the
  // Republic of Belarus "On Information, Informatization and Protection of
  // Information" (Закон РБ «Об информации, информатизации и защите информации»).
  {
    id: '026_waitlist',
    sql: `
      CREATE TABLE IF NOT EXISTS waitlist (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        lang VARCHAR(10) DEFAULT 'ru',
        source VARCHAR(50),
        consent_granted BOOLEAN NOT NULL DEFAULT TRUE,
        consent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        consent_text TEXT,
        ip_hash VARCHAR(64),
        user_agent TEXT,
        unsubscribed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (email)
      );
      CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
      CREATE INDEX IF NOT EXISTS idx_waitlist_created ON waitlist(created_at);
    `
  },

  // ── 027: RB data-localization support + capture B2B fields ──
  // - likely_rb / region let us identify and later segregate (or block) PII of
  //   Republic of Belarus residents, who must be stored on RB-located servers.
  // - telegram / interest were sent by the B2B form but never persisted; add them.
  {
    id: '027_waitlist_rb_gate',
    sql: `
      ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS region VARCHAR(8);
      ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS likely_rb BOOLEAN DEFAULT FALSE;
      ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS telegram TEXT;
      ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS interest VARCHAR(30);
      CREATE INDEX IF NOT EXISTS idx_waitlist_likely_rb ON waitlist(likely_rb);
    `
  },

  // ── 028: Company tags for questions ──────────────────────────────
  {
    id: '028_company_tags',
    sql: `
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS companies TEXT[] DEFAULT '{}';
      CREATE INDEX IF NOT EXISTS idx_questions_companies ON questions USING GIN(companies);
    `
  },

  // ── 029: Learning Tracks ────────────────────────────────────────
  {
    id: '029_learning_tracks',
    sql: `
      CREATE TABLE IF NOT EXISTS learning_tracks (
        id SERIAL PRIMARY KEY,
        language VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        level VARCHAR(50) DEFAULT 'Junior',
        icon VARCHAR(50),
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS track_steps (
        id SERIAL PRIMARY KEY,
        track_id INT REFERENCES learning_tracks(id) ON DELETE CASCADE,
        question_id INT REFERENCES questions(id) ON DELETE CASCADE,
        step_order INT NOT NULL,
        UNIQUE(track_id, question_id),
        UNIQUE(track_id, step_order)
      );
      CREATE TABLE IF NOT EXISTS user_track_progress (
        user_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
        track_id INT REFERENCES learning_tracks(id) ON DELETE CASCADE,
        current_step INT DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE,
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        PRIMARY KEY(user_id, track_id)
      );
    `
  },

  // ── 030: Weekly Challenges ──────────────────────────────────────
  {
    id: '030_weekly_challenges',
    sql: `
      CREATE TABLE IF NOT EXISTS weekly_challenges (
        id SERIAL PRIMARY KEY,
        language VARCHAR(50) NOT NULL,
        theme VARCHAR(255),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS challenge_results (
        id SERIAL PRIMARY KEY,
        challenge_id INT REFERENCES weekly_challenges(id) ON DELETE CASCADE,
        user_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
        score INT DEFAULT 0,
        questions_answered INT DEFAULT 0,
        accuracy DECIMAL(5,2) DEFAULT 0,
        completed_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(challenge_id, user_id)
      );
    `
  },

  // ── 031: Rate limits for code execution ─────────────────────────
  {
    id: '031_code_exec_rate_limit',
    sql: `
      ALTER TABLE user_rate_limits ADD COLUMN IF NOT EXISTS code_executions_today INT DEFAULT 0;
    `
  },

  // ── 032: Certificates ──────────────────────────────────────────
  {
    id: '032_certificates',
    sql: `
      CREATE TABLE IF NOT EXISTS certificates (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
        track_id INT REFERENCES learning_tracks(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        score DECIMAL(5,2),
        issued_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, track_id)
      );
    `
  },

  // ── 033: Company list for filter ────────────────────────────────
  {
    id: '033_company_list',
    sql: `
      CREATE TABLE IF NOT EXISTS company_list (
        name VARCHAR(100) PRIMARY KEY,
        icon VARCHAR(50),
        sort_order INT DEFAULT 0
      );
      INSERT INTO company_list (name, icon, sort_order) VALUES
        ('Google', 'google', 1),
        ('Amazon', 'amazon', 2),
        ('Meta', 'meta', 3),
        ('Microsoft', 'microsoft', 4),
        ('Apple', 'apple', 5),
        ('Netflix', 'netflix', 6),
        ('Tinkoff', 'tinkoff', 7),
        ('Yandex', 'yandex', 8),
        ('Sber', 'sber', 9),
        ('Ozon', 'ozon', 10),
        ('Wildberries', 'wildberries', 11)
      ON CONFLICT DO NOTHING;
      ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS selected_company VARCHAR(100);
    `
  },

  // ── 034: System Design module ──────────────────────────────────────
  {
    id: '035_question_discussions',
    sql: `
      CREATE TABLE IF NOT EXISTS question_discussions (
        id SERIAL PRIMARY KEY,
        question_id INT REFERENCES questions(id) ON DELETE CASCADE,
        user_id BIGINT REFERENCES users(telegram_id),
        parent_id INT REFERENCES question_discussions(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        code_snippet TEXT,
        upvotes INT DEFAULT 0,
        is_solution BOOLEAN DEFAULT false,
        is_hidden BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS discussion_votes (
        user_id BIGINT REFERENCES users(telegram_id),
        discussion_id INT REFERENCES question_discussions(id) ON DELETE CASCADE,
        vote SMALLINT CHECK (vote IN (-1, 1)),
        PRIMARY KEY (user_id, discussion_id)
      );

      CREATE INDEX IF NOT EXISTS idx_discussions_question ON question_discussions(question_id);
      CREATE INDEX IF NOT EXISTS idx_discussions_parent ON question_discussions(parent_id);
    `
  },
  {
    id: '034_system_design',
    sql: `
      CREATE TABLE IF NOT EXISTS system_design_topics (
        id SERIAL PRIMARY KEY,
        language VARCHAR(20) NOT NULL,
        topic VARCHAR(100) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        difficulty VARCHAR(20) DEFAULT 'middle',
        requirements TEXT[],
        constraints TEXT[],
        expected_components TEXT[],
        evaluation_criteria JSONB,
        estimated_readiness_hours DECIMAL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS system_design_progress (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(telegram_id),
        topic_id INT REFERENCES system_design_topics(id),
        status VARCHAR(20) DEFAULT 'not_started',
        score INT,
        strengths TEXT[],
        weaknesses TEXT[],
        components_mentioned TEXT[],
        architecture_json JSONB,
        attempt_count INT DEFAULT 0,
        last_attempt_at TIMESTAMP,
        UNIQUE(user_id, topic_id)
      );

      ALTER TABLE user_rate_limits ADD COLUMN IF NOT EXISTS sd_evaluations_today INT DEFAULT 0;
      ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS sd_evaluation_limit INT DEFAULT 0;
      UPDATE subscription_plans SET sd_evaluation_limit = 1 WHERE id = 'free';
      UPDATE subscription_plans SET sd_evaluation_limit = 100 WHERE id = 'pro';
      UPDATE subscription_plans SET available_modes = ARRAY['swipe','test','system-design'] WHERE id = 'free';
      UPDATE subscription_plans SET available_modes = ARRAY['swipe','test','bug-hunting','blitz','code-completion','mock-interview','concept-linker','system-design'] WHERE id = 'pro';

      INSERT INTO system_design_topics (language, topic, title, description, difficulty, requirements, constraints, expected_components) VALUES
        ('Java', 'design-tinyurl', 'Design TinyURL', 'Design a URL shortening service like TinyURL.', 'Junior', ARRAY['Generate short unique URLs', 'Redirect short URL to original', 'Track click analytics'], ARRAY['10M new URLs/month', '100M redirects/day', 'Low latency (<10ms redirect)'], ARRAY['Load Balancer', 'Web Server', 'Database', 'Cache']),
        ('Java', 'design-chat', 'Design WhatsApp / Messenger', 'Design a real-time messaging system.', 'Middle', ARRAY['Send/receive messages in real-time', 'Support group chats', 'Message delivery status', 'Media sharing'], ARRAY['1B users', '100M messages/day', '<100ms delivery latency', 'Exactly-once delivery'], ARRAY['WebSocket Server', 'Message Queue', 'Database', 'Cache', 'CDN for media']),
        ('Java', 'design-newsfeed', 'Design Facebook / Instagram Feed', 'Design a social media newsfeed.', 'Middle', ARRAY['Generate personalized feed', 'Support posts, photos, videos', 'Like/comment/share', 'Real-time updates'], ARRAY['500M DAU', 'Feed loads in <500ms', 'Support 100M posts/day'], ARRAY['Load Balancer', 'Feed Generator Service', 'Database (SQL + NoSQL)', 'Cache (Redis)', 'CDN', 'Message Queue']),
        ('Java', 'design-uber', 'Design Uber / Rider App', 'Design a ride-hailing service.', 'Senior', ARRAY['Match riders with drivers', 'Real-time location tracking', 'ETA calculation', 'Surge pricing', 'Payment processing'], ARRAY['100M users', '10M rides/day', '<1s matching latency', '99.99% uptime'], ARRAY['Load Balancer', 'Location Service (Redis Geo)', 'Matching Engine', 'Database', 'Message Queue', 'Push Notifications']),
        ('Java', 'design-netflix', 'Design Netflix / YouTube', 'Design a video streaming platform.', 'Senior', ARRAY['Upload and process videos', 'Stream video with adaptive bitrate', 'Recommendation system', 'Search'], ARRAY['200M subscribers', '1B hours watched/day', '<5s startup latency', 'Support 4K streaming'], ARRAY['CDN', 'Transcoding Pipeline', 'Video Storage (S3)', 'Metadata DB', 'Recommendation Engine', 'Search Service']),
        ('Java', 'design-ecommerce', 'Design Amazon / E-commerce', 'Design a large-scale e-commerce platform.', 'Middle', ARRAY['Product catalog with search', 'Shopping cart', 'Order management', 'Payment processing', 'Inventory management'], ARRAY['200M products', '1M orders/day', '<200ms page load', 'Support flash sales (100K req/s)'], ARRAY['Load Balancer', 'Search Service', 'Database (sharded)', 'Cache', 'Order Service', 'Payment Service', 'Inventory Service']),
        ('Java', 'design-rate-limiter', 'Design Rate Limiter', 'Design a distributed rate limiter.', 'Middle', ARRAY['Rate limit API requests per user/IP', 'Support multiple rate limit rules', 'Low latency decision making'], ARRAY['100K req/s', '<1ms overhead per request', 'Distributed across data centers'], ARRAY['Redis Cluster', 'Rate Limit Service', 'Cache']),
        ('Java', 'design-web-crawler', 'Design Web Crawler', 'Design a web crawler for a search engine.', 'Middle', ARRAY['Crawl billions of web pages', 'Detect duplicate content', 'Respect robots.txt', 'Support recrawling'], ARRAY['10B pages', '200 pages/sec crawl rate', 'Storage >100PB'], ARRAY['URL Frontier', 'Downloader', 'Parser', 'Deduplication (Bloom Filter)', 'Storage (S3/HDFS)']),
        ('Java', 'design-pastebin', 'Design Pastebin / Code Share', 'Design a pastebin service.', 'Junior', ARRAY['Store text/code snippets', 'Generate unique URLs', 'Optional expiration', 'Syntax highlighting'], ARRAY['10M pastes/month', 'Read-heavy (90/10 R/W)', 'Store pastes up to 10MB'], ARRAY['Load Balancer', 'Web Server', 'Database', 'Cache', 'Object Storage']),
        ('Java', 'design-parking-lot', 'Design Parking Lot (OOD)', 'Design a parking lot system (OOP approach).', 'Junior', ARRAY['Multiple floors', 'Multiple vehicle types', 'Track available spots', 'Ticket/payment system'], ARRAY['Support 10 floors, 100 spots each', 'Handle cars, bikes, trucks', 'Real-time availability'], ARRAY['ParkingLot (Singleton)', 'Floor', 'Spot', 'Ticket', 'PaymentProcessor']),
        ('Java', 'design-twitter-search', 'Design Twitter Search', 'Design a real-time search service like Twitter search.', 'Senior', ARRAY['Index tweets in real-time', 'Full-text search', 'Trending topics', 'Filter by date/user'], ARRAY['500M tweets/day', 'Search latency <100ms', 'Support 100K QPS'], ARRAY['Inverted Index (Elasticsearch)', 'Distributed Search Cluster', 'Disaster Recovery']),
        ('Java', 'design-yelp', 'Design Yelp / Nearby Places', 'Design a location-based business review service.', 'Middle', ARRAY['Search nearby businesses', 'View reviews and ratings', 'Add reviews', 'Filter by category'], ARRAY['100M businesses', '10M daily queries', 'Location search latency <50ms'], ARRAY['Location Service (GeoHash)', 'Database', 'Review Service', 'Cache']),
        ('Java', 'design-dropbox', 'Design Dropbox / Google Drive', 'Design a cloud file storage and sync service.', 'Senior', ARRAY['Upload/download files', 'File synchronization across devices', 'File versioning', 'Share files with permissions'], ARRAY['500M users', '100PB storage', 'Sync latency <30s', 'Deduplication for efficiency'], ARRAY['Load Balancer', 'Block Server', 'Metadata DB', 'Object Storage', 'Sync Service', 'Notification Service']),
        ('Java', 'design-notification', 'Design Notification System', 'Design a scalable push notification system.', 'Middle', ARRAY['Send push notifications', 'Support iOS/Android/Web', 'Preference management', 'Rate limiting'], ARRAY['10M notifications/day', '<1s delivery latency', 'Support scheduled notifications'], ARRAY['Message Queue', 'Notification Worker Pool', 'Apple/Google/FCM Connector', 'User Preference DB']),
        ('Java', 'design-key-value', 'Design Distributed Key-Value Store', 'Design a distributed key-value store like Redis or Cassandra.', 'Senior', ARRAY['Get/put key-value pairs', 'Support replication', 'Fault tolerance', 'Consistency levels'], ARRAY['1M QPS', 'Store 100TB data', '99.999% availability', 'Eventual consistency acceptable'], ARRAY['Partition Layer (Consistent Hashing)', 'Replication Manager', 'Storage Engine', 'Consistency Coordinator'])
      ON CONFLICT DO NOTHING;
    `
  },

  // ── 036: Add is_active column to questions ──────────────────────────
  {
    id: '036_add_is_active_column',
    sql: `
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      UPDATE questions SET is_active = TRUE WHERE is_active IS NULL;
    `
  },

  // ── 037: Seed learning tracks for Java (original — may have failed) ─
  {
    id: '037_seed_learning_tracks',
    sql: `
      -- Placeholder: see 038 for the actual seed
    `
  },

  // ── 038: Seed learning tracks for Java (fixed) ─────────────────────
  {
    id: '038_seed_learning_tracks_v2',
    sql: `
      -- Insert 6 Java tracks (skip if tracks already exist for Java)
      INSERT INTO learning_tracks (language, name, description, level, icon, sort_order, is_active)
      SELECT v.language, v.name, v.description, v.level, v.icon, v.sort_order, TRUE
      FROM (VALUES
        ('Java', 'Java Core Fundamentals', 'Master OOP, exceptions, and core Java concepts', 'Junior', '☕', 1),
        ('Java', 'Multithreading Mastery', 'Thread management, synchronization, and concurrent APIs', 'Middle', '⚡', 2),
        ('Java', 'Collections & Stream API', 'Data structures, algorithms, and functional streaming', 'Junior', '📦', 3),
        ('Java', 'Spring Framework', 'Spring Boot, DI, REST APIs, and enterprise patterns', 'Middle', '🌱', 4),
        ('Java', 'JVM Deep Dive', 'Memory model, GC tuning, classloading, and performance', 'Senior', '🔧', 5),
        ('Java', 'Design Patterns', 'Gang of Four patterns and modern Java approaches', 'Middle', '🏗️', 6)
      ) AS v(language, name, description, level, icon, sort_order)
      WHERE NOT EXISTS (SELECT 1 FROM learning_tracks WHERE language = 'Java');

      -- Track 1: Java Core Fundamentals (OOP + Exceptions + Java Core, 10 steps)
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        (SELECT id FROM questions WHERE language = 'Java' AND category = 'OOP' AND is_active = TRUE ORDER BY id LIMIT 4)
        UNION ALL
        (SELECT id FROM questions WHERE language = 'Java' AND category = 'Exceptions' AND is_active = TRUE ORDER BY id LIMIT 3)
        UNION ALL
        (SELECT id FROM questions WHERE language = 'Java' AND category = 'Java Core' AND is_active = TRUE ORDER BY id LIMIT 3)
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Java Core Fundamentals' AND language = 'Java' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Track 2: Multithreading Mastery (10 steps)
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions
        WHERE language = 'Java' AND category = 'Multithreading' AND is_active = TRUE
        ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Multithreading Mastery' AND language = 'Java' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Track 3: Collections & Stream API (10 steps)
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        (SELECT id FROM questions WHERE language = 'Java' AND category = 'Collections' AND is_active = TRUE ORDER BY id LIMIT 6)
        UNION ALL
        (SELECT id FROM questions WHERE language = 'Java' AND category = 'Stream API' AND is_active = TRUE ORDER BY id LIMIT 4)
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Collections & Stream API' AND language = 'Java' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Track 4: Spring Framework (10 steps)
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions
        WHERE language = 'Java' AND category = 'Spring' AND is_active = TRUE
        ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Spring Framework' AND language = 'Java' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Track 5: JVM Deep Dive (8 steps)
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions
        WHERE language = 'Java' AND category = 'JVM' AND is_active = TRUE
        ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'JVM Deep Dive' AND language = 'Java' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Track 6: Design Patterns (8 steps)
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions
        WHERE language = 'Java' AND category = 'Design Patterns' AND is_active = TRUE
        ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Design Patterns' AND language = 'Java' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);
    `
  },

  // ── 039: Re-seed track_steps (migration 038 ran before questions existed,
  // so track steps are empty). Delete existing steps first, then re-insert.
  {
    id: '039_reseed_track_steps',
    sql: `
      DELETE FROM track_steps WHERE track_id IN (SELECT id FROM learning_tracks WHERE language = 'Java');

      -- Track 1: Java Core Fundamentals
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        (SELECT id FROM questions WHERE language = 'Java' AND category = 'OOP' AND is_active = TRUE ORDER BY id LIMIT 4)
        UNION ALL
        (SELECT id FROM questions WHERE language = 'Java' AND category = 'Exceptions' AND is_active = TRUE ORDER BY id LIMIT 3)
        UNION ALL
        (SELECT id FROM questions WHERE language = 'Java' AND category = 'Java Core' AND is_active = TRUE ORDER BY id LIMIT 3)
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Java Core Fundamentals' AND language = 'Java' LIMIT 1) lt;

      -- Track 2: Multithreading Mastery
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Java' AND category = 'Multithreading' AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Multithreading Mastery' AND language = 'Java' LIMIT 1) lt;

      -- Track 3: Collections & Stream API
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        (SELECT id FROM questions WHERE language = 'Java' AND category = 'Collections' AND is_active = TRUE ORDER BY id LIMIT 6)
        UNION ALL
        (SELECT id FROM questions WHERE language = 'Java' AND category = 'Stream API' AND is_active = TRUE ORDER BY id LIMIT 4)
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Collections & Stream API' AND language = 'Java' LIMIT 1) lt;

      -- Track 4: Spring Framework
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Java' AND category = 'Spring' AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Spring Framework' AND language = 'Java' LIMIT 1) lt;

      -- Track 5: JVM Deep Dive
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Java' AND category = 'JVM' AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'JVM Deep Dive' AND language = 'Java' LIMIT 1) lt;

      -- Track 6: Design Patterns
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Java' AND category = 'Design Patterns' AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Design Patterns' AND language = 'Java' LIMIT 1) lt;
    `
  },

  // ── 040: Seed learning tracks for Python and TypeScript ──
  {
    id: '040_seed_tracks_python_typescript',
    sql: `
      -- Python tracks (skip if tracks already exist for Python)
      INSERT INTO learning_tracks (language, name, description, level, icon, sort_order, is_active)
      SELECT v.language, v.name, v.description, v.level, v.icon, v.sort_order, TRUE
      FROM (VALUES
        ('Python', 'Python Core Fundamentals', 'Master OOP, exceptions, and core Python concepts', 'Junior', '🐍', 1),
        ('Python', 'Python Async & Concurrency', 'AsyncIO, threading, multiprocessing patterns', 'Middle', '⚡', 2),
        ('Python', 'Data Structures & Algorithms', 'Built-in data structures, algorithmic thinking', 'Junior', '📦', 3),
        ('Python', 'FastAPI / Django', 'Web frameworks, REST APIs, and enterprise patterns', 'Middle', '🌐', 4),
        ('Python', 'Python Internals', 'GIL, memory model, CPython, and performance tuning', 'Senior', '🔧', 5),
        ('Python', 'Design Patterns in Python', 'Gang of Four patterns adapted for Pythonic code', 'Middle', '🏗️', 6)
      ) AS v(language, name, description, level, icon, sort_order)
      WHERE NOT EXISTS (SELECT 1 FROM learning_tracks WHERE language = 'Python');

      -- Python Track 1: Core Fundamentals
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Python' AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Python Core Fundamentals' AND language = 'Python' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Python Track 2: Async & Concurrency
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Python' AND (category ILIKE '%async%' OR category ILIKE '%concurr%' OR category ILIKE '%thread%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Python Async & Concurrency' AND language = 'Python' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Python Track 3: Data Structures & Algorithms
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Python' AND (category ILIKE '%data struct%' OR category ILIKE '%algorithm%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Data Structures & Algorithms' AND language = 'Python' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Python Track 4: FastAPI / Django
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Python' AND (category ILIKE '%fastapi%' OR category ILIKE '%django%' OR category ILIKE '%flask%' OR category ILIKE '%web%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'FastAPI / Django' AND language = 'Python' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Python Track 5: Python Internals
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Python' AND (category ILIKE '%intern%' OR category ILIKE '%memory%' OR category ILIKE '%performance%' OR category ILIKE '%optim%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Python Internals' AND language = 'Python' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Python Track 6: Design Patterns
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Python' AND (category ILIKE '%design pattern%' OR category ILIKE '%pattern%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Design Patterns in Python' AND language = 'Python' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- TypeScript tracks (skip if tracks already exist for TypeScript)
      INSERT INTO learning_tracks (language, name, description, level, icon, sort_order, is_active)
      SELECT v.language, v.name, v.description, v.level, v.icon, v.sort_order, TRUE
      FROM (VALUES
        ('TypeScript', 'TypeScript Core Fundamentals', 'Master types, generics, and core TS concepts', 'Junior', '🔷', 1),
        ('TypeScript', 'Advanced TypeScript', 'Conditional types, mapped types, decorators', 'Middle', '⚡', 2),
        ('TypeScript', 'Type-Safe Data Structures', 'Strongly typed collections, arrays, and utilities', 'Junior', '📦', 3),
        ('TypeScript', 'TypeScript + React / Node', 'Full-stack TypeScript with frameworks', 'Middle', '🌐', 4),
        ('TypeScript', 'TypeScript Compiler Deep Dive', 'Type inference, declaration files, and compilation', 'Senior', '🔧', 5),
        ('TypeScript', 'Design Patterns in TypeScript', 'Gang of Four patterns with strict typing', 'Middle', '🏗️', 6)
      ) AS v(language, name, description, level, icon, sort_order)
      WHERE NOT EXISTS (SELECT 1 FROM learning_tracks WHERE language = 'TypeScript');

      -- TypeScript Track 1: Core Fundamentals
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'TypeScript' AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'TypeScript Core Fundamentals' AND language = 'TypeScript' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- TypeScript Track 2: Advanced TypeScript
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'TypeScript' AND (category ILIKE '%advanced%' OR category ILIKE '%generic%' OR category ILIKE '%type%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Advanced TypeScript' AND language = 'TypeScript' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- TypeScript Track 3: Type-Safe Data Structures
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'TypeScript' AND (category ILIKE '%data struct%' OR category ILIKE '%algorithm%' OR category ILIKE '%type%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Type-Safe Data Structures' AND language = 'TypeScript' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- TypeScript Track 4: Full-Stack TypeScript
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'TypeScript' AND (category ILIKE '%react%' OR category ILIKE '%node%' OR category ILIKE '%express%' OR category ILIKE '%next%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'TypeScript + React / Node' AND language = 'TypeScript' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- TypeScript Track 5: Compiler Deep Dive
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'TypeScript' AND (category ILIKE '%compil%' OR category ILIKE '%intern%' OR category ILIKE '%declaration%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'TypeScript Compiler Deep Dive' AND language = 'TypeScript' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- TypeScript Track 6: Design Patterns
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'TypeScript' AND (category ILIKE '%design pattern%' OR category ILIKE '%pattern%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Design Patterns in TypeScript' AND language = 'TypeScript' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);
    `
  },

  // ── 041: Admin plan ────────────────────────────────────────────────
  {
    id: '041_admin_plan',
    sql: `
      INSERT INTO subscription_plans (id, name, price_monthly, requests_per_day, ai_generations_per_month, available_languages, available_modes, resume_analysis_limit, interview_eval_limit, model_priority, stars_monthly, stars_yearly)
      VALUES
        ('admin', 'Admin', 0, 999999, 999999, '{Java,Python,TypeScript}', '{swipe,test,bug-hunting,blitz,code-completion,mock-interview,concept-linker,review,system-design}', 999, 999, 'quality', 0, 0)
      ON CONFLICT (id) DO NOTHING;
    `
  },

  // ── 042: Re-seed track steps for Python and TypeScript ─────────────
  // Migration 040 ran before Python/TypeScript questions existed, so
  // track_steps were never populated. This migration fills them now.
  {
    id: '042_reseed_steps_python_ts',
    sql: `
      -- Python Track 1: Core Fundamentals
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Python' AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Python Core Fundamentals' AND language = 'Python' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Python Track 2: Async & Concurrency
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Python' AND (category ILIKE '%async%' OR category ILIKE '%concurr%' OR category ILIKE '%thread%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Python Async & Concurrency' AND language = 'Python' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Python Track 3: Data Structures & Algorithms
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Python' AND (category ILIKE '%data struct%' OR category ILIKE '%algorithm%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Data Structures & Algorithms' AND language = 'Python' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Python Track 4: FastAPI / Django
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Python' AND (category ILIKE '%fastapi%' OR category ILIKE '%django%' OR category ILIKE '%flask%' OR category ILIKE '%web%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'FastAPI / Django' AND language = 'Python' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Python Track 5: Python Internals
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Python' AND (category ILIKE '%intern%' OR category ILIKE '%memory%' OR category ILIKE '%performance%' OR category ILIKE '%optim%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Python Internals' AND language = 'Python' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Python Track 6: Design Patterns
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Python' AND (category ILIKE '%design pattern%' OR category ILIKE '%pattern%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Design Patterns in Python' AND language = 'Python' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- TypeScript Track 1: Core Fundamentals
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'TypeScript' AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'TypeScript Core Fundamentals' AND language = 'TypeScript' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- TypeScript Track 2: Advanced TypeScript
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'TypeScript' AND (category ILIKE '%advanced%' OR category ILIKE '%generic%' OR category ILIKE '%type%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Advanced TypeScript' AND language = 'TypeScript' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- TypeScript Track 3: Type-Safe Data Structures
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'TypeScript' AND (category ILIKE '%data struct%' OR category ILIKE '%algorithm%' OR category ILIKE '%type%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Type-Safe Data Structures' AND language = 'TypeScript' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- TypeScript Track 4: Full-Stack TypeScript
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'TypeScript' AND (category ILIKE '%react%' OR category ILIKE '%node%' OR category ILIKE '%express%' OR category ILIKE '%next%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'TypeScript + React / Node' AND language = 'TypeScript' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- TypeScript Track 5: Compiler Deep Dive
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'TypeScript' AND (category ILIKE '%compil%' OR category ILIKE '%intern%' OR category ILIKE '%declaration%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'TypeScript Compiler Deep Dive' AND language = 'TypeScript' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- TypeScript Track 6: Design Patterns
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'TypeScript' AND (category ILIKE '%design pattern%' OR category ILIKE '%pattern%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Design Patterns in TypeScript' AND language = 'TypeScript' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);
    `
  },
  // ── 043: Seed learning tracks for Go, Rust, React, Kotlin ──
  {
    id: '043_seed_tracks_go_rust_react_kotlin',
    sql: `
      -- ── Go tracks ──
      INSERT INTO learning_tracks (language, name, description, level, icon, sort_order, is_active)
      SELECT v.language, v.name, v.description, v.level, v.icon, v.sort_order, TRUE
      FROM (VALUES
        ('Go', 'Go Core Fundamentals', 'Syntax, types, interfaces, and error handling', 'Junior', '🐹', 1),
        ('Go', 'Concurrency in Go', 'Goroutines, channels, select, and sync primitives', 'Middle', '⚡', 2),
        ('Go', 'Go Data Structures', 'Slices, maps, and standard library algorithms', 'Junior', '📦', 3),
        ('Go', 'Go Web & APIs', 'net/http, middleware, REST, and microservices', 'Middle', '🌐', 4),
        ('Go', 'Go Runtime Deep Dive', 'Garbage collector, scheduler, and CGo', 'Senior', '🔧', 5),
        ('Go', 'Design Patterns in Go', 'Idiomatic Go patterns and anti-patterns', 'Middle', '🏗️', 6)
      ) AS v(language, name, description, level, icon, sort_order)
      WHERE NOT EXISTS (SELECT 1 FROM learning_tracks WHERE language = 'Go');

      -- Go Track 1: Core Fundamentals
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Go' AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Go Core Fundamentals' AND language = 'Go' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Go Track 2: Concurrency
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Go' AND (category ILIKE '%concurr%' OR category ILIKE '%goroutine%' OR category ILIKE '%channel%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Concurrency in Go' AND language = 'Go' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Go Track 3: Data Structures
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Go' AND (category ILIKE '%data struct%' OR category ILIKE '%slice%' OR category ILIKE '%map%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Go Data Structures' AND language = 'Go' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Go Track 4: Web & APIs
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Go' AND (category ILIKE '%web%' OR category ILIKE '%http%' OR category ILIKE '%api%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Go Web & APIs' AND language = 'Go' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Go Track 5: Runtime Deep Dive
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Go' AND (category ILIKE '%runtime%' OR category ILIKE '%gc%' OR category ILIKE '%memory%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Go Runtime Deep Dive' AND language = 'Go' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Go Track 6: Design Patterns
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Go' AND (category ILIKE '%design pattern%' OR category ILIKE '%pattern%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Design Patterns in Go' AND language = 'Go' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- ── Rust tracks ──
      INSERT INTO learning_tracks (language, name, description, level, icon, sort_order, is_active)
      SELECT v.language, v.name, v.description, v.level, v.icon, v.sort_order, TRUE
      FROM (VALUES
        ('Rust', 'Rust Core Fundamentals', 'Ownership, borrowing, lifetimes, and pattern matching', 'Junior', '🦀', 1),
        ('Rust', 'Rust Ownership & Memory', 'Ownership model, references, smart pointers, and memory safety', 'Middle', '🧠', 2),
        ('Rust', 'Rust Data Structures', 'Vec, HashMap, iterators, and collections', 'Junior', '📦', 3),
        ('Rust', 'Async Rust', 'async/await, Pin, Future, and Tokio runtime', 'Middle', '⚡', 4),
        ('Rust', 'Rust Unsafe & FFI', 'Unsafe blocks, FFI, and low-level Rust', 'Senior', '🔥', 5),
        ('Rust', 'Rust Design Patterns', 'Idiomatic patterns and trait-based design', 'Middle', '🏗️', 6)
      ) AS v(language, name, description, level, icon, sort_order)
      WHERE NOT EXISTS (SELECT 1 FROM learning_tracks WHERE language = 'Rust');

      -- Rust Track 1: Core Fundamentals
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Rust' AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Rust Core Fundamentals' AND language = 'Rust' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Rust Track 2: Ownership & Memory
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Rust' AND (category ILIKE '%ownership%' OR category ILIKE '%borrow%' OR category ILIKE '%lifetime%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Rust Ownership & Memory' AND language = 'Rust' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Rust Track 3: Data Structures
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Rust' AND (category ILIKE '%data struct%' OR category ILIKE '%collection%' OR category ILIKE '%iterator%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Rust Data Structures' AND language = 'Rust' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Rust Track 4: Async Rust
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Rust' AND (category ILIKE '%async%' OR category ILIKE '%await%' OR category ILIKE '%future%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Async Rust' AND language = 'Rust' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Rust Track 5: Unsafe & FFI
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Rust' AND (category ILIKE '%unsafe%' OR category ILIKE '%ffi%' OR category ILIKE '%raw pointer%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Rust Unsafe & FFI' AND language = 'Rust' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Rust Track 6: Design Patterns
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Rust' AND (category ILIKE '%design pattern%' OR category ILIKE '%pattern%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Rust Design Patterns' AND language = 'Rust' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- ── React tracks ──
      INSERT INTO learning_tracks (language, name, description, level, icon, sort_order, is_active)
      SELECT v.language, v.name, v.description, v.level, v.icon, v.sort_order, TRUE
      FROM (VALUES
        ('React', 'React Core Fundamentals', 'Components, JSX, props, state, and lifecycle', 'Junior', '⚛️', 1),
        ('React', 'React Hooks Deep Dive', 'useState, useEffect, useRef, custom hooks, and rules', 'Middle', '🪝', 2),
        ('React', 'React State Management', 'Context, Redux, Zustand, and state patterns', 'Middle', '📊', 3),
        ('React', 'React Performance', 'Memoization, code splitting, lazy loading, and profiling', 'Middle', '⚡', 4),
        ('React', 'React Server Components', 'RSC, streaming, SSR, and Next.js patterns', 'Senior', '🖥️', 5),
        ('React', 'React Design Patterns', 'Compound, render props, HOC, and hooks patterns', 'Middle', '🏗️', 6)
      ) AS v(language, name, description, level, icon, sort_order)
      WHERE NOT EXISTS (SELECT 1 FROM learning_tracks WHERE language = 'React');

      -- React Track 1: Core Fundamentals
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'React' AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'React Core Fundamentals' AND language = 'React' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- React Track 2: Hooks Deep Dive
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'React' AND (category ILIKE '%hook%' OR category ILIKE '%useState%' OR category ILIKE '%useEffect%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'React Hooks Deep Dive' AND language = 'React' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- React Track 3: State Management
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'React' AND (category ILIKE '%state%' OR category ILIKE '%context%' OR category ILIKE '%redux%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'React State Management' AND language = 'React' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- React Track 4: Performance
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'React' AND (category ILIKE '%performance%' OR category ILIKE '%memo%' OR category ILIKE '%lazy%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'React Performance' AND language = 'React' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- React Track 5: Server Components
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'React' AND (category ILIKE '%server%' OR category ILIKE '%ssr%' OR category ILIKE '%next%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'React Server Components' AND language = 'React' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- React Track 6: Design Patterns
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'React' AND (category ILIKE '%design pattern%' OR category ILIKE '%pattern%' OR category ILIKE '%hoc%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'React Design Patterns' AND language = 'React' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- ── Kotlin tracks ──
      INSERT INTO learning_tracks (language, name, description, level, icon, sort_order, is_active)
      SELECT v.language, v.name, v.description, v.level, v.icon, v.sort_order, TRUE
      FROM (VALUES
        ('Kotlin', 'Kotlin Core Fundamentals', 'Null safety, data classes, sealed classes, and scope functions', 'Junior', '🟣', 1),
        ('Kotlin', 'Kotlin Coroutines', 'Structured concurrency, flows, and channels', 'Middle', '⚡', 2),
        ('Kotlin', 'Kotlin Data Structures', 'Collections, sequences, and extension functions', 'Junior', '📦', 3),
        ('Kotlin', 'Kotlin for Android', 'Jetpack Compose, lifecycle, and ViewModel patterns', 'Middle', '🤖', 4),
        ('Kotlin', 'Kotlin Multiplatform', 'KMP, expect/actual, and shared business logic', 'Senior', '🔀', 5),
        ('Kotlin', 'Kotlin Design Patterns', 'Idiomatic Kotlin patterns and DSL builders', 'Middle', '🏗️', 6)
      ) AS v(language, name, description, level, icon, sort_order)
      WHERE NOT EXISTS (SELECT 1 FROM learning_tracks WHERE language = 'Kotlin');

      -- Kotlin Track 1: Core Fundamentals
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Kotlin' AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Kotlin Core Fundamentals' AND language = 'Kotlin' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Kotlin Track 2: Coroutines
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Kotlin' AND (category ILIKE '%coroutine%' OR category ILIKE '%flow%' OR category ILIKE '%concurr%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Kotlin Coroutines' AND language = 'Kotlin' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Kotlin Track 3: Data Structures
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Kotlin' AND (category ILIKE '%collection%' OR category ILIKE '%data struct%' OR category ILIKE '%sequence%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Kotlin Data Structures' AND language = 'Kotlin' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Kotlin Track 4: Kotlin for Android
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Kotlin' AND (category ILIKE '%android%' OR category ILIKE '%compose%' OR category ILIKE '%viewmodel%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Kotlin for Android' AND language = 'Kotlin' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Kotlin Track 5: Multiplatform
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Kotlin' AND (category ILIKE '%multiplatform%' OR category ILIKE '%kmp%' OR category ILIKE '%expect%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Kotlin Multiplatform' AND language = 'Kotlin' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Kotlin Track 6: Design Patterns
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Kotlin' AND (category ILIKE '%design pattern%' OR category ILIKE '%pattern%' OR category ILIKE '%dsl%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Kotlin Design Patterns' AND language = 'Kotlin' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Update subscription plans to include new languages
      UPDATE subscription_plans
      SET available_languages = ARRAY['Java', 'Python', 'TypeScript', 'Go', 'Rust', 'React', 'Kotlin']
      WHERE id IN ('free', 'pro', 'annual_pro');
       `
  },
  {
    id: '044_question_quality_and_json_options',
    sql: `
      ALTER TABLE questions
        ALTER COLUMN options TYPE JSONB
        USING CASE WHEN options IS NULL THEN NULL ELSE to_jsonb(options) END;
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS test_ready BOOLEAN DEFAULT FALSE;
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS quality_flags JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE user_submitted_questions
        ALTER COLUMN options TYPE JSONB
        USING CASE WHEN options IS NULL THEN NULL ELSE to_jsonb(options) END;
      CREATE INDEX IF NOT EXISTS idx_questions_feed_language_active
        ON questions(language, is_active, category);
      CREATE INDEX IF NOT EXISTS idx_questions_test_ready
        ON questions(language, test_ready) WHERE is_active = TRUE;
    `
  },
  {
    id: '045_me_profile_fields',
    sql: `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
    `
  },
  {
    id: '046_pro_max_plan',
    sql: `
      INSERT INTO subscription_plans
        (id, name, price_monthly, requests_per_day, ai_generations_per_month,
         available_languages, available_modes, resume_analysis_limit,
         interview_eval_limit, model_priority, stars_monthly, stars_yearly)
      VALUES
        ('pro_max', 'Pro Max', 50, 100000, 100000,
         '{Java,Python,TypeScript,Go,Rust,React,Kotlin}',
         '{swipe,test,bug-hunting,blitz,code-completion,mock-interview,concept-linker,system-design,review,peer-interview}',
         100, 1000, 'quality', 2400, 21600)
      ON CONFLICT (id) DO NOTHING;
    `
  },
  {
    id: '047_sd_python_topics',
    sql: `
      -- Python System Design track parity with Java (15 Java topics, 0 Python).
      -- Guarded: runs once via schema_migrations, plus NOT EXISTS for safety.
      INSERT INTO system_design_topics (language, topic, title, description, difficulty, requirements, constraints, expected_components)
      SELECT * FROM (VALUES
        ('Python', 'design-tinyurl', 'Design TinyURL', 'Design a URL shortening service with a Python stack.', 'Junior', ARRAY['Generate short unique URLs', 'Redirect short URL to original', 'Track click analytics'], ARRAY['10M new URLs/month', '100M redirects/day', 'Low latency (<10ms redirect)'], ARRAY['Load Balancer', 'FastAPI Service', 'PostgreSQL', 'Redis Cache']),
        ('Python', 'design-chat', 'Design WhatsApp / Messenger', 'Design a real-time messaging system with Django Channels / FastAPI WebSockets.', 'Middle', ARRAY['Send/receive messages in real-time', 'Support group chats', 'Message delivery status', 'Media sharing'], ARRAY['1B users', '100M messages/day', '<100ms delivery latency'], ARRAY['WebSocket Server (Django Channels)', 'Celery + Redis Queue', 'PostgreSQL', 'S3 for media']),
        ('Python', 'design-newsfeed', 'Design Facebook / Instagram Feed', 'Design a social media newsfeed with fan-out.', 'Middle', ARRAY['Generate personalized feed', 'Support posts, photos, videos', 'Like/comment/share'], ARRAY['500M DAU', 'Feed loads in <500ms'], ARRAY['Load Balancer', 'Feed Service (FastAPI)', 'Cassandra', 'Redis', 'Celery Workers']),
        ('Python', 'design-uber', 'Design Uber / Rider App', 'Design a ride-hailing service with geo matching.', 'Senior', ARRAY['Match riders with drivers', 'Real-time location tracking', 'ETA calculation', 'Payment processing'], ARRAY['100M users', '10M rides/day', '<1s matching latency'], ARRAY['FastAPI Gateway', 'Geo Service (Redis Geo)', 'Matching Engine (Celery)', 'PostgreSQL', 'Kafka']),
        ('Python', 'design-ecommerce', 'Design Amazon / E-commerce', 'Design an e-commerce platform with Django.', 'Middle', ARRAY['Product catalog with search', 'Shopping cart', 'Order management', 'Payment processing'], ARRAY['200M products', '1M orders/day', 'Support flash sales (100K req/s)'], ARRAY['Django + DRF', 'Elasticsearch', 'PostgreSQL (sharded)', 'Redis', 'Celery Workers']),
        ('Python', 'design-rate-limiter', 'Design Rate Limiter', 'Design a distributed rate limiter with Redis.', 'Middle', ARRAY['Rate limit API requests per user/IP', 'Support multiple rules', 'Low latency decisions'], ARRAY['100K req/s', '<1ms overhead'], ARRAY['Redis Cluster', 'FastAPI Middleware', 'Prometheus Metrics']),
        ('Python', 'design-crawler', 'Design Web Crawler', 'Design a distributed crawler with Scrapy.', 'Middle', ARRAY['Crawl billions of pages', 'Detect duplicates', 'Respect robots.txt'], ARRAY['10B pages', 'Politeness delays', '100PB storage'], ARRAY['URL Frontier (Redis)', 'Scrapy Cluster', 'Bloom Filter', 'S3']),
        ('Python', 'design-notifications', 'Design Notification System', 'Design multi-channel notifications with Celery.', 'Middle', ARRAY['Push/email/SMS notifications', 'Preference management', 'Scheduled sending'], ARRAY['10M notifications/day', '<1s delivery'], ARRAY['Celery Beat', 'Redis Queue', 'FCM/APNS Connectors', 'PostgreSQL']),
        ('Python', 'design-ml-features', 'Design ML Feature Store', 'Design an ML feature platform with Feast.', 'Senior', ARRAY['Serve online/offline features', 'Point-in-time correctness', 'Feature monitoring'], ARRAY['10M predictions/day', '<50ms online serving'], ARRAY['Feast Registry', 'Redis Online Store', 'Parquet Offline Store', 'Airflow Pipelines']),
        ('Python', 'design-kvstore', 'Design Distributed Key-Value Store', 'Design a consistent-hash KV store.', 'Senior', ARRAY['Get/put with replication', 'Fault tolerance', 'Tunable consistency'], ARRAY['1M QPS', '100TB data', '99.999% availability'], ARRAY['Consistent Hashing Ring', 'Replication Manager', 'RocksDB Storage'])
      ) AS v(language, topic, title, description, difficulty, requirements, constraints, expected_components)
      WHERE NOT EXISTS (SELECT 1 FROM system_design_topics WHERE language = 'Python');
    `
  },
  {
    id: '048_track_steps_heal',
    sql: `
      -- Heal track_steps: drop steps pointing at deactivated questions, rebuild
      -- the 7 tracks that contain dead steps, and seed the 13 tracks that are
      -- still empty (their original matchers found nothing at seed time).
      -- Step integrity: getNextTrackQuestion uses step_order = currentStep + 1,
      -- so rebuilt tracks are renumbered contiguously via ROW_NUMBER.
      DELETE FROM track_steps ts USING questions q
      WHERE ts.question_id = q.id AND q.is_active = FALSE;

      DELETE FROM track_steps WHERE track_id IN (
        SELECT id FROM learning_tracks WHERE
          (language = 'Java' AND name = 'Java Core Fundamentals') OR
          (language = 'Kotlin' AND name IN ('Kotlin Coroutines', 'Kotlin Data Structures', 'Kotlin Design Patterns', 'Kotlin Multiplatform')) OR
          (language = 'Python' AND name = 'FastAPI / Django') OR
          (language = 'Rust' AND name = 'Rust Unsafe & FFI')
      );

      -- Java Core Fundamentals (OOP 4 + Exceptions 3 + Java Core 3)
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        (SELECT id FROM questions WHERE language = 'Java' AND category = 'OOP' AND is_active = TRUE ORDER BY id LIMIT 4)
        UNION ALL
        (SELECT id FROM questions WHERE language = 'Java' AND category = 'Exceptions' AND is_active = TRUE ORDER BY id LIMIT 3)
        UNION ALL
        (SELECT id FROM questions WHERE language = 'Java' AND category = 'Java Core' AND is_active = TRUE ORDER BY id LIMIT 3)
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Java Core Fundamentals' AND language = 'Java' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Kotlin Coroutines
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Kotlin' AND (category ILIKE '%coroutine%' OR category ILIKE '%flow%' OR category ILIKE '%concurr%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Kotlin Coroutines' AND language = 'Kotlin' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Kotlin Data Structures
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Kotlin' AND (category ILIKE '%collection%' OR category ILIKE '%data struct%' OR category ILIKE '%sequence%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Kotlin Data Structures' AND language = 'Kotlin' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Kotlin Design Patterns
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Kotlin' AND (category ILIKE '%design pattern%' OR category ILIKE '%pattern%' OR category ILIKE '%dsl%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Kotlin Design Patterns' AND language = 'Kotlin' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Kotlin Multiplatform
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Kotlin' AND (category ILIKE '%multiplatform%' OR category ILIKE '%kmp%' OR category ILIKE '%expect%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Kotlin Multiplatform' AND language = 'Kotlin' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Python FastAPI / Django
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Python' AND (category ILIKE '%fastapi%' OR category ILIKE '%django%' OR category ILIKE '%flask%' OR category ILIKE '%web%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'FastAPI / Django' AND language = 'Python' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Rust Unsafe & FFI
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Rust' AND (category ILIKE '%unsafe%' OR category ILIKE '%ffi%' OR category ILIKE '%raw pointer%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Rust Unsafe & FFI' AND language = 'Rust' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Go Design Patterns
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Go' AND (category ILIKE '%design pattern%' OR category ILIKE '%pattern%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Design Patterns in Go' AND language = 'Go' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Go Data Structures
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Go' AND (category ILIKE '%data struct%' OR category ILIKE '%slice%' OR category ILIKE '%map%' OR category ILIKE '%collection%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Go Data Structures' AND language = 'Go' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Go Runtime Deep Dive (runtime topics + Senior Go Core: GC/scheduler/profiling)
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Go' AND ((category ILIKE '%runtime%' OR category ILIKE '%gc%' OR category ILIKE '%memory%' OR category ILIKE '%profil%' OR category ILIKE '%schedul%') OR (category = 'Go Core' AND difficulty = 'Senior')) AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Go Runtime Deep Dive' AND language = 'Go' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Python Data Structures & Algorithms
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Python' AND (category ILIKE '%data struct%' OR category ILIKE '%algorithm%' OR category ILIKE '%collection%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Data Structures & Algorithms' AND language = 'Python' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Python Design Patterns
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Python' AND (category ILIKE '%design pattern%' OR category ILIKE '%pattern%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Design Patterns in Python' AND language = 'Python' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Python Internals
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Python' AND (category ILIKE '%intern%' OR category ILIKE '%memory%' OR category ILIKE '%performance%' OR category ILIKE '%optim%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Python Internals' AND language = 'Python' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- React Design Patterns
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'React' AND (category ILIKE '%design pattern%' OR category ILIKE '%pattern%' OR category ILIKE '%hoc%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'React Design Patterns' AND language = 'React' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- React Server Components
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'React' AND (category ILIKE '%server%' OR category ILIKE '%ssr%' OR category ILIKE '%next%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'React Server Components' AND language = 'React' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Rust Data Structures
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Rust' AND (category ILIKE '%data struct%' OR category ILIKE '%collection%' OR category ILIKE '%iterator%' OR category ILIKE '%vec%' OR category ILIKE '%hashmap%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Rust Data Structures' AND language = 'Rust' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- Rust Design Patterns
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'Rust' AND (category ILIKE '%design pattern%' OR category ILIKE '%pattern%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Rust Design Patterns' AND language = 'Rust' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- TypeScript Design Patterns
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'TypeScript' AND (category ILIKE '%design pattern%' OR category ILIKE '%pattern%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'Design Patterns in TypeScript' AND language = 'TypeScript' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- TypeScript Compiler Deep Dive
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'TypeScript' AND (category ILIKE '%compil%' OR category ILIKE '%intern%' OR category ILIKE '%declaration%') AND is_active = TRUE ORDER BY id LIMIT 8
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'TypeScript Compiler Deep Dive' AND language = 'TypeScript' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);

      -- TypeScript + React / Node
      INSERT INTO track_steps (track_id, question_id, step_order)
      SELECT lt.id, q.id, ROW_NUMBER() OVER (ORDER BY q.id)
      FROM (
        SELECT id FROM questions WHERE language = 'TypeScript' AND (category ILIKE '%react%' OR category ILIKE '%node%' OR category ILIKE '%express%' OR category ILIKE '%next%') AND is_active = TRUE ORDER BY id LIMIT 10
      ) q
      CROSS JOIN (SELECT id FROM learning_tracks WHERE name = 'TypeScript + React / Node' AND language = 'TypeScript' LIMIT 1) lt
      WHERE NOT EXISTS (SELECT 1 FROM track_steps WHERE track_id = lt.id);
    `
  },
  // ── 049: Frameworks, Topics & Tags schema and classification ────────
  {
    id: '049_frameworks_topics_tags',
    sql: `
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS framework VARCHAR(100);
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
      CREATE INDEX IF NOT EXISTS idx_questions_framework ON questions(framework);
      CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic);
      CREATE INDEX IF NOT EXISTS idx_questions_tags ON questions USING GIN(tags);

      ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS selected_frameworks TEXT[];
      ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS selected_topics TEXT[];

      -- Spring Boot
      UPDATE questions
      SET framework = 'Spring Boot', tags = ARRAY['spring', 'spring-boot', 'web', 'microservices']
      WHERE (question_text ILIKE '%spring boot%' OR question_text ILIKE '%actuator%' OR question_text ILIKE '%application.properties%' OR question_text ILIKE '%starter%')
        AND (framework IS NULL OR framework = '');

      -- Spring Framework (Core / IoC / DI / MVC)
      UPDATE questions
      SET framework = 'Spring Framework', tags = ARRAY['spring', 'ioc', 'di', 'beans', 'aop']
      WHERE (category ILIKE '%spring%' OR question_text ILIKE '%@Autowired%' OR question_text ILIKE '%@Component%' OR question_text ILIKE '%@Bean%' OR question_text ILIKE '%ApplicationContext%')
        AND (framework IS NULL OR framework = '');

      -- Hibernate / JPA
      UPDATE questions
      SET framework = 'Hibernate / JPA', tags = ARRAY['hibernate', 'jpa', 'orm', 'database', 'sql']
      WHERE (question_text ILIKE '%hibernate%' OR question_text ILIKE '%jpa%' OR question_text ILIKE '%@Entity%' OR question_text ILIKE '%criteria%' OR question_text ILIKE '%session%' OR question_text ILIKE '%lazy loading%')
        AND (framework IS NULL OR framework = '');

      -- Kafka / Messaging
      UPDATE questions
      SET framework = 'Kafka / Messaging', tags = ARRAY['kafka', 'messaging', 'mq', 'event-driven']
      WHERE (question_text ILIKE '%kafka%' OR question_text ILIKE '%rabbit%' OR question_text ILIKE '%message queue%' OR question_text ILIKE '%consumer%' OR question_text ILIKE '%producer%')
        AND (framework IS NULL OR framework = '');

      -- Docker / Kubernetes
      UPDATE questions
      SET framework = 'Docker / K8s', tags = ARRAY['docker', 'kubernetes', 'container', 'devops']
      WHERE (question_text ILIKE '%docker%' OR question_text ILIKE '%kubernetes%' OR question_text ILIKE '%k8s%' OR question_text ILIKE '%container%')
        AND (framework IS NULL OR framework = '');

      -- Testing frameworks
      UPDATE questions
      SET framework = 'JUnit / Mockito', tags = ARRAY['testing', 'junit', 'mockito', 'unit-test']
      WHERE (category ILIKE '%test%' OR question_text ILIKE '%junit%' OR question_text ILIKE '%mockito%' OR question_text ILIKE '%@Test%')
        AND (framework IS NULL OR framework = '');

      -- Python Frameworks
      UPDATE questions
      SET framework = 'FastAPI', tags = ARRAY['fastapi', 'python', 'async', 'api']
      WHERE language = 'Python' AND (question_text ILIKE '%fastapi%' OR category ILIKE '%fastapi%');

      UPDATE questions
      SET framework = 'Django', tags = ARRAY['django', 'python', 'orm', 'web']
      WHERE language = 'Python' AND (question_text ILIKE '%django%' OR category ILIKE '%django%');

      UPDATE questions
      SET framework = 'PyTest', tags = ARRAY['pytest', 'python', 'testing']
      WHERE language = 'Python' AND (question_text ILIKE '%pytest%' OR category ILIKE '%test%');

      -- React
      UPDATE questions
      SET framework = 'React', tags = ARRAY['react', 'frontend', 'hooks', 'jsx']
      WHERE (language = 'React' OR category ILIKE '%react%')
        AND (framework IS NULL OR framework = '');

      -- Topic classification
      UPDATE questions
      SET topic = 'Concurrency & Threads'
      WHERE (category ILIKE '%multithread%' OR category ILIKE '%concurr%' OR question_text ILIKE '%thread%' OR question_text ILIKE '%synchronized%' OR question_text ILIKE '%volatile%' OR question_text ILIKE '%deadlock%')
        AND (topic IS NULL OR topic = '');

      UPDATE questions
      SET topic = 'Collections & Data Structures'
      WHERE (category ILIKE '%collection%' OR question_text ILIKE '%hashmap%' OR question_text ILIKE '%arraylist%' OR question_text ILIKE '%linkedlist%' OR question_text ILIKE '%treemap%')
        AND (topic IS NULL OR topic = '');

      UPDATE questions
      SET topic = 'Memory & GC'
      WHERE (category ILIKE '%jvm%' OR question_text ILIKE '%garbage collection%' OR question_text ILIKE '%heap%' OR question_text ILIKE '%metaspace%' OR question_text ILIKE '%g1%')
        AND (topic IS NULL OR topic = '');

      UPDATE questions
      SET topic = 'OOP & Design Patterns'
      WHERE (category ILIKE '%oop%' OR category ILIKE '%design pattern%' OR question_text ILIKE '%solid%' OR question_text ILIKE '%singleton%' OR question_text ILIKE '%factory%')
        AND (topic IS NULL OR topic = '');

      UPDATE questions
      SET topic = 'Stream API & Functional'
      WHERE (category ILIKE '%stream%' OR question_text ILIKE '%stream api%' OR question_text ILIKE '%lambda%' OR question_text ILIKE '%optional%')
        AND (topic IS NULL OR topic = '');

      UPDATE questions
      SET topic = 'Database & SQL'
      WHERE (category ILIKE '%database%' OR question_text ILIKE '%sql%' OR question_text ILIKE '%acid%' OR question_text ILIKE '%transaction%' OR question_text ILIKE '%index%')
        AND (topic IS NULL OR topic = '');

      UPDATE questions
      SET topic = 'Exceptions & Error Handling'
      WHERE (category ILIKE '%exception%' OR question_text ILIKE '%try-catch%' OR question_text ILIKE '%throwable%')
        AND (topic IS NULL OR topic = '');

      -- Fallback topic for any unclassified questions
      UPDATE questions
      SET topic = category
      WHERE (topic IS NULL OR topic = '');
    `
  },
  {
    id: '050_top_interview_questions',
    sql: `
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_top BOOLEAN DEFAULT FALSE;
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS top_rank INT;
      CREATE INDEX IF NOT EXISTS idx_questions_is_top ON questions(is_top) WHERE is_top = TRUE;
      CREATE INDEX IF NOT EXISTS idx_questions_top_rank ON questions(language, top_rank ASC) WHERE is_top = TRUE;

      -- Mark prominent fundamental questions as top questions with rank
      WITH ranked_seeds AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY language ORDER BY id ASC) as rank
        FROM questions
        WHERE is_active = TRUE
          AND (
            category ILIKE '%core%'
            OR category ILIKE '%oop%'
            OR category ILIKE '%collection%'
            OR category ILIKE '%multithread%'
            OR category ILIKE '%spring%'
            OR category ILIKE '%concurr%'
            OR question_text ILIKE '%equals%'
            OR question_text ILIKE '%hashmap%'
            OR question_text ILIKE '%jvm%'
            OR question_text ILIKE '%deadlock%'
            OR question_text ILIKE '%thread%'
            OR question_text ILIKE '%interface%'
            OR question_text ILIKE '%singleton%'
          )
      )
      UPDATE questions q
      SET is_top = TRUE,
          top_rank = rs.rank,
          tags = array_append(COALESCE(tags, '{}'), 'top')
      FROM ranked_seeds rs
      WHERE q.id = rs.id AND rs.rank <= 100;
    `
  },
  {
    id: '051_curated_modern_questions_and_balanced_options',
    sql: `
      INSERT INTO questions (
        category, difficulty, question_text, short_answer, options,
        language, framework, topic, is_top, top_rank, tags, is_active
      )
      VALUES
        ('Multithreading', 'Senior', 'Почему в Java 21 виртуальный поток может «запиниться» (pinning) на carrier thread, и как этого избежать?', 'Поток пинится внутри блока synchronized или нативного вызова; для решения synchronized заменяют на ReentrantLock.', '["При входе в блок synchronized или вызове native-кода; для решения synchronized заменяют на ReentrantLock","При выполнении блокирующего сокетного I/O; для решения сокеты оборачивают в асинхронные каналы NIO","При превышении лимита размера стека фреймов; для решения увеличивают параметр JVM -XX:ThreadStackSize","При обращении к объектам в Old Generation GC; для решения включают флаг -XX:+UseZGCGenerational"]'::jsonb, 'Java', 'Virtual Threads', 'Concurrency', TRUE, 1, ARRAY['top','modern','Virtual Threads','Concurrency'], TRUE),
        ('Multithreading', 'Senior', 'В чем главное преимущество StructuredTaskScope по сравнению с CompletableFuture в Java 21?', 'Гарантирует объединение жизненного цикла дочерних задач в единый синтаксический блок с отменой при сбое.', '["Объединяет жизненный цикл дочерних подзадач в единый блок, отменяя остальные при первом сбое или таймауте","Автоматически переносит выполнение всех вычислительных потоков с CPU-ядер на GPU для ускорения вычислений","Полностью устраняет необходимость выделения оперативной памяти под стек вызовов для дочерних потоков","Позволяет передавать неизменяемые контекстные переменные между микросервисами без сериализации в JSON"]'::jsonb, 'Java', 'Structured Concurrency', 'Concurrency', TRUE, 2, ARRAY['top','modern','Structured Concurrency','Concurrency'], TRUE),
        ('Java Core', 'Middle', 'Как работает проверка исчерпываемости (exhaustiveness) в switch expressions с sealed-иерархиями в Java 21?', 'Компилятор знает все прямые подклассы sealed-типа и требует либо покрытия каждого из них, либо ветки default.', '["Компилятор знает всех прямых наследников sealed-типа и требует покрыть каждый класс либо указать default","JVM во время выполнения генерирует ветку default через динамический байт-код при обнаружении неизвестного типа","Разработчик обязан объявить специальную аннотацию @Exhaustive над выражением switch для контроля компилятора","Исчерпываемость проверяется только для enum-типов, а для sealed-классов всегда обязательна ветка default"]'::jsonb, 'Java', 'Modern Java', 'Language Features', TRUE, 3, ARRAY['top','modern','Modern Java','Language Features'], TRUE),
        ('JVM', 'Senior', 'Какое ключевое архитектурное улучшение получил Generational ZGC в Java 21 по сравнению с классическим ZGC?', 'Разделение кучи на поколения позволяет чаще собирать короткоживущие объекты, снижая нагрузку на CPU.', '["Разделение кучи на поколения позволяет чаще собирать молодые объекты, существенно снижая расход CPU","Переход на синхронный Stop-The-World алгоритм для ускорения освобождения непрерывных блоков памяти","Полный отказ от использования цветных указателей (colored pointers) и барьеров чтения (load barriers)","Интеграция со сжатием указателей (Compressed OOPs) для куч размером свыше 32 терабайт оперативной памяти"]'::jsonb, 'Java', 'Garbage Collection', 'Memory & GC', TRUE, 4, ARRAY['top','modern','Garbage Collection','Memory & GC'], TRUE),
        ('Spring', 'Senior', 'Зачем в Spring Boot 3 при компиляции в GraalVM Native Image необходим этап Ahead-Of-Time (AOT) генерации?', 'GraalVM требует закрытого мира: AOT заранее вычисляет граф бинов и регистрирует метаданные для рефлексии.', '["AOT заранее анализирует конфигурацию бинов и создает подсказки для рефлексии, нужные закрытому миру GraalVM","AOT выполняет предварительное шифрование байт-кода приложения для защиты от декомпиляции в облачной среде","AOT компилирует все входящие SQL-запросы в бинарные функции драйвера базы данных для исключения сетевых задержек","AOT запускает встроенный контейнер Tomcat во время сборки и замораживает его состояние в оперативной памяти"]'::jsonb, 'Java', 'Spring Boot 3', 'Native Compilation', TRUE, 5, ARRAY['top','modern','Spring Boot 3','Native Compilation'], TRUE),
        ('Spring', 'Middle', 'Что представляют собой HTTP Interfaces (@HttpExchange), появившиеся в Spring Framework 6 / Spring Boot 3?', 'Декларативные интерфейсы HTTP-клиентов с аннотациями обмена, генерируемые через HttpServiceProxyFactory.', '["Декларативное описание HTTP-клиентов через интерфейс с аннотациями, проксируемое поверх WebClient или RestClient","Специальные контроллеры для автоматической генерации Swagger-документации без использования аннотаций OpenAPI","Новый механизм маршрутизации входящих веб-сокетов с поддержкой аппаратного ускорения сетевых протоколов HTTP/3","Фильтры безопасности для проверки валидности JWT-токенов на уровне сетевого драйвера операционной системы"]'::jsonb, 'Java', 'Spring Boot 3', 'Web & REST', TRUE, 6, ARRAY['top','modern','Spring Boot 3','Web & REST'], TRUE),
        ('Microservices', 'Senior', 'Чем Cooperative Sticky Assignor в Apache Kafka отличается от классического Eager Rebalance?', 'Не отзывает все партиции у консьюмеров при ребалансировке, отзывая только перемещаемые партиции без простоя.', '["Отзывает только те партиции, которые нужно перенести на другой консьюмер, исключая общий stop-the-world простой","Назначает все партиции одному лидер-консьюмеру, а остальные инстансы держит в горячем резерве без чтения данных","Блокирует отправку новых сообщений брокером до тех пор, пока все консьюмеры группы не подтвердят получение оффсетов","Переносит партиции между консьюмерами только в момент плановой перезагрузки брокера Apache Kafka по протоколу Raft"]'::jsonb, 'Java', 'Kafka', 'Messaging', TRUE, 7, ARRAY['top','modern','Kafka','Messaging'], TRUE),
        ('Microservices', 'Middle', 'Как Kafka продюсер гарантирует идемпотентность (enable.idempotence=true) при повторных сетевых отправках?', 'Брокер присваивает продюсеру уникальный Producer ID, а сообщениям порядковые номера в рамках партиции.', '["Брокер выделяет продюсеру Producer ID (PID) и отслеживает порядковые Sequence Number для каждой партиции","Продюсер перед каждой отправкой выполняет распределенную блокировку партиции в координаторе кластера KRaft","Брокер сохраняет SHA-256 хеш каждого сообщения в оперативной памяти на протяжении ровно двадцати четырех часов","Продюсер ожидает синхронного ответа от всех брокеров кластера перед переходом к сериализации следующего батча"]'::jsonb, 'Java', 'Kafka', 'Messaging', TRUE, 8, ARRAY['top','modern','Kafka','Messaging'], TRUE),
        ('Microservices', 'Senior', 'Какую проблему в распределенных системах решает шаблон Transactional Outbox?', 'Гарантирует атомарность между изменением данных в БД и публикацией события в брокер сообщений.', '["Гарантирует атомарность обновления локальной базы данных и отправки сообщения в брокер без двухфазного коммита","Обеспечивает автоматическое горизонтальное масштабирование очередей сообщений при пиковых всплесках трафика","Шифрует заголовки сетевых пакетов между микросервисами для защиты от атак типа man-in-the-middle в сети","Предотвращает возникновение циклических зависимостей между сервисами при использовании протокола gRPC"]'::jsonb, 'Java', 'Architecture', 'Distributed Systems', TRUE, 9, ARRAY['top','modern','Architecture','Distributed Systems'], TRUE),
        ('Microservices', 'Senior', 'В чем главное преимущество оркестрируемой Saga над хореографической при сложных бизнес-процессах?', 'Централизованная логика координации, простота мониторинга состояния и отсутствие запутанных циклических связей.', '["Централизованный контроль шагов процесса и компенсирующих транзакций, предотвращающий запутанные циклические связи","Полное отсутствие сетевых вызовов между микросервисами благодаря выполнению всего кода в общей разделяемой памяти","Автоматическая изоляция уровня Serializable для распределенных транзакций без использования блокировок строк","Возможность отката уже закоммиченных локальных транзакций в реляционных базах данных без компенсирующих действий"]'::jsonb, 'Java', 'Architecture', 'Distributed Systems', TRUE, 10, ARRAY['top','modern','Architecture','Distributed Systems'], TRUE),
        ('TypeScript Core', 'Middle', 'Чем оператор satisfies в TypeScript 5 отличается от явной аннотации типа (const obj: Type = ...)?', 'Проверяет соответствие типу Type, но сохраняет наиболее узкий (литеральный) выведенный тип выражения.', '["Проверяет соответствие типу, но сохраняет точный литеральный выведенный тип объекта без расширения до общего типа","Выполняет динамическую валидацию схемы данных в рантайме JavaScript аналогично библиотекам Zod и Yup","Принудительно приводит тип выражения к any во время выполнения для обхода строгих проверок компилятора","Создает глубокую неизменяемую копию переданного объекта с блокировкой добавления новых свойств в Object"]'::jsonb, 'TypeScript', 'TypeScript 5', 'Type System', TRUE, 11, ARRAY['top','modern','TypeScript 5','Type System'], TRUE),
        ('TypeScript Core', 'Senior', 'Зачем в TypeScript 5 добавили const модификатор для type parameters (<const T>)?', 'Заставляет компилятор автоматически выводить литеральные и readonly-типы для аргументов без as const.', '["Заставляет TypeScript по умолчанию выводить глубокие литеральные типы аргументов без явного указания as const","Запрещает переопределение дженерик-типа в классах-наследниках на уровне синтаксического анализатора кода","Оптимизирует компиляцию больших проектов, кэшируя абстрактное синтаксическое дерево неизменяемых функций","Гарантирует, что переданная в функцию переменная не может быть переприсвоена внутри тела самой функции"]'::jsonb, 'TypeScript', 'TypeScript 5', 'Generics', TRUE, 12, ARRAY['top','modern','TypeScript 5','Generics'], TRUE),
        ('React', 'Senior', 'Какое ограничение накладывается на пропсы, передаваемые из Server Component в Client Component (''use client'') в React 19?', 'Пропсы должны быть сериализуемыми значениями (JSON-подобными или Promise), функции передавать нельзя.', '["Пропсы должны быть сериализуемыми (примитивы, простые объекты, Promise), обычные функции передавать нельзя","Client Component может принимать исключительно строковые значения, а числа должны передаваться в URL-параметрах","Размер всех пропсов клиентского компонента жестко ограничен шестнадцатью килобайтами в сжатом виде gzip","Все передаваемые объекты обязаны быть экземплярами классов, унаследованных от базового класса React.Component"]'::jsonb, 'TypeScript', 'React 19', 'Server Components', TRUE, 13, ARRAY['top','modern','React 19','Server Components'], TRUE),
        ('React', 'Middle', 'Для чего в React 19 предназначен новый хук useActionState (ранее useFormState)?', 'Управляет состоянием асинхронного Action, возвращая текущее состояние, функцию запуска и статус isPending.', '["Управляет состоянием асинхронных Server/Client Actions, возвращая результат, функцию вызова и флаг isPending","Заменяет глобальный Redux-стор на легковесный контекст с автоматической синхронизацией через LocalStorage","Перехватывает необработанные ошибки в дочернем дереве компонентов вместо стандартного метода componentDidCatch","Оптимизирует отрисовку тяжелых списков с помощью виртуализации узлов DOM-дерева в фоновом web-worker"]'::jsonb, 'TypeScript', 'React 19', 'Hooks & Forms', TRUE, 14, ARRAY['top','modern','React 19','Hooks & Forms'], TRUE),
        ('TypeScript Core', 'Middle', 'В каком порядке и когда в JavaScript Event Loop очищается очередь микротасок (microtask queue)?', 'Очередь микротасок выполняется полностью сразу после текущего синхронного стека перед любой макротаской.', '["Выполняется полностью сразу после завершения текущего синхронного кода перед следующей макротаской и рендером","Выполняется строго один раз в секунду по системному таймеру операционной системы параллельно с макротасками","Обрабатывается порциями по 10 задач исключительно после завершения всех таймеров setTimeout и сетевых запросов","Запускается только тогда, когда стек вызовов и очередь макротасок одновременно становятся абсолютно пустыми"]'::jsonb, 'TypeScript', 'Node.js', 'Event Loop', TRUE, 15, ARRAY['top','modern','Node.js','Event Loop'], TRUE),
        ('Python Core', 'Senior', 'Что представляет собой инициатива Free-threaded CPython (PEP 703), представленная в Python 3.12/3.13?', 'Опциональная сборка CPython без глобальной блокировки интерпретатора (GIL) с потокобезопасным подсчетом ссылок.', '["Возможность запуска CPython без GIL (--disable-gil) с параллельным исполнением байт-кода на нескольких CPU","Автоматическая трансляция Python-скриптов в машинный бинарный код LLVM без участия стандартного интерпретатора","Замена механизма подсчета ссылок на сборщик мусора Mark-and-Sweep для полного устранения циклических ссылок","Встроенная поддержка асинхронного выполнения синхронных блокирующих функций через технологию eBPF в ядре Linux"]'::jsonb, 'Python', 'Python 3.12+', 'GIL & Concurrency', TRUE, 16, ARRAY['top','modern','Python 3.12+','GIL & Concurrency'], TRUE),
        ('Python Core', 'Senior', 'Почему в современном Python (3.11+) рекомендуется использовать asyncio.TaskGroup вместо asyncio.gather?', 'TaskGroup реализует structured concurrency: при исключении в одной задаче остальные надежно отменяются.', '["TaskGroup гарантирует отмену всех остальных подзадач при падении одной из них и выбрасывает ExceptionGroup","TaskGroup выполняет корутины в отдельных системных процессах операционной системы для обхода ограничений GIL","TaskGroup автоматически преобразует синхронные блокирующие вызовы библиотек requests и time в асинхронные","TaskGroup исключает накладные расходы на создание контекстных менеджеров за счет раннего выделения стека"]'::jsonb, 'Python', 'Async/Await', 'Structured Concurrency', TRUE, 17, ARRAY['top','modern','Async/Await','Structured Concurrency'], TRUE),
        ('Python Core', 'Middle', 'В чем преимущество нового оператора type (PEP 695), появившегося в Python 3.12, для создания type aliases?', 'Синтаксис объявляет лениво вычисляемые псевдонимы типов со встроенной поддержкой generic параметров.', '["Создает лениво вычисляемый псевдоним типа с лаконичным синтаксисом дженериков без TypeVar и импорта TypeAlias","Проверяет типы переданных параметров функции во время выполнения и бросает исключение TypeError при несовпадении","Компилирует аннотации типов в C-структуры для существенного ускорения работы математических вычислений NumPy","Позволяет создавать множественное наследование от встроенных примитивных типов int и str без ограничений метаклассов"]'::jsonb, 'Python', 'Modern Python', 'Type Hints', TRUE, 18, ARRAY['top','modern','Modern Python','Type Hints'], TRUE),
        ('Python Core', 'Middle', 'В чем разница в выполнении эндпоинта в FastAPI, если объявить его как def endpoint() вместо async def endpoint()?', 'Обычный def запускается в отдельном потоке из threadpool, а async def выполняется напрямую в event loop.', '["Обычный def запускается во внешнем пуле потоков (threadpool), а async def выполняется прямо в главном event loop","Обычный def не поддерживает валидацию входящих моделей Pydantic и возвращает сырой HTTP-ответ клиенту","Функция async def выполняется в отдельном системном процессе операционной системы через модуль multiprocessing","Между ними нет никакой разницы, так как компилятор AnyIO автоматически преобразует def в корутину async def"]'::jsonb, 'Python', 'FastAPI', 'Web Frameworks', TRUE, 19, ARRAY['top','modern','FastAPI','Web Frameworks'], TRUE),
        ('Go Core', 'Senior', 'Как устроена модель M:P:N (G-M-P) планировщика Go, и какую роль в ней играет абстракция P (Processor)?', 'P представляет логический контекст исполнения с локальной очередью горутин, привязываемый к системному потоку M.', '["P представляет логический контекст выполнения с локальной очередью горутин, связывающий поток ОС (M) и горутину (G)","P отвечает за предварительную компиляцию байт-кода горутины в процессорные инструкции непосредственно перед запуском","P является физическим ядром процессора, на которое Go runtime жестко привязывает системные прерывания операционной системы","P хранит глобальный стек вызовов всех горутин и синхронизирует выделение блоков памяти между потоками без блокировок"]'::jsonb, 'Go', 'Go Runtime', 'Concurrency', TRUE, 20, ARRAY['top','modern','Go Runtime','Concurrency'], TRUE),
        ('Go Core', 'Senior', 'Какая ключевая структура данных лежит в основе канала в Go runtime, и как она защищена от гонок?', 'Структура hchan содержит кольцевой буфер, очереди ожидающих горутин recvq/sendq и встроенный мьютекс lock.', '["Структура hchan с кольцевым циклическим буфером, очередями ожидания горутин (waitq) и встроенным мьютексом lock","Атомарный lock-free связный список на базе CAS-инструкций процессора без использования внутренних мьютексов","Специальный кольцевой буфер операционной системы Linux pipe с разделяемой памятью между потоками процесса","Двусвязный список указателей на стек горутин, защищенный RCU (Read-Copy-Update) блокировкой ядра runtime"]'::jsonb, 'Go', 'Go Runtime', 'Channels', TRUE, 21, ARRAY['top','modern','Go Runtime','Channels'], TRUE),
        ('Go Core', 'Middle', 'В каких случаях компилятор Go при Escape Analysis принимает решение выделить переменную в куче (heap), а не на стеке?', 'Когда указатель на переменную выходит за пределы функции, передается в interface{} или ее размер неизвестен.', '["Когда ссылка на переменную покидает область видимости функции, передается в interface{} или размер неизвестен","Когда функция содержит более трех циклов for или содержит вызов любой стандартной функции из пакета math","Когда локальная переменная объявлена с использованием оператора := вместо явного ключевого слова var в коде","Исключительно тогда, когда объем доступной оперативной памяти превышает восемьдесят процентов от общего объема"]'::jsonb, 'Go', 'Go Runtime', 'Memory & Performance', TRUE, 22, ARRAY['top','modern','Go Runtime','Memory & Performance'], TRUE),
        ('Microservices', 'Middle', 'Как правильно реализовать паттерн Idempotency Key в платежных или критических REST API?', 'Клиент передает уникальный UUID в заголовке, сервер атомарно фиксирует статус обработки и кэширует ответ.', '["Клиент шлет уникальный UUID в заголовке, сервер атомарно резервирует ключ в БД/Redis и кэширует готовый ответ","Сервер вычисляет MD5-хеш IP-адреса клиента и отклоняет любые повторные сетевые пакеты в течение одного часа","Клиент отправляет запрос строго по протоколу UDP с подтверждением доставки через контрольную сумму заголовка","Сервер выполняет блокировку всей таблицы заказов в базе данных до завершения обработки сетевого соединения"]'::jsonb, 'Java', 'Architecture', 'Distributed Systems', TRUE, 23, ARRAY['top','modern','Architecture','Distributed Systems'], TRUE),
        ('Java Core', 'Junior', 'Какими свойствами по умолчанию обладает класс типа record в современном синтаксисе Java?', 'Является final классом, все поля final и private, генерирует канонический конструктор, equals, hashCode и toString.', '["Класс является final, все поля private final, автоматически создаются геттеры, equals(), hashCode() и toString()","Класс может наследоваться от абстрактных классов и позволяет динамически мутировать свои поля через сеттеры","Все поля записи автоматически сохраняются в постоянное дисковое хранилище при завершении виртуальной машины","Экземпляр записи всегда сериализуется исключительно в бинарный формат Protobuf без поддержки JSON-сериализации"]'::jsonb, 'Java', 'Modern Java', 'OOP & Records', TRUE, 24, ARRAY['top','modern','Modern Java','OOP & Records'], TRUE),
        ('Database', 'Middle', 'Как наиболее эффективно предотвратить проблему N+1 SELECT в Spring Data JPA при выборке связанных сущностей?', 'Использовать JOIN FETCH в JPQL запросе или аннотацию @EntityGraph для жадной загрузки за один SQL запрос.', '["Использовать предложение JOIN FETCH в JPQL-запросе либо декларативную аннотацию @EntityGraph над методом репозитория","Установить глобальный параметр FetchType.EAGER на все связи @OneToMany в доменных сущностях проекта","Увеличить размер пула соединений HikariCP в конфигурационном файле application.properties в четыре раза","Отключить кэш первого уровня Hibernate в свойствах EntityManagerFactory перед выполнением выборки из базы"]'::jsonb, 'Java', 'Spring Data JPA', 'JPA & Hibernate', TRUE, 25, ARRAY['top','modern','Spring Data JPA','JPA & Hibernate'], TRUE)
      ON CONFLICT (question_text, language)
      DO UPDATE SET
        category = EXCLUDED.category,
        difficulty = EXCLUDED.difficulty,
        short_answer = EXCLUDED.short_answer,
        options = EXCLUDED.options,
        framework = EXCLUDED.framework,
        topic = EXCLUDED.topic,
        is_top = TRUE,
        top_rank = EXCLUDED.top_rank,
        tags = ARRAY(SELECT DISTINCT unnest(array_cat(COALESCE(questions.tags, '{}'), EXCLUDED.tags))),
        is_active = TRUE;
    `
  },
];

async function runMigrations(dbPool) {
  const client = await dbPool.connect();
  
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
    await dbPool.end();
  }
}

runMigrations(pool)
  .then(() => (rbPool ? runMigrations(rbPool) : null))
  .then(() => {
    if (rbPool) console.log('🇧🇾 RB-localized datastore migrated.');
    console.log('✅ Done.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
