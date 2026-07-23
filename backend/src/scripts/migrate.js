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
  }
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
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
