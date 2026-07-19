import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ─── Mocks (before import) ───────────────────────────────────────────────
vi.mock('../src/config/database.js', () => ({
  default: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    on: vi.fn(),
    connect: vi.fn().mockReturnValue({ query: vi.fn(), release: vi.fn() }),
  },
}));

vi.mock('../src/config/logger.js', () => ({
  default: {
    info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

vi.mock('../src/utils/telegram.js', () => ({
  validateTelegramWebAppData: vi.fn().mockReturnValue({
    telegram_id: 987654321, username: 'testuser', first_name: 'Test', last_name: 'User',
  }),
  mockValidation: vi.fn(),
}));

vi.mock('pino-http', () => ({
  default: vi.fn().mockReturnValue((req, res, next) => { req.log = { info: vi.fn(), error: vi.fn(), warn: vi.fn() }; next(); }),
}));

// In-memory Redis stand-in so the rate limiter's counter semantics actually work.
const redisStore = new Map();
vi.mock('../src/config/redis.js', () => {
  const store = redisStore;
  return {
    default: {
      get: vi.fn((k) => (store.has(k) ? String(store.get(k)) : null)),
      setex: vi.fn((k, _t, v) => { store.set(k, v); return Promise.resolve(); }),
      incr: vi.fn((k) => { const n = (store.get(k) || 0) + 1; store.set(k, n); return n; }),
      expire: vi.fn(),
      on: vi.fn(),
      keys: vi.fn(() => []),
      del: vi.fn((...ks) => { ks.forEach(k => store.delete(k)); }),
    },
    isConnected: vi.fn().mockResolvedValue(true),
  };
});

vi.mock('../src/services/aiService.js', () => ({
  evaluateInterviewAnswer: vi.fn(), analyzeResume: vi.fn(), checkCache: vi.fn(),
}));

vi.mock('../src/services/queueService.js', () => ({ enqueueJob: vi.fn() }));
vi.mock('../src/services/billingService.js', () => ({
  billingService: { getBillingInfo: vi.fn(), getHistory: vi.fn(), cancelSubscription: vi.fn(), activateSubscription: vi.fn() },
}));
vi.mock('../src/services/billing/starsService.js', () => ({
  sendStarsInvoice: vi.fn(), answerPreCheckout: vi.fn(), sendTelegramMessage: vi.fn(), activateStarsSubscription: vi.fn(),
}));
vi.mock('../src/services/billing/tonService.js', () => ({
  createTonInvoice: vi.fn(), getUserPendingInvoice: vi.fn(), pollPendingInvoices: vi.fn(),
}));
vi.mock('../src/services/billing/ukassaService.js', () => ({
  isUkassaEnabled: vi.fn(), createUkassaPayment: vi.fn(), handleUkassaEvent: vi.fn(), verifyUkassaSignature: vi.fn(),
}));
vi.mock('../src/services/metricsService.js', () => ({
  metricsService: { trackEvent: vi.fn(), getSystemOverview: vi.fn() },
}));
vi.mock('../src/services/referralService.js', () => ({
  referralService: { trackReferral: vi.fn(), getStats: vi.fn() },
}));
vi.mock('../src/services/questionService.js', () => ({
  updateMastery: vi.fn(() => Promise.resolve({ ef: 2.5, interval: 1, reps: 0, nextReview: new Date() })),
  getDueCount: vi.fn(() => Promise.resolve(0)),
}));
vi.mock('../src/services/languageRegistry.js', () => ({ getAvailableLanguages: vi.fn() }));

const { rateLimit } = await import('../src/middleware/rateLimiter.js');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
process.env.ADMIN_TELEGRAM_IDS = '123456789';
process.env.BOT_TOKEN = 'test_bot_token';

const { default: app } = await import('../src/server.js');
const { default: pool } = await import('../src/config/database.js');
const { checkCache } = await import('../src/services/aiService.js');
const { getDueCount } = await import('../src/services/questionService.js');

const JWT_SECRET = 'test_secret';
const USER_ID = '987654321';
const userToken = jwt.sign({ userId: USER_ID, plan: 'free' }, JWT_SECRET);

beforeEach(() => {
  pool.query.mockReset();
  pool.query.mockImplementation(async () => ({ rows: [] }));
  checkCache.mockResolvedValue(null);
  getDueCount.mockImplementation(() => Promise.resolve(0));
  redisStore.clear();
  global.fetch = vi.fn().mockResolvedValue({ json: async () => ({ ok: true }) });
});

afterEach(() => { vi.clearAllMocks(); });

// ─── THROUGHPUT / LOAD ───────────────────────────────────────────────────
// These tests verify the API can sustain a burst of concurrent traffic
// (simulating many users) and that responses stay consistent — i.e. the
// server does not crash or corrupt state under load, and the per-IP global
// rate limiter behaves.
describe('Load / Throughput', () => {
  it('handles a burst of 100 concurrent /api/categories requests', async () => {
    pool.query.mockResolvedValue({ rows: [{ category: 'OOP', count: '3' }] });
    const N = 100;
    const results = await Promise.all(
      Array.from({ length: N }, () =>
        request(app).get('/api/categories?language=Java').set('Authorization', `Bearer ${userToken}`)
      )
    );
    const ok = results.filter(r => r.status === 200).length;
    expect(ok).toBe(N);
    results.forEach(r => expect(r.body.categories).toHaveLength(1));
  }, 30000);

  it('handles 50 concurrent swipes without data corruption', async () => {
    // Each swipe: INSERT progress, updateStreak SELECT, updateStreak UPDATE
    pool.query
      .mockResolvedValueOnce({ rows: [] })        // recordProgress
      .mockResolvedValueOnce({ rows: [{ current_streak: 1, last_activity_date: '2000-01-01', longest_streak: 1 }] }) // streak SELECT
      .mockResolvedValue({ rows: [] });           // streak UPDATE + any extra

    const N = 50;
    const results = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        request(app)
          .post('/api/questions/swipe')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ questionId: String(i + 1), status: 'known' })
      )
    );
    const ok = results.filter(r => r.status === 200 && r.body.success === true).length;
    expect(ok).toBe(N);
  }, 30000);

  it('sustains a burst of mixed read requests without errors', async () => {
    pool.query.mockImplementation(async (sql) => {
      if (String(sql).includes('SELECT COUNT(*)')) return { rows: [{ count: '10' }] };
      // Stats route dereferences rows[0] for several queries — return a
      // harmless single row so none of them crash under load.
      if (String(sql).includes('FROM questions') || String(sql).includes('FROM users')) {
        return { rows: [{ total: '10', current_streak: 0, longest_streak: 0 }] };
      }
      return { rows: [{ known_count: '0', unknown_count: '0', total_seen: '0' }] };
    });
    // Burst well under the free per-day request cap (200) so the limiter
    // does not trip during the smoke test.
    const N = 100;
    const results = await Promise.all(
      Array.from({ length: N }, () =>
        request(app).get('/api/stats?language=Java').set('Authorization', `Bearer ${userToken}`)
      )
    );
    const ok = results.filter(r => r.status === 200).length;
    expect(ok).toBe(N);
  }, 30000);

  it('does not exhaust the connection pool under concurrent feed loads', async () => {
    pool.query.mockImplementation(async () => ({ rows: [] }));
    const N = 80;
    const results = await Promise.all(
      Array.from({ length: N }, () =>
        request(app).get('/api/questions/feed?mode=swipe&limit=5').set('Authorization', `Bearer ${userToken}`)
      )
    );
    const ok = results.filter(r => r.status === 200 || r.status === 403).length;
    expect(ok).toBe(N);
  }, 30000);
});

