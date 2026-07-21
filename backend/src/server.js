import * as Sentry from "@sentry/node";
import crypto from 'crypto';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import expressRateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import pool, { rbPool } from './config/database.js';
import { resolveAuth, upsertUser, issueEmailCode, verifyEmailCode } from './utils/authProviders.js';
import { evaluateInterviewAnswer, analyzeResume, checkCache } from './services/aiService.js';
import { enqueueJob } from './services/queueService.js';
import { getAvailableLanguages } from './services/languageRegistry.js';
import { requestLogger, validateBody, sanitizeBody } from './middleware/logging.js';
import { rateLimit, requireEntitlement } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { billingService } from './services/billingService.js';
import { sendStarsInvoice, getStarsAmount, answerPreCheckout, sendTelegramMessage, activateStarsSubscription } from './services/billing/starsService.js';
import { createTonInvoice, getUserPendingInvoice, pollPendingInvoices } from './services/billing/tonService.js';
import { isUkassaEnabled, createUkassaPayment, handleUkassaEvent, verifyUkassaSignature } from './services/billing/ukassaService.js';
import { metricsService } from './services/metricsService.js';
import { referralService } from './services/referralService.js';
import { updateMastery, getDueCount } from './services/questionService.js';
import jwt from 'jsonwebtoken';
import { authMiddleware, requireAdmin } from './middleware/auth.js';
import ADMIN_IDS from './config/admin.js';
import redis, { isConnected as isRedisConnected } from './config/redis.js';
import logger from './config/logger.js';
import { PLANS_LIST } from './config/plans.js';

dotenv.config();

if (process.env.NODE_ENV !== 'test' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16)) {
  console.error('FATAL: JWT_SECRET must be at least 16 characters long');
  process.exit(1);
}

// ─── Production pre-flight checks ─────────────────────────────────────
// Fail-fast on missing critical configuration so mis-deploys are obvious
// instead of silently serving broken auth/payments.
if (process.env.NODE_ENV === 'production') {
  const critical = ['DATABASE_URL', 'BOT_TOKEN', 'JWT_SECRET', 'TELEGRAM_WEBHOOK_SECRET', 'OPENROUTER_API_KEY'];
  const missing = critical.filter(k => !process.env[k]);
  if (missing.length) {
    logger.error({ missing }, '⚠️ Production environment is missing critical variables');
  }
  if (!process.env.ALLOWED_ORIGINS) {
    logger.warn('ALLOWED_ORIGINS is not set — CORS will reject all non-dev origins in production');
  }
  if (process.env.NODE_ENV === 'production' && process.env.OPENROUTER_API_KEY) {
    logger.info('✅ Production secrets present');
  }
}

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 0.1,
});

const app = express();
app.use(helmet());
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV === 'development';
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
);

// Snapshot of the consent terms shown at signup. Stored alongside each lead so
// we can later prove *what* the subject agreed to (Belarus data-protection:
// the fact and content of consent must be demonstrable). Bump the version when
// the privacy policy changes.
const WAITLIST_CONSENT_TEXT = 'Согласие на обработку email для рассылок по Закону РБ «Об информации…» (Политика: /privacy.html, v1, 2026).';


app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.has(origin) || isDev) return cb(null, true);
    logger.warn({ origin }, 'CORS blocked');
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
}));

// Global rate limiting to prevent DDoS
const globalLimiter = expressRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per `window`
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests, please try again later.' }
});

