-- ══════════════════════════════════════════════════════════════════
--  Interview Tinder — Complete DB Migration
--  Run this against your Supabase/Postgres database.
--  Safe to run multiple times (all statements are idempotent).
-- ══════════════════════════════════════════════════════════════════

-- ─── 1. Users table — add missing columns ─────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_text        TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS parsed_resume_data JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS language           VARCHAR(50)  DEFAULT 'Java';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan  VARCHAR(50)  DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;

-- ─── 2. Questions table — add missing columns ──────────────────────
ALTER TABLE questions ADD COLUMN IF NOT EXISTS language           VARCHAR(50)  DEFAULT 'Java';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS difficulty         VARCHAR(50)  DEFAULT 'Middle';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS options            JSONB;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS bug_hunting_data   JSONB;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS blitz_data         JSONB;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS code_completion_data JSONB;

-- Backfill language for existing Java questions
UPDATE questions SET language = 'Java' WHERE language IS NULL;
CREATE INDEX IF NOT EXISTS idx_questions_language ON questions(language);

-- ─── 3. User preferences table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_preferences (
    telegram_id        BIGINT PRIMARY KEY REFERENCES users(telegram_id) ON DELETE CASCADE,
    selected_categories TEXT[]     DEFAULT '{}',
    selected_language   VARCHAR(50) DEFAULT 'Java',
    updated_at          TIMESTAMP  DEFAULT CURRENT_TIMESTAMP
);

-- ─── 4. AI cache table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_cache (
    id             SERIAL PRIMARY KEY,
    cluster_id     VARCHAR(64)  NOT NULL,
    mode           VARCHAR(50)  NOT NULL,
    model          VARCHAR(100),
    prompt_version VARCHAR(10)  NOT NULL DEFAULT 'v1',
    language       VARCHAR(50)  NOT NULL DEFAULT 'Java',
    response       TEXT         NOT NULL,
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cluster_id, mode, prompt_version, language)
);
CREATE INDEX IF NOT EXISTS idx_ai_cache_lookup ON ai_cache(cluster_id, mode, prompt_version, language);

-- ─── 5. Subscription plans ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
    id                       VARCHAR(50) PRIMARY KEY,
    name                     VARCHAR(100) NOT NULL,
    price_monthly            DECIMAL(10,2) DEFAULT 0,
    requests_per_day         INTEGER DEFAULT 200,
    ai_generations_per_month INTEGER DEFAULT 500,
    resume_analysis_limit    INTEGER DEFAULT 3,
    interview_eval_limit     INTEGER DEFAULT 20,
    available_languages      TEXT[]  DEFAULT ARRAY['Java','Python','TypeScript'],
    available_modes          TEXT[]  DEFAULT ARRAY['swipe','test'],
    model_priority           VARCHAR(20) DEFAULT 'standard',
    created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Upsert default plans
INSERT INTO subscription_plans
    (id, name, price_monthly, requests_per_day, ai_generations_per_month,
     resume_analysis_limit, interview_eval_limit, available_languages, available_modes, model_priority)
VALUES
    ('free', 'Free', 0, 200, 100, 1, 5,
     ARRAY['Java','Python','TypeScript'],
     ARRAY['swipe','test'],
     'standard'),
    ('pro',  'Pro',  9, 1000, 1000, 10, 100,
     ARRAY['Java','Python','TypeScript'],
     ARRAY['swipe','test','bug-hunting','blitz','mock-interview','concept-linker','code-completion'],
     'quality'),
    ('admin', 'Admin (Unlimited)', 0, 99999, 99999, 9999, 9999,
     ARRAY['Java','Python','TypeScript'],
     ARRAY['swipe','test','bug-hunting','blitz','mock-interview','concept-linker','code-completion'],
     'quality')
ON CONFLICT (id) DO UPDATE SET
    name                     = EXCLUDED.name,
    price_monthly            = EXCLUDED.price_monthly,
    requests_per_day         = EXCLUDED.requests_per_day,
    ai_generations_per_month = EXCLUDED.ai_generations_per_month,
    resume_analysis_limit    = EXCLUDED.resume_analysis_limit,
    interview_eval_limit     = EXCLUDED.interview_eval_limit,
    available_languages      = EXCLUDED.available_languages,
    available_modes          = EXCLUDED.available_modes,
    model_priority           = EXCLUDED.model_priority;

-- ─── 6. User subscriptions ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id               SERIAL PRIMARY KEY,
    user_id          BIGINT      NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    plan_id          VARCHAR(50) NOT NULL REFERENCES subscription_plans(id),
    status           VARCHAR(20) NOT NULL DEFAULT 'active',
    expires_at       TIMESTAMP,
    payment_id       VARCHAR(255),
    payment_provider VARCHAR(50),
    cancelled_at     TIMESTAMP,
    created_at       TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, plan_id, payment_id)
);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id, status);

-- ─── 7. User rate limits ──────────────────────────────────────────
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

-- ─── 8. Analytics events ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
    id           SERIAL PRIMARY KEY,
    user_id      BIGINT,
    event_type   VARCHAR(50),
    endpoint     VARCHAR(200),
    latency_ms   INTEGER,
    model        VARCHAR(100),
    cache_hit    BOOLEAN DEFAULT FALSE,
    token_usage  INTEGER,
    fallback_used BOOLEAN DEFAULT FALSE,
    metadata     JSONB,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);