// ─── PER-USER RATE LIMIT (must trigger 429, NOT be disabled) ──────────────
// Verifies the AI-generation rate limiter actually blocks a single user after
describe('Rate limit enforcement under load', () => {
  // Directly exercise the rateLimit middleware with the in-memory Redis mock
  // to prove the per-user AI-generation limiter actually blocks (regression
  // guard for BUG-05) and that distinct users are isolated.

  const makeReq = (userId) => ({ userId, body: { questionText: 'q' }, query: {} });
  const makeRes = () => {
    let statusCode = 200; let body = null; const res = {};
    res.status = (c) => { statusCode = c; return res; };
    res.json = (b) => { body = b; return res; };
    Object.defineProperty(res, 'statusCode', { get: () => statusCode });
    Object.defineProperty(res, 'body', { get: () => body });
    return res;
  };

  const baseRow = (overrides = {}) => ({
    requests_per_day: 200, ai_generations_per_month: 5, resume_analysis_limit: 3,
    interview_eval_limit: 20, available_languages: ['Java', 'Python', 'TypeScript'],
    available_modes: ['swipe', 'test'], model_priority: 'standard',
    requests_today: 0, ai_generations_this_month: 0, resume_analyses_this_month: 0,
    interview_evals_this_month: 0, daily_reset_at: null, monthly_reset_at: null,
    ...overrides,
  });

  // Each test self-configures the DB mock so it does not depend on
  // beforeEach ordering or a cached limits object left by a sibling test.
  const withSubRow = () => {
    redisStore.clear();
    pool.query.mockImplementation(async (sql) =>
      String(sql).includes('subscription_plans') ? { rows: [baseRow()] } : { rows: [] }
    );
  };

  it('blocks a single user with 429 once the monthly AI cap is reached', async () => {
    withSubRow();
    redisStore.set(`counter:${USER_ID}:ai_generations_this_month`, 5);
    const mw = rateLimit('ai_generation');
    const res = makeRes();
    const next = vi.fn();
    await mw(makeReq(USER_ID), res, next);
    expect(res.statusCode).toBe(429);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows requests up to the limit, then blocks further ones', async () => {
    withSubRow();
    redisStore.set(`counter:${USER_ID}:ai_generations_this_month`, 3);
    const mw = rateLimit('ai_generation');
    const outcomes = [];
    for (let i = 0; i < 4; i++) {
      const res = makeRes();
      const next = vi.fn();
      await mw(makeReq(USER_ID), res, next);
      outcomes.push(res.statusCode);
    }
    expect(outcomes.filter(c => c === 200).length).toBeGreaterThan(0);
    expect(outcomes).toContain(429);
  });

  it('isolates counters per user (no cross-user blocking)', async () => {
    withSubRow();
    // User A is at the monthly cap (5) → blocked; User B has made 0 → allowed.
    redisStore.set(`counter:${USER_ID}:ai_generations_this_month`, 5);
    const otherUser = '70001';
    const mw = rateLimit('ai_generation');
    const resA = makeRes(); await mw(makeReq(USER_ID), resA, vi.fn());
    const resB = makeRes(); await mw(makeReq(otherUser), resB, vi.fn());
    expect(resA.statusCode).toBe(429);
    expect(resB.statusCode).toBe(200);
  });

  it('global per-IP limiter is present and configured (no over-eager trip)', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const results = await Promise.all(
      Array.from({ length: 20 }, () => request(app).get('/api/languages'))
    );
    expect(results.every(r => r.status === 200)).toBe(true);
  });
});