// Apply the rate limiting middleware to all requests
app.use(globalLimiter);
// ─── Stripe Webhook (MUST be before express.json) ─────────────────────
// NOTE: Stripe is not the active payment provider (Stars is).
// This endpoint is a placeholder. If Stripe is enabled, import the SDK:
// Capture the RAW body for the YooKassa webhook so we can verify its
// HMAC-SHA256 signature. This MUST be registered before the global
// express.json() below — otherwise the global parser sets req._body and
// the webhook's own `verify` callback never fires.
app.use('/api/billing/ukassa/webhook', express.json({
  type: ['application/json', 'application/*+json'],
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));

app.use(express.json({ limit: '1mb' }));
app.use(sanitizeBody);
app.use(requestLogger);

// ─── Health ──────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  let dbOk = false;
  try {
    await pool.query('SELECT 1');
    dbOk = true;
  } catch (err) {
    logger.error({ err }, 'Health check: Postgres unreachable');
  }
  const redisOk = await isRedisConnected();
  const healthy = dbOk && redisOk;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    db: dbOk ? 'connected' : 'disconnected',
    redis: redisOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// ─── Sentry Debug ────────────────────────────────────────────────────
app.get('/debug-sentry', (_req, _res) => {
  throw new Error('Sentry backend test error');
});
// ─── Languages ───────────────────────────────────────────────────────
app.get('/api/languages', (req, res) => res.json({ languages: getAvailableLanguages() }));

// ─── Categories (language-aware) ─────────────────────────────────────
app.get('/api/categories', async (req, res) => {
  try {
    const language = req.query.language || 'Java';
    const result = await pool.query(
      `SELECT DISTINCT category, COUNT(*) as count FROM questions WHERE language = $1 GROUP BY category ORDER BY category`,
      [language]
    );
    res.json({ language, categories: result.rows.map(r => ({ name: r.category, count: parseInt(r.count) })) });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching categories');
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ─── Auth ────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { provider, initData, idToken, email, code, referralId } = req.body;

    // Resolve identity from the chosen provider (telegram / google / email).
    const userData = await resolveAuth(
      { provider, initData, idToken, email, code },
      isDev
    );
    if (!userData) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { user, token } = await upsertUser(userData, referralId, (payload) =>
      jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' })
    );

    // Auto-grant admin plan if user is in ADMIN_TELEGRAM_IDS
    if (ADMIN_IDS.has(String(user.telegram_id))) {
      try {
        await pool.query(
          `INSERT INTO user_subscriptions (user_id, plan_id, status, expires_at, payment_id, payment_provider)
           VALUES ($1, 'admin', 'active', NULL, 'admin_grant', 'system')
           ON CONFLICT DO NOTHING`,
          [user.telegram_id]
        ).catch(async (grantErr) => {
          logger.error({ err: grantErr, userId: user.telegram_id }, 'Admin grant (admin plan) failed, trying pro');
          // Try 'pro' plan if 'admin' plan doesn't exist
          await pool.query(
            `INSERT INTO user_subscriptions (user_id, plan_id, status, expires_at, payment_id, payment_provider)
             VALUES ($1, 'pro', 'active', NULL, 'admin_grant', 'system')
             ON CONFLICT DO NOTHING`,
            [user.telegram_id]
          ).catch(err => logger.error({ err, userId: user.telegram_id }, 'Admin grant (pro fallback) failed'));
        });
        await pool.query(
          `UPDATE users SET subscription_plan = 'pro' WHERE telegram_id = $1`,
          [user.telegram_id]
        ).catch(err => logger.error({ err, userId: user.telegram_id }, 'Failed to update admin subscription plan'));
      } catch (err) {
        logger.error({ err, userId: user.telegram_id }, 'Admin auto-grant failed');
      }
    }

    // Background warm-up: pre-enqueue AI generation jobs for this user's next questions
    // This is fire-and-forget to keep login latency low.
    (async () => {
      try {
        const preload = await pool.query(
          `SELECT q.id, q.question_text, q.short_answer, q.language FROM questions q
           LEFT JOIN user_progress up ON q.id = up.question_id AND up.user_id = $1
           WHERE up.id IS NULL OR up.status = 'unknown' LIMIT 5`,
          [user.telegram_id]
        );
        for (const q of preload.rows) {
          enqueueJob('explanation', {
            questionId: q.id,
            questionText: q.question_text,
            shortAnswer: q.short_answer,
            userId: user.telegram_id,
            language: q.language || 'Java'
          }).catch(err => logger.error({ err }, 'Failed to enqueue preload job'));
        }
      } catch (e) {
        logger.error({ err: e, userId: user.telegram_id }, 'Preload error');
      }
    })();

    // Resolve plan
    let plan = 'free';
    if (ADMIN_IDS.has(String(user.telegram_id))) {
      plan = 'admin'; // always admin regardless of DB
    } else {
      try {
        const subResult = await pool.query(
          `SELECT plan_id FROM user_subscriptions WHERE user_id = $1 AND status = 'active'
           AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
           ORDER BY created_at DESC LIMIT 1`,
          [user.telegram_id]
        );
        if (subResult.rows.length > 0) plan = subResult.rows[0].plan_id;
      } catch (err) {
        logger.error({ err, userId: user.telegram_id }, 'Failed to resolve subscription plan');
      }
    }

    // Resolve plan entitlements (available modes/languages) so the client can
    // render correct locks and the paywall without re-deriving plan rules.
    const ALL_MODES = ['swipe', 'test', 'bug-hunting', 'blitz', 'mock-interview', 'concept-linker', 'code-completion', 'review'];
    const ALL_LANGS = ['Java', 'Python', 'TypeScript'];
    let availableModes = ['swipe', 'test'];
    let availableLanguages = ALL_LANGS;
    if (plan === 'admin' || plan === 'pro') {
      availableModes = ALL_MODES;
    }
    if (plan !== 'admin') {
      try {
        const planRes = await pool.query(
          'SELECT available_modes, available_languages FROM subscription_plans WHERE id = $1',
          [plan]
        );
        if (planRes.rows.length > 0) {
          const normalize = (v) => Array.isArray(v) ? v : (typeof v === 'string' ? v.replace(/[{}"]/g, '').split(',') : v);
          if (planRes.rows[0].available_modes) availableModes = normalize(planRes.rows[0].available_modes);
          if (planRes.rows[0].available_languages) availableLanguages = normalize(planRes.rows[0].available_languages);
        }
      } catch { /* keep defaults */ }
    }

    res.json({
      success: true,
      token,
      user: {
        telegram_id: user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        resume_text: user.resume_text,
        parsed_resume_data: user.parsed_resume_data,
        language: user.language || 'Java',
        plan,
        available_modes: availableModes,
        available_languages: availableLanguages,
        // NOTE: is_admin is for UI display purposes ONLY. 
        // Security checks MUST be performed server-side using requireAdmin middleware.
        is_admin: ADMIN_IDS.has(String(user.telegram_id)),
        auth_provider: user.auth_provider || 'telegram',
      },
    });

    // Track login
    metricsService.trackEvent(user.telegram_id, 'user_login', { plan, provider: user.auth_provider || 'telegram' });
  } catch (error) {
    logger.error({ err: error }, 'Error in /auth/login');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Protected Routes (JWT required) ──────────────────────────────────
app.use('/api', (req, res, next) => {
  // Exclude auth login and languages from global auth.
  // Also exclude inbound webhooks: they are authenticated by their own
  // secret-token / signature checks (Telegram Bot API, YooKassa), not JWT.
  if (
    req.path === '/auth/login' ||
    req.path === '/languages' ||
    req.path.startsWith('/demo/') ||
    req.path.startsWith('/waitlist') ||
    req.path.startsWith('/bot/webhook') ||
    req.path.startsWith('/billing/ukassa/webhook')
  ) {
    return next();
  }
  authMiddleware(req, res, next);
});

// ─── Public demo (zero-login) ─────────────────────────────────────────
// Top of the funnel: let a visitor try 10 real questions before signing up.
// No auth, no progress tracking, no rate-limit tied to a user — just a taste
// of the product so the "Start free" click leads straight into the game.
app.get('/api/demo/questions', async (req, res) => {
  try {
    const language = String(req.query.language || 'Java');
    const limit = Math.min(parseInt(req.query.limit) || 10, 15);
    // Random-but-cheap sampling; a per-request seed keeps repeat visits fresh.
    const seed = String(req.query.seed || Math.random().toString(36).slice(2));
    const { rows } = await pool.query(
      `SELECT id, category, difficulty, question_text, short_answer, language
       FROM questions
       WHERE is_active = TRUE AND language = $1
         AND question_text IS NOT NULL AND short_answer IS NOT NULL
       ORDER BY md5(id::text || $2) ASC
       LIMIT $3`,
      [language, seed, limit]
    );
    const questions = rows.map((r) => ({
      id: r.id,
      category: r.category,
      difficulty: r.difficulty,
      question: r.question_text,
      shortAnswer: r.short_answer,
      language: r.language || 'Java',
    }));
    res.json({ questions, meta: { language, total: questions.length } });
  } catch (err) {
    logger.error({ err }, 'Error in /demo/questions');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Public percentile for the demo result screen (no auth). Mirrors
// /api/stats/percentile but callable before sign-up.
app.get('/api/demo/percentile', async (req, res) => {
  try {
    const { language = 'Java', score } = req.query;
    const currentScore = parseInt(score) || 0;
    const statsResult = await pool.query(
      `WITH user_scores AS (
         SELECT up.user_id, COUNT(*) as score
         FROM user_progress up
         JOIN questions q ON q.id = up.question_id
         WHERE q.language = $1 AND up.status = 'known'
           AND up.updated_at > NOW() - INTERVAL '30 days'
         GROUP BY up.user_id
       )
       SELECT COUNT(*) FILTER (WHERE score <= $2) as below_count,
              COUNT(*) as total_count
       FROM user_scores`,
      [language, currentScore]
    );
    const { below_count, total_count } = statsResult.rows[0];
    const percentile = total_count > 0
      ? Math.round((parseInt(below_count || 0) / parseInt(total_count || 1)) * 100)
      : 99;
    res.json({ percentile });
  } catch (err) {
    logger.error({ err }, 'Demo percentile error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Waitlist / lead capture (public, Belarus-compliant) ────────────────
// Email-only lead capture with explicit, informed consent. No auth. IP is
// hashed (not stored raw) to minimize PII. Unsubscribe performs erasure.
function isValidEmailAddress(value) {
  return typeof value === 'string' &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function hashClientIp(req) {
  const raw = (req.headers['x-forwarded-for']?.split(',')[0]?.trim())
    || req.socket?.remoteAddress
    || '';
  if (!raw) return null;
  // Salt with JWT_SECRET so the hash can't be reversed even if the DB leaks.
  return crypto.createHash('sha256').update(raw + (process.env.JWT_SECRET || '')).digest('hex');
}

app.post('/api/waitlist',
  validateBody({ email: { required: true, type: 'string', maxLength: 254 } }),
  async (req, res) => {
  try {
    const { email, lang, source, consent, region, timezone, telegram, interest } = req.body;
    if (!isValidEmailAddress(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    // Explicit, informed consent is mandatory under Belarus data law.
    if (consent !== true) {
      return res.status(400).json({ error: 'Consent is required to subscribe.' });
    }

    // ── Belarus data-localization routing ─────────────────────────────────
    // Under Закон РБ «Об информации…», personal data of RB citizens must be
    // stored on servers located in the Republic of Belarus. We route RB-resident
    // PII to the RB-localized datastore (rbPool) when RB_DATABASE_URL is set.
    // Only if NO RB store is configured AND ALLOW_RB_PII is unset do we refuse
    // the cross-border write (HTTP 451) — so the gate never triggers once RB
    // hosting is provisioned.
    const likelyRb =
      region === 'BY' || region === 'RB' || timezone === 'Europe/Minsk';
    const store = (likelyRb && rbPool) ? rbPool : pool;
    if (likelyRb && !rbPool && !process.env.ALLOW_RB_PII) {
      return res.status(451).json({
        error: 'not_localized',
        message:
          'Сбор персональных данных граждан РБ временно приостановлен: хранение данных должно быть локализовано в РБ. Напишите нам в Telegram-бот, чтобы получать обновления.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const ipHash = hashClientIp(req);
    await store.query(
      `INSERT INTO waitlist (email, lang, source, consent_granted, consent_at, consent_text, ip_hash, user_agent, region, likely_rb, telegram, interest)
       VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (email) DO UPDATE SET
         consent_granted = TRUE,
         consent_at = CURRENT_TIMESTAMP,
         unsubscribed_at = NULL,
         consent_text = $4,
         ip_hash = COALESCE($5, waitlist.ip_hash),
         source = COALESCE($3, waitlist.source),
         region = COALESCE($7, waitlist.region),
         likely_rb = COALESCE($8, waitlist.likely_rb)`,
      [
        cleanEmail,
        String(lang || 'ru').slice(0, 10),
        String(source || 'landing').slice(0, 50),
        WAITLIST_CONSENT_TEXT,
        ipHash,
        String(req.headers['user-agent'] || '').slice(0, 500),
        String(region || timezone || '').slice(0, 8),
        likelyRb,
        telegram ? String(telegram).slice(0, 1000) : null,
        interest ? String(interest).slice(0, 30) : null,
      ]
    );
    res.json({ success: true, message: 'Subscribed.' });
    metricsService.trackEvent(null, 'waitlist_subscribe', { lang, source, likelyRb });
    } catch (err) {
      logger.error({ err }, 'Waitlist subscribe error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Withdraw consent / right to erasure. Pseudonymizes the email and nulls PII so
// the subject can no longer be contacted or identified from this record.
app.post('/api/waitlist/unsubscribe',
  validateBody({ email: { required: true, type: 'string', maxLength: 254 } }),
  async (req, res) => {
    try {
      const { email } = req.body;
      if (!isValidEmailAddress(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }
      const cleanEmail = email.trim().toLowerCase();
      // Erase from both stores so the subject can't be contacted regardless of
      // which datastore their record landed in.
      const stores = rbPool ? [pool, rbPool] : [pool];
      let erased = 0;
      for (const s of stores) {
        const result = await s.query(
          `UPDATE waitlist
           SET unsubscribed_at = CURRENT_TIMESTAMP,
               consent_granted = FALSE,
               email = 'anon_' || id::text || '@erased.local',
               ip_hash = NULL,
               user_agent = NULL,
               consent_text = NULL
           WHERE email = $1 AND unsubscribed_at IS NULL
           RETURNING id`,
          [cleanEmail]
        );
        erased += result.rowCount || 0;
      }
      res.json({ success: true, erased: erased > 0 });
    } catch (err) {
      logger.error({ err }, 'Waitlist unsubscribe error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── Email magic-link (web auth) ────────────────────────────────────
app.post('/api/auth/email/send', async (req, res) => {
  try {
    const { email } = req.body;
    await issueEmailCode(email);
    res.json({ success: true, message: 'Code sent' });
  } catch (err) {
    logger.error({ err }, 'Email code issue failed');
    res.status(400).json({ error: err.message || 'Failed to send code' });
  }
});

app.post('/api/auth/email/verify', async (req, res) => {
  try {
    const { email, code, referralId } = req.body;
    const userData = verifyEmailCode(email, code);
    if (!userData) return res.status(401).json({ error: 'Invalid code' });

    const { user, token } = await upsertUser(userData, referralId, (payload) =>
      jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' })
    );
    res.json({ success: true, token, user: { telegram_id: user.telegram_id, email: user.email, plan: user.subscription_plan } });
  } catch (err) {
    logger.error({ err }, 'Email verify failed');
    res.status(401).json({ error: err.message || 'Invalid code' });
  }
});

// ─── Admin Routes (requireAdmin required) ─────────────────────────────
app.use('/api/admin', requireAdmin);

// List active (consented, not unsubscribed) waitlist leads for export/mailing.
app.get('/api/admin/waitlist', async (req, res) => {
  try {
    const stores = rbPool ? [pool, rbPool] : [pool];
    let rows = [];
    for (const s of stores) {
      const { rows: r } = await s.query(
        `SELECT id, email, lang, source, region, likely_rb, telegram, interest, consent_at, created_at
         FROM waitlist
         WHERE unsubscribed_at IS NULL AND consent_granted = TRUE
         ORDER BY created_at DESC
         LIMIT 5000`
      );
      rows = rows.concat(r);
    }
    // De-dupe by email (a lead could theoretically exist in both during migration).
    const seen = new Set();
    rows = rows.filter((l) => (seen.has(l.email) ? false : seen.add(l.email)));
    res.json({ count: rows.length, leads: rows });
  } catch (err) {
    logger.error({ err }, 'Admin waitlist list error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Hard-delete a single lead (full purge on subject's request).
app.delete('/api/admin/waitlist/:email', async (req, res) => {
  try {
    const email = String(req.params.email || '').trim().toLowerCase();
    if (!isValidEmailAddress(email)) return res.status(400).json({ error: 'Invalid email' });
    const stores = rbPool ? [pool, rbPool] : [pool];
    let deleted = 0;
    for (const s of stores) {
      const result = await s.query('DELETE FROM waitlist WHERE email = $1', [email]);
      deleted += result.rowCount || 0;
    }
    res.json({ success: true, deleted });
  } catch (err) {
    logger.error({ err }, 'Admin waitlist delete error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Preferences ─────────────────────────────────────────────────────
app.get('/api/preferences', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT selected_categories, selected_language FROM user_preferences WHERE telegram_id = $1',
      [req.userId]
    );
    res.json({
      selectedCategories: rows[0]?.selected_categories || [],
      selectedLanguage: rows[0]?.selected_language || 'Java',
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

app.post('/api/preferences', validateBody({ categories: { required: true } }), async (req, res) => {
  try {
    const { categories, language } = req.body;
    const userId = req.userId;
    await pool.query(
      `INSERT INTO user_preferences (telegram_id, selected_categories, selected_language, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (telegram_id) DO UPDATE SET
         selected_categories = $2,
         selected_language = $3,
         updated_at = NOW()`,
      [userId, categories, language || 'Java']
    );
    if (language) {
      await pool.query('UPDATE users SET language = $1 WHERE telegram_id = $2', [language, userId]).catch(() => { });
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// ─── Language switch (updates preference, clears category filter for new lang) ──
app.post('/api/preferences/language', validateBody({ language: { required: true } }), async (req, res) => {
  try {
    const { language } = req.body;
    const userId = req.userId;
    // Clear categories so the new language shows all questions (not filtered by old lang's cats)
    await pool.query(
      `INSERT INTO user_preferences (telegram_id, selected_categories, selected_language, updated_at)
       VALUES ($1, ARRAY[]::TEXT[], $2, NOW())
       ON CONFLICT (telegram_id) DO UPDATE SET
         selected_categories = ARRAY[]::TEXT[],
         selected_language = $2,
         updated_at = NOW()`,
      [userId, language]
    );
    await pool.query('UPDATE users SET language = $1 WHERE telegram_id = $2', [language, userId])
      .catch((err) => logger.error({ err, userId }, 'Failed to sync language to users table'));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Error updating language preference');
    res.status(500).json({ error: 'Failed to update language' });
  }
});

// ─── Question Feed ────────────────────────────────────────────────────
app.get('/api/questions/feed', requireEntitlement('mode'), async (req, res) => {
  try {
    const userId = req.userId;
    const language = req.query.language || 'Java';
    const mode = req.query.mode || 'swipe';
    const limit = Math.min(parseInt(req.query.limit) || 5, 10);
    const cursor = Math.max(0, parseInt(req.query.cursor) || 0);
    const seed = String(req.query.seed || 'default');

    const prefsResult = await pool.query(
      'SELECT selected_categories, selected_language FROM user_preferences WHERE telegram_id = $1',
      [userId]
    );
    const prefs = prefsResult.rows[0];
    const savedLang = prefs?.selected_language || 'Java';
    const selectedCategories = (savedLang === language) ? (prefs?.selected_categories || []) : [];

    // Test options are generated lazily on the client (see TestMode), so we
    // must NOT filter out questions that don't have options yet — otherwise
    // a fresh database would show an empty test feed forever.

    // Optional difficulty filter (Junior / Middle / Senior).
    const difficulties = req.query.difficulties
      ? (Array.isArray(req.query.difficulties) ? req.query.difficulties : [req.query.difficulties])
      : null;

    // Stable per-session ordering via md5(seed) instead of RANDOM(), which
    // reshuffled on every page and caused duplicate questions across pages.
    // Build WHERE + params dynamically so placeholders stay correct with the
    // optional category / difficulty filters.
    const where = [
      'q.is_active = TRUE',
      "(up.id IS NULL OR up.status = 'unknown' OR qm.next_review <= CURRENT_DATE)",
      'q.language = $2',
    ];
    const params = [userId, language];
    let p = 3;
    if (selectedCategories.length > 0) { where.push(`q.category = ANY($${p})`); params.push(selectedCategories); p++; }
    if (difficulties && difficulties.length) { where.push(`q.difficulty = ANY($${p})`); params.push(difficulties); p++; }
    const seedParam = `$${p++}`, limitParam = `$${p++}`, cursorParam = `$${p++}`;
    params.push(seed, limit, cursor);

    const selectCols = `
      q.id, q.category, q.difficulty, q.question_text, q.short_answer,
      q.options, q.bug_hunting_data, q.blitz_data, q.code_completion_data, q.language,
      COALESCE(qm.next_review, '1970-01-01'::DATE) as review_date,
      up.status as prev_status`;

    const baseQuery = `
      SELECT ${selectCols}
      FROM questions q
      LEFT JOIN user_progress up ON q.id = up.question_id AND up.user_id = $1
      LEFT JOIN question_mastery qm ON q.id = qm.question_id AND qm.user_id = $1
      WHERE ${where.join(' AND ')}
      ORDER BY 
        CASE 
          WHEN qm.next_review <= CURRENT_DATE THEN 0
          WHEN up.id IS NULL THEN 1
          ELSE 2
        END ASC,
        review_date ASC,
        md5(q.id::text || ${seedParam}) ASC
      LIMIT ${limitParam} OFFSET ${cursorParam}`;

    const mapRow = (row) => ({
      id: row.id,
      category: row.category,
      difficulty: row.difficulty,
      question: row.question_text,
      shortAnswer: row.short_answer,
      options: row.options || [],
      bugHuntingData: row.bug_hunting_data || null,
      blitzData: row.blitz_data || null,
      codeCompletionData: row.code_completion_data || null,
      language: row.language || 'Java',
      prevStatus: row.prev_status || null,
    });

    const result = await pool.query(baseQuery, params);
    let questions = result.rows.map(mapRow);

    // Endless feed: if the new + due + unseen pool is exhausted (e.g. the user
    // has marked everything known and no reviews are due), top up with already
    // known cards for a refresher so the deck never feels "empty".
    if (questions.length < limit) {
      const fWhere = ['q.is_active = TRUE', "q.language = $2", "up.status = 'known'"];
      const fParams = [userId, language];
      let fp = 3;
      if (selectedCategories.length > 0) { fWhere.push(`q.category = ANY($${fp})`); fParams.push(selectedCategories); fp++; }
      if (difficulties && difficulties.length) { fWhere.push(`q.difficulty = ANY($${fp})`); fParams.push(difficulties); fp++; }
      const fSeed = `$${fp++}`, fOffset = `$${fp++}`, fLimit = `$${fp++}`;
      fParams.push(seed, cursor, limit - questions.length);
      const fillerQuery = `
        SELECT ${selectCols}
        FROM questions q
        LEFT JOIN user_progress up ON q.id = up.question_id AND up.user_id = $1
        LEFT JOIN question_mastery qm ON q.id = qm.question_id AND qm.user_id = $1
        WHERE ${fWhere.join(' AND ')}
        ORDER BY md5(q.id::text || ${fSeed}) ASC
        OFFSET ${fOffset}
        LIMIT ${fLimit}`;
      const filler = await pool.query(fillerQuery, fParams);
      const seen = new Set(questions.map(q => q.id));
      for (const row of filler.rows) {
        if (!seen.has(row.id)) questions.push(mapRow(row));
      }
    }

    const hasMore = questions.length === limit;
    res.json({
      questions,
      meta: { language, mode, total: questions.length, cursor, nextCursor: cursor + questions.length, hasMore, refresher: questions.length < limit }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error in /questions/feed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Weak / Mistakes review deck (Pro) ────────────────────────────────
// Returns the user's "unknown" questions so they can actively rehearse the
// topics they keep getting wrong. Gated to Pro via the 'review' entitlement.
app.get('/api/questions/weak', requireEntitlement('mode', 'review'), async (req, res) => {
  try {
    const userId = req.userId;
    const language = req.query.language || 'Java';
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const result = await pool.query(
      `SELECT q.id, q.category, q.difficulty, q.question_text, q.short_answer,
              q.cached_explanation, q.language
       FROM user_progress up
       JOIN questions q ON q.id = up.question_id
       WHERE up.user_id = $1 AND up.status = 'unknown'
         AND q.language = $2 AND q.is_active = TRUE
       ORDER BY up.updated_at DESC
       LIMIT $3`,
      [userId, language, limit]
    );

    const questions = result.rows.map(r => ({
      id: r.id,
      category: r.category,
      difficulty: r.difficulty,
      question: r.question_text,
      shortAnswer: r.short_answer,
      explanation: r.cached_explanation || null,
      language: r.language || 'Java',
    }));

    res.json({ questions, meta: { count: questions.length, language } });
  } catch (error) {
    logger.error({ err: error }, 'Error in /questions/weak');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── AI Generation (cache-first, non-blocking) ────────────────────────
app.post('/api/generate/:type', rateLimit('ai_generation'), async (req, res) => {
  try {
    const { type } = req.params;
    const { questionText, shortAnswer, category, questionId, language = 'Java' } = req.body;
    const userId = req.userId;
    if (!questionText) return res.status(400).json({ error: 'questionText is required' });

    const modeMap = { explanation: 'explanation', test: 'test', blitz: 'blitz', bug: 'bug', code: 'code' };
    const mode = modeMap[type];
    if (!mode) return res.status(400).json({ error: 'Invalid generation type' });

    const cachedRaw = await checkCache(questionText, mode, null, language);
    if (cachedRaw) {
      // Bug 2 fix: parse JSON modes before sending so the client gets a real object,
      // not a string. Text modes (explanation) are sent as-is.
      const JSON_MODES = new Set(['test', 'bug', 'blitz', 'code']);
      let data = cachedRaw;
      if (JSON_MODES.has(mode)) {
        try { data = JSON.parse(cachedRaw); } catch { /* keep raw string */ }
      }
      return res.json({ status: 'ready', data });
    }

    // Include questionId in job payload so worker can backfill questions table
    await enqueueJob(type, { questionText, shortAnswer, category, userId, questionId, language });
    res.json({ status: 'pending' });

    // Track generation request
    metricsService.trackEvent(userId, 'ai_generation_requested', { mode, questionId });
  } catch (err) {
    logger.error({ err }, 'Error in /api/generate/:type');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────

// Resolve AI-generated data for a question.
// Priority: questions table column (fast, backfilled by worker)
//           → ai_cache (slower, direct lookup)
//           → null (not yet generated)
async function resolveAIData(questionId, columnName, cacheMode) {
  // Whitelist AI data columns — callers pass constants today, but this
  // prevents any future refactor from opening a SQL injection path.
  const ALLOWED_AI_COLUMNS = new Set([
    'bug_hunting_data',
    'blitz_data',
    'code_completion_data',
  ]);
  if (!ALLOWED_AI_COLUMNS.has(columnName)) {
    logger.error({ columnName, questionId }, 'resolveAIData called with non-allowlisted column');
    return { data: null, question: null };
  }
  const qRes = await pool.query(
    `SELECT question_text, language, ${columnName} FROM questions WHERE id=$1`,
    [questionId]
  );
  if (!qRes.rows[0]) return { data: null, question: null };

  const row = qRes.rows[0];
  let data = row[columnName];

  if (!data) {
    // Fall back to ai_cache
    const cached = await checkCache(row.question_text, cacheMode, null, row.language || 'Java');
    if (cached) {
      try {
        data = JSON.parse(cached);
        // Opportunistically backfill so next hit is fast
        pool.query(`UPDATE questions SET ${columnName}=$1 WHERE id=$2`, [JSON.stringify(data), questionId]).catch(err => logger.error({ err, questionId }, 'Failed to backfill AI data'));
      } catch { data = null; }
    }
  }

  return { data, question: row };
}

// Wait (server-side) for the background worker to produce an explanation,
// polling the DB/Redis cache. Keeps the synchronous contract with clients
// while the heavy AI work runs in a separate worker process.
//
// SECURITY/PERF: this blocks the HTTP request (and a pg pool slot) for up to
// `maxMs`. To avoid exhausting the connection pool under load, server-side
// polling is DISABLED by default — the client already polls for the result
// (it retries on `pending`). Enable only for tightly-coupled deployments via
// EXPLANATION_SYNC_POLL=true, and keep maxMs modest.
async function waitForExplanation(questionText, questionId, language = 'Java', maxMs = 10000) {
  if (process.env.EXPLANATION_SYNC_POLL !== 'true') return null;
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      const { rows } = await pool.query('SELECT cached_explanation FROM questions WHERE id=$1', [questionId]);
      if (rows[0]?.cached_explanation) return rows[0].cached_explanation;

      const cached = await checkCache(questionText, 'explanation', null, language);
      if (cached) {
        pool.query('UPDATE questions SET cached_explanation=$1 WHERE id=$2', [cached, questionId])
          .catch((err) => logger.error({ err, questionId }, 'Failed to backfill cached explanation'));
        return cached;
      }
    } catch (err) {
      logger.error({ err, questionId }, 'waitForExplanation poll error');
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  return null;
}

// Local calendar date as 'YYYY-MM-DD' (server local time, not UTC).
function localDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Hard but honest daily cap on AI explanations for free users. Pro/premium/
// admin get unlimited. The counter resets automatically at local midnight via
// the per-row `ai_explain_date` comparison (no cron needed).
const FREE_DAILY_AI_EXPLAIN_LIMIT = parseInt(process.env.FREE_DAILY_AI_EXPLAIN_LIMIT || '5', 10);

async function checkDailyAiExplain(userId) {
  const today = localDateStr();
  // Upsert the row and reset the counter if the stored date is stale.
  await pool.query(
    `INSERT INTO user_rate_limits (user_id, ai_explanations_today, ai_explain_date)
     VALUES ($1, 0, $2)
     ON CONFLICT (user_id) DO UPDATE
       SET ai_explanations_today = CASE
             WHEN user_rate_limits.ai_explain_date = $2 THEN user_rate_limits.ai_explanations_today
             ELSE 0 END,
           ai_explain_date = $2`,
    [userId, today]
  );
  const { rows } = await pool.query(
    'SELECT ai_explanations_today FROM user_rate_limits WHERE user_id = $1',
    [userId]
  );
  const used = rows[0]?.ai_explanations_today || 0;
  if (used >= FREE_DAILY_AI_EXPLAIN_LIMIT) {
    return { allowed: false, used, limit: FREE_DAILY_AI_EXPLAIN_LIMIT };
  }
  await pool.query(
    'UPDATE user_rate_limits SET ai_explanations_today = ai_explanations_today + 1 WHERE user_id = $1',
    [userId]
  );
  return { allowed: true, used: used + 1, limit: FREE_DAILY_AI_EXPLAIN_LIMIT };
}

async function updateStreak(userId) {
  try {
    const { rows } = await pool.query(
      'SELECT current_streak, last_activity_date, longest_streak FROM users WHERE telegram_id = $1',
      [userId]
    );
    if (rows.length === 0) return null;

    const user = rows[0];
    // last_activity_date is a DATE column → already a 'YYYY-MM-DD' string in DB.
    // Use the server's local calendar day (not UTC) so the streak boundary
    // aligns with a real midnight rather than 00:00 UTC. True per-user-local
    // days would require storing the user's timezone (follow-up).
    const today = localDateStr();
    const lastActivity = user.last_activity_date || null;

    if (lastActivity === today) {
      return { current: user.current_streak, longest: user.longest_streak, increased: false };
    }

    let newStreak = 1;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = localDateStr(yesterday);

    if (lastActivity === yesterdayStr) {
      newStreak = user.current_streak + 1;
    }

    const newLongest = Math.max(user.longest_streak, newStreak);

    await pool.query(
      'UPDATE users SET current_streak = $1, last_activity_date = $2, longest_streak = $3 WHERE telegram_id = $4',
      [newStreak, today, newLongest, userId]
    );

    if (newStreak > user.current_streak) {
      metricsService.trackEvent(userId, 'streak_increased', { streak: newStreak });
    }

    return { current: newStreak, longest: newLongest, increased: newStreak > user.current_streak };
  } catch (err) {
    logger.error({ err, userId }, 'Failed to update streak');
    return null;
  }
}

async function recordProgress(userId, questionId, isCorrect) {
  const status = isCorrect ? 'known' : 'unknown';
  await pool.query(
    `INSERT INTO user_progress (user_id, question_id, status, updated_at)
     VALUES ($1,$2,$3,CURRENT_TIMESTAMP)
     ON CONFLICT (user_id, question_id) DO UPDATE
       SET status=EXCLUDED.status, updated_at=CURRENT_TIMESTAMP`,
    [userId, questionId, status]
  );
}

// ─── Swipe ────────────────────────────────────────────────────────────
app.post('/api/questions/swipe',
  validateBody({ questionId: { required: true }, status: { required: true, enum: ['known', 'unknown'] } }),
  async (req, res) => {
    try {
      const { questionId, status } = req.body;
      const userId = req.userId;
      await pool.query(
        `INSERT INTO user_progress (user_id, question_id, status, updated_at)
         VALUES ($1,$2,$3,CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, question_id) DO UPDATE
           SET status=EXCLUDED.status, updated_at=CURRENT_TIMESTAMP`,
        [userId, questionId, status]
      );

      // Update streak on every swipe
      const streakData = await updateStreak(userId);

      // Spaced Repetition: update mastery
      await updateMastery(userId, questionId, status === 'known' ? 5 : 0)
        .catch((err) => logger.error({ err, userId, questionId }, 'Failed to update question mastery'));

      res.json({ success: true, streak: streakData });

      // Track swipe
      metricsService.trackEvent(userId, 'question_swiped', { questionId, status });
    } catch (error) {
      logger.error({ err: error, path: req.path }, 'Unhandled error in route');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── Import guest progress (post-signup migration) ──────────────────────
// A visitor who played the zero-login demo has their known/unknown answers
// stored in localStorage. On sign-up the client flushes them here so the demo
// work isn't lost — turning "try it" straight into a seeded account.
app.post('/api/questions/import-progress', async (req, res) => {
  try {
    const userId = req.userId;
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 200) : [];

    const ids = [];
    const statuses = [];
    for (const it of items) {
      const qid = parseInt(it?.questionId, 10);
      const st = it?.status;
      if (Number.isInteger(qid) && (st === 'known' || st === 'unknown')) {
        ids.push(qid);
        statuses.push(st);
      }
    }

    if (ids.length === 0) return res.json({ success: true, imported: 0 });

    // JOIN questions so unknown/invalid ids are silently dropped (FK-safe).
    // DO NOTHING on conflict: never clobber real progress the user already has.
    const result = await pool.query(
      `INSERT INTO user_progress (user_id, question_id, status, updated_at)
       SELECT $1, g.qid, g.st, CURRENT_TIMESTAMP
       FROM unnest($2::int[], $3::progress_status[]) AS g(qid, st)
       JOIN questions q ON q.id = g.qid
       ON CONFLICT (user_id, question_id) DO NOTHING`,
      [userId, ids, statuses]
    );

    res.json({ success: true, imported: result.rowCount || 0 });
    metricsService.trackEvent(userId, 'guest_progress_imported', { count: result.rowCount || 0 });
  } catch (error) {
    logger.error({ err: error, path: req.path }, 'Error importing guest progress');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Undo Swipe ────────────────────────────────────────────────────────
app.delete('/api/questions/swipe/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.userId;
    // We only allow deleting the record to revert the 'known'/'unknown' status.
    // We don't revert streaks here to avoid abuse, but we remove the progress.
    await pool.query(
      'DELETE FROM user_progress WHERE user_id = $1 AND question_id = $2',
      [userId, questionId]
    );
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Undo swipe error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Report Question ───────────────────────────────────────────────────
app.post('/api/questions/:questionId/report', async (req, res) => {
  try {
    const { questionId } = req.params;
    const { reason, comment } = req.body;
    const userId = req.userId;

    await pool.query(
      'INSERT INTO question_reports (question_id, user_id, reason, comment) VALUES ($1, $2, $3, $4)',
      [questionId, userId, reason, comment]
    );

    // Check if question has 5+ unresolved reports
    const countRes = await pool.query(
      'SELECT COUNT(*) FROM question_reports WHERE question_id = $1 AND resolved = FALSE',
      [questionId]
    );
    const count = parseInt(countRes.rows[0].count);

    if (count >= 5) {
      await pool.query('UPDATE questions SET is_active = FALSE WHERE id = $1', [questionId]);

      // Get question text for notification
      const qRes = await pool.query('SELECT question_text FROM questions WHERE id = $1', [questionId]);
      const text = qRes.rows[0]?.question_text || 'Unknown';

      const adminMsg = `⚠️ Question ${questionId} has 5 reports.\n\nText: "${text}"\nIt has been automatically hidden from the deck. Review at Admin Panel.`;

      // Send to all admins
      for (const adminId of ADMIN_IDS) {
        sendTelegramMessage(adminId, adminMsg)
          .catch((err) => logger.error({ err, adminId }, 'Failed to notify admin of question reports'));
      }
    }

    res.json({ success: true, count });
  } catch (err) {
    logger.error({ err }, 'Report error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Test answer ──────────────────────────────────────────────────────
app.post('/api/questions/test-answer',
  validateBody({ questionId: { required: true }, answer: { required: true } }),
  async (req, res) => {
    try {
      const { questionId, answer } = req.body;
      const userId = req.userId;
      const qRes = await pool.query('SELECT short_answer FROM questions WHERE id=$1', [questionId]);
      if (!qRes.rows[0]) return res.status(404).json({ error: 'Question not found' });
      const correctAnswer = qRes.rows[0].short_answer;
      const norm = s => (s || '').toString().toLowerCase().replace(/\s+/g, ' ').trim();
      const isCorrect = norm(answer) === norm(correctAnswer);
      await recordProgress(userId, questionId, isCorrect);
      const streak = await updateStreak(userId);
      res.json({ success: true, isCorrect, correctAnswer, streak });
    } catch (error) {
      logger.error({ err: error, path: req.path }, 'Unhandled error in route');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── Bug hunt answer ──────────────────────────────────────────────────
app.post('/api/questions/bug-hunt-answer',
  validateBody({ questionId: { required: true }, answer: { required: true } }),
  async (req, res) => {
    try {
      const { questionId, answer } = req.body;
      const userId = req.userId;
      const { data } = await resolveAIData(questionId, 'bug_hunting_data', 'bug');
      if (!data) return res.status(404).json({ error: 'Bug hunt data not generated yet — please wait' });
      const correctBug = data.bug;
      const norm = s => (s || '').trim().toLowerCase();
      const isCorrect = norm(answer) === norm(correctBug);
      await recordProgress(userId, questionId, isCorrect);
      const streak = await updateStreak(userId);
      res.json({ success: true, isCorrect, correctAnswer: correctBug, streak });
    } catch (err) {
      logger.error({ err }, 'bug-hunt-answer error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── Blitz answer ─────────────────────────────────────────────────────
app.post('/api/questions/blitz-answer',
  async (req, res) => {
    try {
      const { questionId, answer, clientIsCorrect } = req.body;
      const userId = req.userId;
      let isCorrect;
      try {
        const { data } = await resolveAIData(questionId, 'blitz_data', 'blitz');
        if (data) {
          isCorrect = Boolean(answer) === Boolean(data.isCorrect);
        } else {
          // Blitz data not in DB yet (fallback statement used) — trust client evaluation
          isCorrect = Boolean(clientIsCorrect);
        }
      } catch {
        isCorrect = Boolean(clientIsCorrect);
      }
      await recordProgress(userId, questionId, isCorrect);
      const streak = await updateStreak(userId);
      res.json({ success: true, isCorrect, streak });
    } catch (err) {
      logger.error({ err }, 'blitz-answer error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── Code completion answer ───────────────────────────────────────────
app.post('/api/questions/code-completion-answer',
  validateBody({ questionId: { required: true }, answer: { required: true } }),
  async (req, res) => {
    try {
      const { questionId, answer } = req.body;
      const userId = req.userId;
      const { data } = await resolveAIData(questionId, 'code_completion_data', 'code');
      if (!data) return res.status(404).json({ error: 'Code completion data not generated yet — please wait' });
      const correctPart = data.correctPart;
      const normC = s => (s || '').trim().toLowerCase();
      const isCorrect = normC(answer) === normC(correctPart);
      await recordProgress(userId, questionId, isCorrect);
      const streak = await updateStreak(userId);
      res.json({ success: true, isCorrect, correctAnswer: correctPart, streak });
    } catch (err) {
      logger.error({ err }, 'code-completion-answer error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── Interview Evaluation ─────────────────────────────────────────────
app.post('/api/questions/interview-evaluate', rateLimit('interview'), async (req, res) => {
  try {
    const { question, answer, language = 'Java' } = req.body;
    if (!question || !answer) return res.status(400).json({ error: 'question and answer are required' });
    const evaluation = await evaluateInterviewAnswer(question, answer, null, language);
    if (req.userId) {
      const streak = await updateStreak(req.userId);
      res.json({ ...evaluation, streak });
    } else {
      res.json(evaluation);
    }
  } catch (error) {
    logger.error({ err: error, path: req.path }, 'Unhandled error in route');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Saved / bookmarked questions ──────────────────────────────────
const mapSavedRow = (row) => ({
  id: row.id,
  category: row.category,
  difficulty: row.difficulty,
  question: row.question_text,
  shortAnswer: row.short_answer,
  options: row.options || [],
  bugHuntingData: row.bug_hunting_data || null,
  blitzData: row.blitz_data || null,
  codeCompletionData: row.code_completion_data || null,
  language: row.language || 'Java',
  saved: true,
});

app.post('/api/questions/save', validateBody({ questionId: { required: true } }), async (req, res) => {
  try {
    const { questionId } = req.body;
    const userId = req.userId;
    await pool.query(
      'INSERT INTO saved_questions (user_id, question_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, questionId]
    );
    res.json({ success: true, saved: true });
  } catch (error) {
    logger.error({ err: error, path: req.path }, 'Unhandled error in route');
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/questions/save', validateBody({ questionId: { required: true } }), async (req, res) => {
  try {
    const { questionId } = req.body;
    const userId = req.userId;
    await pool.query('DELETE FROM saved_questions WHERE user_id = $1 AND question_id = $2', [userId, questionId]);
    res.json({ success: true, saved: false });
  } catch (error) {
    logger.error({ err: error, path: req.path }, 'Unhandled error in route');
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/questions/saved', async (req, res) => {
  try {
    const userId = req.userId;
    const { rows } = await pool.query(
      `SELECT q.id, q.category, q.difficulty, q.question_text, q.short_answer,
              q.options, q.bug_hunting_data, q.blitz_data, q.code_completion_data, q.language
       FROM saved_questions sq
       JOIN questions q ON q.id = sq.question_id
       WHERE sq.user_id = $1
       ORDER BY sq.created_at DESC`,
      [userId]
    );
    res.json({ questions: rows.map(mapSavedRow) });
  } catch (error) {
    logger.error({ err: error, path: req.path }, 'Unhandled error in route');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Explanation ──────────────────────────────────────────────────────
// Throttle explanation job enqueues so rapid client polling (the frontend
// retries on `pending`) doesn't spawn a storm of duplicate worker jobs for
// the same question. One enqueue per question per ~20s window is enough.
const explanationEnqueueLock = new Map();

app.post('/api/questions/explain', rateLimit('ai_generation'), async (req, res) => {
  try {
    const { questionId } = req.body;
    const userId = req.userId;
    if (!questionId) return res.status(400).json({ error: 'questionId is required' });

    // ── 1. Check DB-cached explanation first (no AI needed) ──────────
    const result = await pool.query(
      'SELECT id, question_text, short_answer, cached_explanation, language FROM questions WHERE id = $1',
      [questionId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Question not found' });

    const question = result.rows[0];
    if (question.cached_explanation) {
      return res.json({ explanation: question.cached_explanation, cached: true });
    }

    // ── 2. Check AI cache (also cached, no model call needed) ─────────
    const cachedAI = await checkCache(question.question_text, 'explanation', null, question.language || 'Java');
    if (cachedAI) {
      // Backfill the questions table cache too
      pool.query('UPDATE questions SET cached_explanation=$1 WHERE id=$2', [cachedAI, questionId]).catch(err => logger.error({ err, questionId }, 'Failed to backfill cached explanation'));
      return res.json({ explanation: cachedAI, cached: true });
    }

    // ── 3. Not cached: generate via the background worker, wait for the ──
    // result server-side. This offloads the (slow) AI call to a separate
    // worker process so THIS process stays free to serve other requests.
    // The request still resolves with the explanation once the worker is
    // done (most questions are pre-warmed at login, so usually instant).
    const language = question.language || 'Java';

    // Free-tier daily cap on AI explanations — the honest nudge toward Pro.
    // Cached explanations above don't count (they cost no AI call).
    if (!question.cached_explanation) {
      const { rows: planRows } = await pool.query(
        'SELECT subscription_plan FROM users WHERE telegram_id = $1', [userId]
      );
      const plan = planRows[0]?.subscription_plan || 'free';
      const isFree = plan === 'free' && !ADMIN_IDS.has(String(userId));
      if (isFree) {
        const lr = await checkDailyAiExplain(userId);
        if (!lr.allowed) {
          logger.info({ userId, questionId, used: lr.used, limit: lr.limit }, '⛔ Free daily AI explanation limit reached');
          return res.status(403).json({
            error: 'daily_ai_limit',
            code: 'DAILY_AI_LIMIT',
            used: lr.used,
            limit: lr.limit,
            message: 'Daily AI explanation limit reached. Upgrade to Pro for unlimited deep breakdowns.',
          });
        }
      }
    }

    logger.info({ questionId, language }, '🤖 Generating explanation (queued)');

    // De-dupe: only enqueue a fresh generation job if we haven't already
    // enqueued one for this question in the last ~20s (rapid polling would
    // otherwise create a storm of duplicate jobs for the same question).
    const enqueueKey = `${language}:${questionId}`;
    const now = Date.now();
    const lastEnqueue = explanationEnqueueLock.get(enqueueKey) || 0;
    if (now - lastEnqueue > 20000) {
      explanationEnqueueLock.set(enqueueKey, now);
      // Auto-clear after the dedup window to prevent unbounded memory growth
      // in long-running processes (the Map is never otherwise pruned).
      setTimeout(() => explanationEnqueueLock.delete(enqueueKey), 25000);
      await enqueueJob('explanation', {
        questionText: question.question_text,
        shortAnswer: question.short_answer,
        userId: userId || null,
        questionId,
        language,
      }).catch(err => logger.error({ err, questionId }, 'Failed to enqueue explanation job'));
    }

    const explanation = await waitForExplanation(question.question_text, questionId, language);
    if (explanation) {
      res.json({ explanation, cached: false });
      metricsService.trackEvent(userId, 'ai_explanation_requested', { questionId, cached: false });
      return;
    }

    // Worker hasn't finished yet — the job stays queued and the client can
    // poll (it already retries on `pending`).
    res.json({
      status: 'pending',
      message: 'Объяснение ещё генерируется. Попробуйте ещё раз через пару секунд.',
    });
  } catch (error) {
    logger.error({ err: error, questionId: req.body?.questionId }, 'Error in /questions/explain');
    res.status(500).json({
      error: 'AI explanation failed',
    });
  }
});

// ─── Resume Analysis ──────────────────────────────────────────────────
app.post('/api/user/analyze-resume', rateLimit('resume'), async (req, res) => {
  try {
    const { resumeText, language = 'Java' } = req.body;
    const userId = req.userId;
    if (!resumeText) return res.status(400).json({ error: 'resumeText is required' });
    const parsedData = await analyzeResume(resumeText, userId, language);
    await pool.query(
      'UPDATE users SET resume_text = $1, parsed_resume_data = $2 WHERE telegram_id = $3',
      [resumeText, parsedData, userId]
    ).catch((err) => logger.error({ err, userId }, 'Failed to persist parsed resume data'));
    res.json({ success: true, parsedData });
  } catch (error) {
    logger.error({ err: error, path: req.path }, 'Unhandled error in route');
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/user/resume', async (req, res) => {
  try {
    const result = await pool.query('SELECT resume_text, parsed_resume_data FROM users WHERE telegram_id = $1', [req.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    logger.error({ err: error, path: req.path }, 'Unhandled error in route');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Subscription ─────────────────────────────────────────────────────
app.get('/api/subscription/plans', async (req, res) => {
  try {
    // Only surface the active 2-plan model (Free/Pro). Legacy 'premium' rows,
    // if any still exist, are excluded from the storefront.
    const { rows } = await pool.query(
      "SELECT * FROM subscription_plans WHERE id IN ('free','pro') ORDER BY price_monthly ASC"
    );
    if (rows.length === 0) {
      // Return canonical default plans if table is empty or missing
      return res.json({ plans: PLANS_LIST });
    }
    res.json({ plans: rows });
  } catch {
    res.json({ plans: PLANS_LIST });
  }
});

app.get('/api/subscription/status', async (req, res) => {
  try {
    const userId = req.userId;
    const isAdmin = ADMIN_IDS.has(String(userId));
    if (isAdmin) {
      return res.json({ plan: 'admin', plan_name: 'Admin (Unlimited)', status: 'active', is_admin: true });
    }
    const { rows } = await pool.query(
      `SELECT us.*, sp.name as plan_name, sp.available_languages, sp.available_modes
       FROM user_subscriptions us JOIN subscription_plans sp ON us.plan_id = sp.id
       WHERE us.user_id = $1 AND us.status = 'active'
         AND (us.expires_at IS NULL OR us.expires_at > CURRENT_TIMESTAMP)
       ORDER BY us.created_at DESC LIMIT 1`,
      [userId]
    );
    if (rows.length === 0) {
      // Fallback to the durable flag on users so a missing/deleted plan row
      // never makes a real Pro subscriber look like Free.
      const { rows: u } = await pool.query(
        'SELECT subscription_plan FROM users WHERE telegram_id = $1',
        [userId]
      );
      const plan = u[0]?.subscription_plan || 'free';
      if (plan === 'free') return res.json({ plan: 'free', plan_name: 'Free', status: 'active' });
      return res.json({
        plan_id: plan,
        plan,
        plan_name: plan,
        status: 'active',
        users_subscription_plan: plan,
      });
    }
    res.json(rows[0]);
  } catch { res.json({ plan: 'free', status: 'active' }); }
});

app.post('/api/billing/stars/create-invoice', async (req, res) => {
  try {
    const { planId, interval } = req.body;
    const userId = req.userId;

    // Amount is sourced from the DB (subscription_plans.stars_*) via
    // getStarsAmount — the single source of truth, so the link always shows
    // the same number the UI and sendStarsInvoice use (no more 250/500 vs 450).
    const amount = await getStarsAmount(planId, interval || 'monthly');

    const response = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Pro Plan (${planId})`,
        description: 'Доступ ко всем функциям Java Interview Tinder на 1 месяц',
        payload: JSON.stringify({ userId: String(userId), planId }),
        provider_token: '', // Empty for Stars
        currency: 'XTR',
        prices: [{ label: 'Pro Plan', amount }]
      })
    });

    const result = await response.json();
    if (!result.ok) throw new Error(result.description || 'Failed to create invoice link');

    res.json({ url: result.result });
  } catch (error) {
    logger.error({ err: error }, 'Create invoice link error');
    res.status(500).json({ error: 'Failed to create invoice link' });
  }
});

// ─── Telegram Bot Webhook ───────────────────────────────────────────
// Handles pre_checkout_query and successful_payment for Stars billing.
// Verifies X-Telegram-Bot-Api-Secret-Token (set via setWebhook secret_token)
// to prevent forged successful_payment updates that would grant free plans.
function verifyWebhookSecret(req) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) {
    // No secret configured: allow only outside production (local dev). In
    // production this fails CLOSED — an unauthenticated webhook would let
    // anyone forge successful_payment updates and grant themselves Pro.
    if (process.env.NODE_ENV === 'production') {
      logger.error('TELEGRAM_WEBHOOK_SECRET is not set — rejecting unauthenticated bot webhook in production');
      return false;
    }
    return true;
  }
  const received = req.headers['x-telegram-bot-api-secret-token'];
  if (!received || received.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  } catch {
    return false;
  }
}

app.post('/api/bot/webhook', async (req, res) => {
  // Validate the request BEFORE acknowledging it to Telegram.
  if (!verifyWebhookSecret(req)) {
    logger.warn('Bot webhook rejected: invalid secret token');
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Respond 200 so Telegram does not retry a legit update.
  res.json({ ok: true });

  const update = req.body;
  try {
    // 1. Pre-checkout: must answer within 10 seconds
    if (update.pre_checkout_query) {
      const pcq = update.pre_checkout_query;
      try {
        const { userId, planId } = JSON.parse(pcq.invoice_payload);
        if (!userId || !planId) throw new Error('Invalid payload');
        await answerPreCheckout(pcq.id, true);
      } catch (err) {
        logger.error({ err }, 'pre_checkout_query failed');
        await answerPreCheckout(pcq.id, false, 'Payment validation failed. Please try again.');
      }
      return;
    }

    // 2. Successful payment — activate subscription
    const message = update.message || update.edited_message;
    if (message?.successful_payment) {
      const payment = message.successful_payment;
      const { userId, planId, interval } = JSON.parse(payment.invoice_payload);
      logger.info({ userId, planId, interval }, '💰 Stars payment received');

      await activateStarsSubscription(
        userId, planId, interval ?? 'monthly',
        payment.telegram_payment_charge_id
      );

      await sendTelegramMessage(message.chat.id,
        `🎉 Payment confirmed! Your Pro plan is now active.\n` +
        `Plan: ${interval === 'yearly' ? 'Annual' : 'Monthly'} Pro\n` +
        `Enjoy unlimited interviews and deep theory explanations!`
      );
    }
  } catch (error) {
    logger.error({ err: error, update }, 'Webhook processing failed');
    Sentry.captureException(error, {
      extra: {
        updateId: update.update_id,
        userId: update.message?.from?.id || update.pre_checkout_query?.from?.id
      }
    });
  }
});

// Custom error handler: log every unhandled error, then delegate to Sentry.
// Registered BEFORE Sentry so we capture structured logs and Sentry still
// sends the final response to the client.
app.use((err, req, res, next) => {
  logger.error(
    { err, path: req.path, method: req.method, userId: req.userId },
    'Unhandled error'
  );
  next(err);
});

Sentry.setupExpressErrorHandler(app);

// ─── Stars invoice: sends invoice to user's Telegram chat ───────────
app.post('/api/billing/stars/invoice',
  validateBody({ planId: { required: true } }),
  async (req, res) => {
    try {
      const { planId, interval = 'monthly' } = req.body;
      await sendStarsInvoice(req.userId, planId, interval);
      res.json({ sent: true });
    } catch (error) {
      logger.error({ err: error }, 'Stars invoice error');
      res.status(500).json({ error: 'Failed to send invoice' });
    }
  }
);

// ─── Billing info (current plan + renewal date) ──────────────────────
app.get('/api/billing/info', async (req, res) => {
  try {
    const info = await billingService.getBillingInfo(req.userId);
    res.json(info);
  } catch (err) {
    logger.error({ err }, 'Billing info error');
    res.status(500).json({ error: 'Failed to get billing info' });
  }
});

app.get('/api/billing/history', async (req, res) => {
  try {
    const history = await billingService.getHistory(req.userId, 5);
    res.json({ history });
  } catch (err) {
    logger.error({ err }, 'Billing history error');
    res.status(500).json({ error: 'Failed to get billing history' });
  }
});

// ─── Available payment methods (UI uses this to show/hide options) ─
// Card (U-Kassa) is opt-in and enabled ONLY when UKASSA_TOKEN is set.
app.get('/api/billing/methods', async (req, res) => {
  res.json({
    stars: !!process.env.BOT_TOKEN,
    ton: !!process.env.TON_WALLET_ADDRESS,
    card: isUkassaEnabled(),
  });
});

app.delete('/api/billing/subscription', async (req, res) => {
  try {
    const userId = req.userId;
    const result = await billingService.cancelSubscription(userId);
    res.json(result);

    // Track cancellation
    metricsService.trackEvent(userId, 'subscription_cancelled');
  } catch (error) {
    logger.error({ err: error }, 'Cancel subscription error');
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// ─── TON Crypto routes ───────────────────────────────────────────────
// POST /api/billing/ton/invoice — create a pending TON invoice
app.post('/api/billing/ton/invoice',
  validateBody({ planId: { required: true } }),
  async (req, res) => {
    try {
      if (!process.env.TON_WALLET_ADDRESS) {
        return res.status(503).json({ error: 'TON payments are not configured on this server' });
      }
      const { planId, interval = 'monthly' } = req.body;
      const invoice = await createTonInvoice(req.userId, planId, interval);
      res.json(invoice);
    } catch (err) {
      logger.error({ err }, 'TON invoice error');
      res.status(500).json({ error: 'Failed to create TON invoice' });
    }
  }
);

// GET /api/billing/ton/check — poll for fulfillment of user's pending invoice
app.get('/api/billing/ton/check', async (req, res) => {
  try {
    const invoice = await getUserPendingInvoice(req.userId);
    if (!invoice) return res.json({ fulfilled: true });
    res.json({
      fulfilled: false,
      invoiceId: invoice.invoice_id,
      amountTon: parseFloat(invoice.amount_ton),
      address: process.env.TON_WALLET_ADDRESS,
      comment: invoice.invoice_id,
      expiresAt: invoice.expires_at,
    });
  } catch (err) {
    logger.error({ err }, 'TON check error');
    res.status(500).json({ error: 'Failed to check TON payment' });
  }
});

// ─── U-Kassa (bank card) routes ─────────────────────────────────────
// POST /api/billing/ukassa/invoice — create a card payment, returns a
// redirect URL the client opens to complete the payment.
app.post('/api/billing/ukassa/invoice',
  validateBody({ planId: { required: true } }),
  async (req, res) => {
    try {
      if (!isUkassaEnabled()) {
        return res.status(503).json({ error: 'Card payments are not configured on this server' });
      }
      const { planId, interval = 'monthly', returnUrl } = req.body;
      const redirect = returnUrl || process.env.FRONTEND_URL || 'https://t.me';
      const result = await createUkassaPayment(req.userId, planId, interval, redirect);
      res.json(result);
    } catch (error) {
      logger.error({ err: error }, 'U-Kassa invoice error');
      res.status(500).json({
        error: 'Failed to create card payment',
        ...(process.env.NODE_ENV !== 'production' && { detail: error.message }),
      });
    }
  }
);

// POST /api/billing/ukassa/webhook — YooKassa asynchronous notification.
// Must capture the RAW body for HMAC signature verification.
app.post('/api/billing/ukassa/webhook',
  express.json({
    type: ['application/json', 'application/*+json'],
    verify: (req, _res, buf) => { req.rawBody = buf; },
  }),
  async (req, res) => {
    const sig = req.headers['x-request-signature'];
    if (!verifyUkassaSignature(req.rawBody, sig)) {
      logger.warn('U-Kassa webhook rejected: invalid signature');
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Respond quickly; process asynchronously.
    res.json({ ok: true });

    try {
      const result = await handleUkassaEvent(req.body);
      if (result.activated) {
        logger.info({ paymentId: result.paymentId }, '💳 U-Kassa webhook: subscription activated');
      }
    } catch (err) {
      logger.error({ err }, 'U-Kassa webhook processing failed');
    }
  }
);

// ─── Admin Endpoints ──────────────────────────────────────────────────

// Grant plan (admin-only)
app.post('/api/admin/grant-plan', async (req, res) => {
  const client = await pool.connect();
  try {
    const { targetUserId, planId, months = 12 } = req.body;
    const expiresAt = months === 0 ? null : new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000);
    await client.query('BEGIN');
    try {
      await client.query(
        `UPDATE user_subscriptions SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND status = 'active'`,
        [targetUserId]
      );
      await client.query(
        `INSERT INTO user_subscriptions (user_id, plan_id, status, expires_at, payment_id, payment_provider)
         VALUES ($1, $2, 'active', $3, 'admin_grant', 'admin')`,
        [targetUserId, planId, expiresAt]
      );
      await client.query(
        `UPDATE users SET subscription_plan = $1, subscription_expires_at = $2 WHERE telegram_id = $3`,
        [planId, expiresAt, targetUserId]
      );
      await client.query('COMMIT');
      res.json({ success: true, message: `Granted ${planId} to ${targetUserId}` });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    logger.error({ err }, 'Grant plan failed');
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// List all users (admin-only) with pagination
app.get('/api/admin/users', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    const { rows } = await pool.query(`
      SELECT u.telegram_id, u.username, u.first_name, u.subscription_plan,
             u.subscription_expires_at, u.created_at,
             COUNT(up.id) as questions_seen
      FROM users u
      LEFT JOIN user_progress up ON up.user_id = u.telegram_id
      GROUP BY u.telegram_id, u.username, u.first_name, u.subscription_plan, u.subscription_expires_at, u.created_at
      ORDER BY u.created_at DESC 
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({ users: rows, limit, offset });
  } catch (err) {
    logger.error({ err }, 'Admin users error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/metrics', async (req, res) => {
  try {
    const metrics = await metricsService.getSystemOverview();
    res.json(metrics);
  } catch (error) {
    logger.error({ err: error, path: req.path }, 'Unhandled error in route');
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/clear-cache', requireAdmin, async (req, res) => {
  try {
    const { mode, language } = req.body;
    let query = 'DELETE FROM ai_cache';
    const params = [];

    if (mode || language) {
      query += ' WHERE 1=1';
      if (mode) { params.push(mode); query += ` AND mode = $${params.length}`; }
      if (language) { params.push(language); query += ` AND language = $${params.length}`; }
    }

    const result = await pool.query(query, params);
    logger.info({ mode, language, count: result.rowCount }, '🗑️ AI Cache cleared by admin');

    // Redis invalidation (simple flush for now if no specific keys targetable)
    if (redis && (!mode && !language)) {
      const keys = await redis.keys('ai:*');
      if (keys.length > 0) await redis.del(...keys);
    }

    res.json({ success: true, message: `AI Cache cleared (${result.rowCount} rows)` });
  } catch (err) {
    logger.error({ err }, 'Clear cache failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Admin Moderation ──────────────────────────────────────────────────
app.get('/api/admin/reports', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT q.id, q.question_text, q.short_answer, q.is_active,
             COUNT(qr.id) as report_count,
             json_agg(json_build_object('reason', qr.reason, 'comment', qr.comment, 'created_at', qr.created_at)) as reports
      FROM questions q
      JOIN question_reports qr ON q.id = qr.question_id
      WHERE qr.resolved = FALSE
      GROUP BY q.id
      ORDER BY report_count DESC
    `);
    res.json({ reports: rows });
  } catch (err) {
    logger.error({ err }, 'Admin reports error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/reports/:questionId/approve', async (req, res) => {
  try {
    const { questionId } = req.params;
    await pool.query('UPDATE question_reports SET resolved = TRUE WHERE question_id = $1', [questionId]);
    await pool.query('UPDATE questions SET is_active = TRUE WHERE id = $1', [questionId]);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Approve report error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/admin/questions/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;
    await pool.query('UPDATE questions SET is_active = FALSE WHERE id = $1', [questionId]);
    await pool.query('UPDATE question_reports SET resolved = TRUE WHERE question_id = $1', [questionId]);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Delete question error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/admin/questions/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;
    const { question_text, short_answer } = req.body;
    await pool.query(
      'UPDATE questions SET question_text = $1, short_answer = $2, is_active = TRUE WHERE id = $3',
      [question_text, short_answer, questionId]
    );
    await pool.query('UPDATE question_reports SET resolved = TRUE WHERE question_id = $1', [questionId]);
    // Clear cache for this question to reflect updates
    await pool.query('UPDATE questions SET cached_explanation = NULL, bug_hunting_data = NULL, blitz_data = NULL, code_completion_data = NULL WHERE id = $1', [questionId]);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Update question error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Viral Percentile Stats ──────────────────────────────────────────
app.get('/api/stats/percentile', async (req, res) => {
  try {
    const { language = 'Java', score } = req.query;
    const currentScore = parseInt(score) || 0;

    // We calculate percentile based on 'known' count of all users in this language
    // Better than X% of users who have studied this month
    const statsResult = await pool.query(`
      WITH user_scores AS (
        SELECT up.user_id, COUNT(*) as score
        FROM user_progress up
        JOIN questions q ON q.id = up.question_id
        WHERE q.language = $1 AND up.status = 'known'
          AND up.updated_at > NOW() - INTERVAL '30 days'
        GROUP BY up.user_id
      )
      SELECT 
        COUNT(*) FILTER (WHERE score <= $2) as below_count,
        COUNT(*) as total_count
      FROM user_scores
    `, [language, currentScore]);

    const { below_count, total_count } = statsResult.rows[0];
    const percentile = total_count > 0
      ? Math.round((parseInt(below_count || 0) / parseInt(total_count || 1)) * 100)
      : 99;

    res.json({ percentile });
  } catch (err) {
    logger.error({ err }, 'Percentile error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/referrals/stats', async (req, res) => {
  try {
    const stats = await referralService.getStats(req.userId);
    res.json(stats);
  } catch (error) {
    logger.error({ err: error, path: req.path }, 'Unhandled error in route');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Category-scoped stats (§3 topic counter) ────────────────────────
app.get('/api/stats/categories', async (req, res) => {
  try {
    const userId = req.userId;
    const { language = 'Java', categories } = req.query;

    let cats = [];
    try { cats = JSON.parse(decodeURIComponent(categories || '[]')); } catch { /* ignore */ }

    if (cats.length === 0) return res.json({ known: 0, total: 0 });

    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE up.status = 'known') AS known,
         COUNT(q.id)                                  AS total
       FROM questions q
       LEFT JOIN user_progress up ON q.id = up.question_id AND up.user_id = $1
       WHERE q.language = $2 AND q.category = ANY($3)`,
      [userId, language, cats]
    );
    res.json({
      known: parseInt(result.rows[0].known || 0),
      total: parseInt(result.rows[0].total || 0),
    });
  } catch (err) {
    logger.error({ err }, 'Category stats error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Stats ────────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const userId = req.userId;
    const language = req.query.language || 'Java';

    // Join with questions so stats are language-scoped
    // Switching language shows only that language's progress
    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE up.status = 'known')   AS known_count,
         COUNT(*) FILTER (WHERE up.status = 'unknown') AS unknown_count,
         COUNT(*)                                       AS total_seen
       FROM user_progress up
       JOIN questions q ON q.id = up.question_id
       WHERE up.user_id = $1 AND q.language = $2`,
      [userId, language]
    );
    const totalResult = await pool.query(
      'SELECT COUNT(*) as total FROM questions WHERE language = $1', [language]
    );

    const userStreak = await pool.query(
      'SELECT current_streak, longest_streak FROM users WHERE telegram_id = $1', [userId]
    );

    res.json({
      known: parseInt(result.rows[0].known_count || 0),
      unknown: parseInt(result.rows[0].unknown_count || 0),
      totalSeen: parseInt(result.rows[0].total_seen || 0),
      totalQuestions: parseInt(totalResult.rows[0].total || 0),
      streak: userStreak.rows[0]?.current_streak || 0,
      longestStreak: userStreak.rows[0]?.longest_streak || 0,
    });
  } catch (err) {
    logger.error({ err }, 'Stats error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/questions/due-count', async (req, res) => {
  try {
    const count = await getDueCount(req.userId, req.query.language || 'Java');
    res.json({ count });
  } catch (error) {
    logger.error({ err: error, path: req.path }, 'Unhandled error in route');
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/questions/mastery', validateBody({ questionId: { required: true }, quality: { required: true } }), async (req, res) => {
  try {
    const result = await updateMastery(req.userId, req.body.questionId, req.body.quality);
    res.json(result);
  } catch (error) {
    logger.error({ err: error, path: req.path }, 'Unhandled error in route');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Server ───────────────────────────────────────────────────────────
let server = null;
let tonTimer = null;

if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, '0.0.0.0', () => {
    logger.info({ port: PORT, mode: isDev ? 'development' : 'production', admins: ADMIN_IDS.size }, 'Server started');

    // ── TON payment poller: every 30 s, check for fulfilled invoices ──
    if (process.env.TON_WALLET_ADDRESS) {
      logger.info('💫 TON poller started (30 s interval)');
      tonTimer = setInterval(() => pollPendingInvoices().catch(err => logger.error({ err }, 'TON poller error')), 30_000);
    }
  });
}

// Graceful shutdown: stop accepting new connections, then drain the DB pool.
async function shutdown(signal) {
  logger.info({ signal }, '🛑 Received shutdown signal — draining...');
  if (tonTimer) clearInterval(tonTimer);
  if (server) server.close(() => logger.info('HTTP server closed'));
  try {
    await pool.end();
  } catch (err) {
    logger.error({ err }, 'Error closing pool during shutdown');
  }
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ─── Global error handler ───────────────────────────────────────────────
// Centralizes error responses and guarantees every failure is logged (Sentry
// via the logger transport) instead of being swallowed by an empty catch.
// MUST be registered after all routes and before the 404 handler.
app.use(errorHandler(isDev));

// 404 handler — must be registered after all routes.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;