-- ─── 9. Sample Python questions ───────────────────────────────────
INSERT INTO questions (category, difficulty, language, question_text, short_answer) VALUES
('Python Core', 'Junior',  'Python', 'В чём разница между list и tuple в Python?',             'list — изменяемый (mutable), tuple — неизменяемый (immutable). Tuple быстрее и может быть ключом dict.'),
('Python Core', 'Junior',  'Python', 'Что такое GIL в Python?',                                'Global Interpreter Lock — мьютекс, позволяющий только одному потоку выполнять Python байт-код одновременно. Ограничивает параллелизм для CPU-задач.'),
('Python Core', 'Middle',  'Python', 'Чем отличается __str__ от __repr__?',                    '__str__ — для пользователя (читаемо). __repr__ — для разработчика (однозначно), используется в REPL.'),
('Python Core', 'Middle',  'Python', 'Что такое декораторы в Python?',                         'Функции, оборачивающие другие функции для добавления поведения без изменения кода. Используют @синтаксис.'),
('Python Core', 'Senior',  'Python', 'Как работают генераторы и yield?',                       'Генератор — функция с yield, возвращающая итератор. Ленивое вычисление экономит память для больших данных.'),
('Collections',  'Junior', 'Python', 'Чем dict отличается от defaultdict?',                    'defaultdict автоматически создаёт значение по умолчанию для отсутствующего ключа, избегая KeyError.'),
('OOP',          'Middle', 'Python', 'Что такое MRO в Python?',                                 'Method Resolution Order — порядок поиска метода в иерархии классов. Определяется C3-линеаризацией.'),
('OOP',          'Senior', 'Python', 'Что такое метаклассы?',                                   'Классы классов — определяют поведение создания классов. type — базовый метакласс в Python.')
ON CONFLICT DO NOTHING;

-- ─── 10. Sample TypeScript questions ──────────────────────────────
INSERT INTO questions (category, difficulty, language, question_text, short_answer) VALUES
('TypeScript Core', 'Junior', 'TypeScript', 'В чём разница между interface и type в TypeScript?',  'interface — расширяемый, поддерживает declaration merging. type — более гибкий, поддерживает union/intersection/mapped types.'),
('TypeScript Core', 'Junior', 'TypeScript', 'Что такое Union и Intersection типы?',                'Union (A | B) — одно из. Intersection (A & B) — все свойства обоих типов одновременно.'),
('TypeScript Core', 'Middle', 'TypeScript', 'Что такое Generics в TypeScript?',                   'Параметризованные типы, позволяющие писать переиспользуемый типизированный код: function id<T>(x: T): T.'),
('TypeScript Core', 'Middle', 'TypeScript', 'Что такое readonly и const в TypeScript?',            'const — для переменных (значение нельзя переприсвоить). readonly — для свойств объектов/классов.'),
('TypeScript Core', 'Senior', 'TypeScript', 'Что такое Mapped Types?',                             'Типы, создаваемые на основе других типов путём итерации ключей: { [K in keyof T]: T[K] }.'),
('TypeScript Core', 'Senior', 'TypeScript', 'Что такое Conditional Types?',                        'Типы, зависящие от условия: T extends U ? X : Y. Позволяют создавать гибкие утилитарные типы.'),
('OOP',            'Middle', 'TypeScript', 'Чем abstract class отличается от interface в TS?',    'abstract class может иметь реализацию и состояние. interface — только контракт. Класс может имплементировать несколько interface.')
ON CONFLICT DO NOTHING;

-- ─── Done ──────────────────────────────────────────────────────────
SELECT 'Migration complete!' as status;
SELECT language, COUNT(*) as total FROM questions GROUP BY language ORDER BY language;

-- ══════════════════════════════════════════════════════════════════
--  PATCH: Fix subscription UNIQUE constraint + clear bad AI cache
-- ══════════════════════════════════════════════════════════════════

-- ── Fix user_subscriptions UNIQUE constraint ───────────────────────────
-- The old UNIQUE(user_id, plan_id, status) prevents having more than one
-- cancelled subscription per plan per user, which breaks re-subscribing.
-- Replace it with a partial unique index that only enforces uniqueness
-- for ACTIVE subscriptions (one active subscription per user at a time).

ALTER TABLE user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_plan_id_status_key;
DROP INDEX IF EXISTS idx_user_subs_user;

-- Only one active subscription per user at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subs_one_active
  ON user_subscriptions(user_id)
  WHERE status = 'active';

-- Fast lookup by user + status
CREATE INDEX IF NOT EXISTS idx_user_subs_user_status
  ON user_subscriptions(user_id, status);

-- ── Clear bad AI cache entries (prose responses from v1 prompts) ───────
-- PROMPT_VERSION bumped to 'v2' so these are no longer served,
-- but deleting them frees space and prevents confusion.
DELETE FROM ai_cache WHERE prompt_version = 'v1';

-- ── Confirm ────────────────────────────────────────────────────────────
SELECT 'Constraint + cache patch applied!' AS status;
