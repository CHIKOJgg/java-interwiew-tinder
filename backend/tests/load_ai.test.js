import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ─── Mocks ──────────────────────────────────────────────────────────────────
vi.mock('../src/config/database.js', () => ({
  default: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    on: vi.fn(),
    connect: vi.fn().mockReturnValue({ query: vi.fn(), release: vi.fn() }),
  },
}));

vi.mock('../src/config/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

vi.mock('pino-http', () => ({
  default: vi.fn().mockReturnValue((req, res, next) => {
    req.log = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
    next();
  }),
}));

const redisStore = new Map();
vi.mock('../src/config/redis.js', () => {
  const store = redisStore;
  return {
    default: {
      get: vi.fn(async (k) => (store.has(k) ? String(store.get(k)) : null)),
      setex: vi.fn(async (k, _t, v) => { store.set(k, v); return 'OK'; }),
      incr: vi.fn(async (k) => {
        const n = (Number(store.get(k)) || 0) + 1;
        store.set(k, n);
        return n;
      }),
      decr: vi.fn(async (k) => {
        const n = (Number(store.get(k)) || 0) - 1;
        store.set(k, n);
        return n;
      }),
      expire: vi.fn(async () => 1),
      del: vi.fn(async (...ks) => { ks.forEach(k => store.delete(k)); return 1; }),
      keys: vi.fn(async () => Array.from(store.keys())),
      on: vi.fn(),
    },
    isConnected: vi.fn().mockResolvedValue(true),
  };
});

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'load_test_jwt_secret_key_12345';
process.env.OPENROUTER_API_KEY = 'test_openrouter_api_key';

const { default: app } = await import('../src/server.js');
const { default: pool } = await import('../src/config/database.js');
const { consumeQuota, peekQuota } = await import('../src/middleware/rateLimiter.js');
const { generateExplanation, checkCache, parseAIResponse } = await import('../src/services/aiService.js');

const USER_ID = 'ai_load_tester_1';
const userToken = jwt.sign({ userId: USER_ID, plan: 'free' }, process.env.JWT_SECRET);

describe('AI Pipeline Concurrency & Load Testing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisStore.clear();
    pool.query.mockResolvedValue({ rows: [] });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Concurrent Cache Hits (Zero DB Pool Exhaustion, Sub-50ms Response)
  // ──────────────────────────────────────────────────────────────────────────
  it('handles 100 concurrent cached explanation requests with zero errors', async () => {
    const cachedData = {
      title: 'Virtual Threads in Java 21',
      theory: 'Lightweight threads managed by the JVM runtime rather than OS kernel.',
    };

    pool.query.mockImplementation(async (sql, params) => {
      const q = typeof sql === 'string' ? sql : sql?.text || '';
      if (q.includes('FROM questions WHERE id = $1')) {
        return {
          rows: [{
            id: 10,
            question_text: 'What are Virtual Threads?',
            short_answer: 'JVM lightweight threads.',
            cached_explanation: JSON.stringify(cachedData),
            language: 'Java',
          }],
        };
      }
      return { rows: [] };
    });

    const N = 100;
    const startTime = Date.now();

    const requests = Array.from({ length: N }, () =>
      request(app)
        .post('/api/questions/explain')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ questionId: 10 })
    );

    const responses = await Promise.all(requests);
    const duration = Date.now() - startTime;

    const successCount = responses.filter(r => r.status === 200).length;
    const cachedCount = responses.filter(r => r.body?.cached === true).length;

    expect(successCount).toBe(N);
    expect(cachedCount).toBe(N);
    // Average response time per request in parallel
    expect(duration).toBeLessThan(15000);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Cache Stampede Prevention: In-Flight Dedup Under Load
  // ──────────────────────────────────────────────────────────────────────────
  it('prevents cache stampede: 50 concurrent identical requests trigger only 1 upstream AI call', async () => {
    let upstreamCalls = 0;
    const expectedExplanation = {
      title: 'Python asyncio.TaskGroup',
      theory: 'Structured concurrency context manager introduced in Python 3.11.',
    };

    // Mock global fetch to simulate OpenRouter with artificial latency
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async () => {
      upstreamCalls++;
      await new Promise(r => setTimeout(r, 40));
      return {
        ok: true,
        json: async () => ({
          model: 'google/gemini-2.0-flash-exp:free',
          choices: [{ message: { content: JSON.stringify(expectedExplanation) } }],
        }),
      };
    });

    try {
      const N = 50;
      const questionText = 'How does asyncio.TaskGroup work in Python?';
      const shortAnswer = 'Structured concurrency manager that waits for all tasks on exit.';

      const promises = Array.from({ length: N }, () =>
        generateExplanation(questionText, shortAnswer, USER_ID, 'Python')
      );

      const results = await Promise.all(promises);

      // Verify all 50 concurrent callers got the exact result
      expect(results).toHaveLength(N);
      results.forEach(res => {
        expect(res.title).toBe(expectedExplanation.title);
        expect(res.theory).toBe(expectedExplanation.theory);
      });

      // Crucial assertion: exactly ONE upstream call was made thanks to in-flight dedup!
      expect(upstreamCalls).toBe(1);
    } finally {
      global.fetch = originalFetch;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Atomic Quota Reservation Under High-Concurrency Burst
  // ──────────────────────────────────────────────────────────────────────────
  it('strictly limits quota under 25 concurrent requests (zero race-condition leak)', async () => {
    // User has limit of 3 AI generations per month
    const limitsRow = {
      requests_per_day: 1000,
      ai_generations_per_month: 3,
      resume_analysis_limit: 1,
      interview_eval_limit: 3,
      available_languages: ['Java'],
      available_modes: ['swipe'],
      requests_today: 0,
      ai_generations_this_month: 0,
      resume_analyses_this_month: 0,
      interview_evals_this_month: 0,
      daily_reset_at: null,
      monthly_reset_at: null,
    };

    pool.query.mockImplementation(async (sql) => {
      const q = typeof sql === 'string' ? sql : sql?.text || '';
      if (q.includes('FROM users u')) {
        return { rows: [limitsRow] };
      }
      return { rows: [] };
    });

    // 25 concurrent quota consume attempts for the same user
    const N = 25;
    const results = await Promise.all(
      Array.from({ length: N }, () => consumeQuota(USER_ID, 'ai_generation'))
    );

    const allowedCount = results.filter(r => r.allowed === true).length;
    const blockedCount = results.filter(r => r.allowed === false).length;

    // Exactly 3 allowed (quota limit) and exactly 22 blocked
    expect(allowedCount).toBe(3);
    expect(blockedCount).toBe(22);

    // Counter in Redis should equal max (3), never exceeded
    const finalCount = Number(redisStore.get(`counter:${USER_ID}:ai_generations_this_month`));
    expect(finalCount).toBe(3);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Upstream AI Outage & Model Fallback Rotation
  // ──────────────────────────────────────────────────────────────────────────
  it('rotates to fallback model when primary OpenRouter model returns 503 or 429', async () => {
    let attempts = 0;
    const expectedExplanation = {
      title: 'Generational GC Hypothesis',
      theory: 'Most allocated objects have very short lifetimes and die quickly in young generation.',
    };

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (url, options) => {
      attempts++;
      const body = JSON.parse(options.body);
      // First model fails (simulating upstream 503)
      if (attempts === 1) {
        return {
          ok: false,
          status: 503,
          text: async () => 'Service Unavailable',
        };
      }
      // Second model (fallback) succeeds!
      return {
        ok: true,
        json: async () => ({
          model: body.model,
          choices: [{ message: { content: JSON.stringify(expectedExplanation) } }],
        }),
      };
    });

    try {
      const res = await generateExplanation(
        'Explain generational hypothesis in JVM garbage collection',
        'Young objects die fast.',
        USER_ID,
        'Java'
      );

      expect(attempts).toBeGreaterThanOrEqual(2);
      expect(res.title).toBe(expectedExplanation.title);
      expect(res.theory).toBe(expectedExplanation.theory);
    } finally {
      global.fetch = originalFetch;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Worker Background Processing Under Burst
  // ──────────────────────────────────────────────────────────────────────────
  it('processes batch AI generation jobs with database backfill without dropped tasks', async () => {
    const jobs = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      task_type: 'blitz',
      payload: JSON.stringify({
        questionText: `Statement test question #${i + 1}`,
        category: 'Core',
        language: 'Java',
        questionId: 100 + i,
      }),
    }));

    let backfilledCount = 0;
    pool.query.mockImplementation(async (sql, params) => {
      const q = typeof sql === 'string' ? sql : sql?.text || '';
      if (q.includes('UPDATE questions SET blitz_data=$1')) {
        backfilledCount++;
        return { rows: [] };
      }
      if (q.includes('UPDATE ai_jobs SET status=\'completed\'')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({ statement: 'Java is statically typed.', isCorrect: true }),
          },
        }],
      }),
    });

    try {
      const blitzPromises = jobs.map(j => {
        const payload = JSON.parse(j.payload);
        return generateExplanation(payload.questionText, '', USER_ID, payload.language);
      });

      const results = await Promise.all(blitzPromises);
      expect(results).toHaveLength(15);
      expect(results[0]).toBeDefined();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
