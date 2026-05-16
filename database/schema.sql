-- ══════════════════════════════════════════════════════════════════
--  Interview Tinder — Complete Database Schema (Production-Ready)
-- ══════════════════════════════════════════════════════════════════

-- ─── 1. Users ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    telegram_id             BIGINT PRIMARY KEY,
    username                VARCHAR(255),
    first_name              VARCHAR(255),
    last_name               VARCHAR(255),
    language                VARCHAR(50)  DEFAULT 'Java',
    subscription_plan       VARCHAR(50)  DEFAULT 'free',
    subscription_expires_at TIMESTAMP,
    resume_text             TEXT,
    parsed_resume_data      JSONB,
    current_streak          INT DEFAULT 0,
    longest_streak          INT DEFAULT 0,
    last_activity_date      DATE,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── 2. Questions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
    id                    SERIAL PRIMARY KEY,
    category              VARCHAR(100) NOT NULL,
    difficulty            VARCHAR(50)  DEFAULT 'Middle',
    language              VARCHAR(50)  DEFAULT 'Java',
    question_text         TEXT         NOT NULL,
    short_answer          TEXT         NOT NULL,
    options               JSONB,
    bug_hunting_data      JSONB,
    blitz_data            JSONB,
    code_completion_data  JSONB,
    cached_explanation    TEXT,
    is_active             BOOLEAN      DEFAULT TRUE,
    created_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_text, language)
);

-- ─── 3. User Progress & Mastery ─────────────────────────────────────
CREATE TYPE progress_status AS ENUM ('known', 'unknown');

CREATE TABLE IF NOT EXISTS user_progress (
    id          SERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    status      progress_status NOT NULL,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, question_id)
);

CREATE TABLE IF NOT EXISTS question_mastery (
    id               SERIAL PRIMARY KEY,
    user_id          BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    question_id      INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    mastery_level    INTEGER   DEFAULT 0,
    next_review      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, question_id)
);

-- ─── 4. User Preferences ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_preferences (
    telegram_id         BIGINT PRIMARY KEY REFERENCES users(telegram_id) ON DELETE CASCADE,
    selected_categories TEXT[]      DEFAULT '{}',
    selected_language   VARCHAR(50) DEFAULT 'Java',
    updated_at          TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

-- ─── 5. Subscriptions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
    id                       VARCHAR(50) PRIMARY KEY,
    name                     VARCHAR(100) NOT NULL,
    price_monthly            DECIMAL(10,2) DEFAULT 0,
    requests_per_day         INTEGER DEFAULT 200,
    ai_generations_per_month INTEGER DEFAULT 500,
    resume_analysis_limit    INTEGER DEFAULT 3,
    interview_eval_limit     INTEGER DEFAULT 20,
    available_languages      TEXT[]  DEFAULT ARRAY['Java','Python','TypeScript'],
    available_modes          TEXT[]  DEFAULT ARRAY['swipe','test','bug-hunting','blitz','mock-interview','concept-linker','code-completion'],
    model_priority           VARCHAR(20) DEFAULT 'standard',
    created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id               SERIAL PRIMARY KEY,
    user_id          BIGINT      NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    plan_id          VARCHAR(50) NOT NULL REFERENCES subscription_plans(id),
    status           VARCHAR(20) NOT NULL DEFAULT 'active',
    expires_at       TIMESTAMP,
    payment_id       VARCHAR(255),
    payment_provider VARCHAR(50),
    cancelled_at     TIMESTAMP,
    created_at       TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

-- Partial unique index: only one active subscription per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subs_one_active 
    ON user_subscriptions(user_id) 
    WHERE status = 'active';

-- ─── 6. Rate Limiting ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_rate_limits (
    user_id                    BIGINT PRIMARY KEY REFERENCES users(telegram_id) ON DELETE CASCADE,
    requests_today             INTEGER   DEFAULT 0,
    ai_generations_this_month  INTEGER   DEFAULT 0,
    resume_analyses_this_month INTEGER   DEFAULT 0,
    interview_evals_this_month INTEGER   DEFAULT 0,
    daily_reset_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    monthly_reset_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_request_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── 7. AI & Jobs ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_cache (
    id             SERIAL PRIMARY KEY,
    cluster_id     VARCHAR(64)  NOT NULL,
    mode           VARCHAR(50)  NOT NULL,
    model          VARCHAR(100),
    prompt_version VARCHAR(10)  NOT NULL DEFAULT 'v2',
    language       VARCHAR(50)  NOT NULL DEFAULT 'Java',
    response       TEXT         NOT NULL,
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cluster_id, mode, prompt_version, language)
);

CREATE TABLE IF NOT EXISTS ai_jobs (
    id             SERIAL PRIMARY KEY,
    task_type      VARCHAR(50) NOT NULL,
    payload        JSONB       NOT NULL,
    status         VARCHAR(20) DEFAULT 'pending',
    attempts       INT         DEFAULT 0,
    max_attempts   INT         DEFAULT 5,
    next_run_at    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    started_at     TIMESTAMP,
    completed_at   TIMESTAMP,
    error_message  TEXT,
    created_at     TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_type, payload)
);

-- ─── 8. Referrals ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
    id             SERIAL PRIMARY KEY,
    referrer_id    BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
    referred_id    BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE UNIQUE,
    converted      BOOLEAN   DEFAULT FALSE,
    reward_granted BOOLEAN   DEFAULT FALSE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── 9. Feedback & Reports ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS question_reports (
    id          SERIAL PRIMARY KEY,
    question_id INTEGER     NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    user_id     BIGINT      REFERENCES users(telegram_id) ON DELETE SET NULL,
    reason      VARCHAR(50) NOT NULL,
    comment     TEXT,
    resolved    BOOLEAN     DEFAULT FALSE,
    created_at  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

-- ─── 10. Analytics ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
    id            SERIAL PRIMARY KEY,
    user_id       BIGINT,
    event_type    VARCHAR(50),
    endpoint      VARCHAR(200),
    latency_ms    INTEGER,
    model         VARCHAR(100),
    cache_hit     BOOLEAN DEFAULT FALSE,
    token_usage   INTEGER,
    fallback_used BOOLEAN DEFAULT FALSE,
    properties    JSONB,
    metadata      JSONB,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── 11. Payments (TON) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pending_ton_invoices (
    id            SERIAL PRIMARY KEY,
    user_id       BIGINT      NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    plan_id       VARCHAR(50) NOT NULL,
    amount_ton    DECIMAL(10,4),
    wallet_address VARCHAR(255),
    status        VARCHAR(20) DEFAULT 'pending',
    expires_at    TIMESTAMP,
    created_at    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

-- ─── 12. Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_questions_language ON questions(language);
CREATE INDEX IF NOT EXISTS idx_questions_lang_cat ON questions(language, category);
CREATE INDEX IF NOT EXISTS idx_ai_cache_lookup ON ai_cache(cluster_id, mode, prompt_version, language);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subs_user_status ON user_subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_jobs(status, next_run_at);
