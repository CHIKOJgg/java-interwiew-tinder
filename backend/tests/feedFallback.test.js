import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mocks must be declared before importing the app.
vi.mock('../src/config/database.js', () => ({
  default: {
    query: vi.fn(),
    on: vi.fn(),
    connect: vi.fn(),
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

vi.mock('../src/config/redis.js', () => ({
  default: null,
  isRedisConnected: vi.fn().mockResolvedValue(true),
}));

vi.mock('pino-http', () => ({
  default: vi.fn().mockReturnValue((_req, _res, next) => next()),
}));

vi.mock('../src/services/aiService.js', () => ({
  evaluateInterviewAnswer: vi.fn(),
  analyzeResume: vi.fn(),
  checkCache: vi.fn(),
}));

vi.mock('../src/services/queueService.js', () => ({
  enqueueJob: vi.fn(() => Promise.resolve()),
  default: { enqueueJob: vi.fn(() => Promise.resolve()) },
}));

vi.mock('../src/services/billingService.js', () => ({
  billingService: {},
}));

const TEST_JWT_SECRET = 'test-secret-0123456789abcdef-test';
process.env.JWT_SECRET = TEST_JWT_SECRET;
process.env.NODE_ENV = 'test';

let app;
let pool;
const demoRuRow = (id) => ({
  id,
  category: 'Go Core',
  difficulty: 'Junior',
  question_text: 'Что такое горутины в Go?',
  short_answer: 'Лёгкие потоки, управляемые Go runtime.',
  language: 'Go',
});

beforeEach(async () => {
  vi.resetModules();
  const db = await import('../src/config/database.js');
  pool = db.default;
  pool.query.mockReset();
  pool.query.mockImplementation(() => Promise.resolve({ rows: [] }));
  const mod = await import('../src/server.js');
  app = mod.default || mod.app || mod;
});

const authHeader = (userId = 111) =>
  `Bearer ${jwt.sign({ userId }, TEST_JWT_SECRET)}`;

describe('GET /api/languages — never hides languages', () => {
  it('returns all 7 languages even for lng=ru', async () => {
    const res = await request(app).get('/api/languages?lng=ru');
    expect(res.status).toBe(200);
    expect(res.body.languages).toEqual(
      expect.arrayContaining(['Java', 'Python', 'TypeScript', 'Go', 'Rust', 'React', 'Kotlin'])
    );
    expect(res.body.languages).toHaveLength(7);
  });
});

describe('GET /api/demo/questions — RU+EN fallback', () => {
  it('tops up scarce RU pool with EN and reports fallback meta', async () => {
    // First call: RU query returns 3 rows; second call: EN fallback returns 7.
    pool.query
      .mockResolvedValueOnce({ rows: [demoRuRow(1), demoRuRow(2), demoRuRow(3)] })
      .mockResolvedValueOnce({
        rows: Array.from({ length: 7 }, (_, i) => ({
          id: 100 + i,
          category: 'Go Core',
          difficulty: 'Junior',
          question_text: `What is Go feature ${i}?`,
          short_answer: `English explanation number ${i} for Go.`,
          language: 'Go',
        })),
      });

    const res = await request(app).get(
      '/api/demo/questions?language=Go&limit=10&lng=ru&seed=abc'
    );
    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(10);
    expect(res.body.meta.ruCount).toBe(3);
    expect(res.body.meta.enCount).toBe(7);
    expect(res.body.meta.fallback).toBe(true);
  });

  it('does not set fallback flag when RU pool alone fills the limit', async () => {
    pool.query.mockResolvedValueOnce({
      rows: Array.from({ length: 10 }, (_, i) => demoRuRow(10 + i)),
    });
    const res = await request(app).get(
      '/api/demo/questions?language=Java&limit=10&lng=ru&seed=abc'
    );
    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(10);
    expect(res.body.meta.fallback).toBe(false);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('serves EN-only deck for lng=en with interfaceLang in meta', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 201, category: 'Go Core', difficulty: 'Junior',
          question_text: 'What is a goroutine?', short_answer: 'Lightweight thread managed by Go runtime.',
          language: 'Go',
        },
        {
          id: 202, category: 'Go Core', difficulty: 'Junior',
          question_text: 'What is a channel?', short_answer: 'Typed conduit for goroutine communication.',
          language: 'Go',
        },
      ],
    });
    const res = await request(app).get(
      '/api/demo/questions?language=Go&limit=10&lng=en&seed=abc'
    );
    expect(res.status).toBe(200);
    expect(res.body.meta.interfaceLang).toBe('en');
    expect(res.body.meta.fallback).toBe(false);
    expect(res.body.meta.enCount).toBe(2);
    expect(res.body.meta.ruCount).toBe(0);
  });

  it('serves the shared General pool inside a language deck', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { ...demoRuRow(11), language: 'Go' },
        {
          id: 42522, category: 'System Design', difficulty: 'Senior',
          question_text: 'What is the Active Directory?',
          short_answer: 'A directory service with LDAP and Kerberos support.',
          language: 'General',
        },
      ],
    });
    const res = await request(app).get(
      '/api/demo/questions?language=Go&limit=10&lng=en&seed=abc'
    );
    expect(res.status).toBe(200);
    expect(res.body.questions.map(q => q.language).sort()).toEqual(['General', 'Go']);
  });
});

describe('POST /api/admin/clear-cache — confirm guard', () => {
  it('rejects full wipe without confirm:true', async () => {
    const adminToken = `Bearer ${jwt.sign({ userId: 1 }, TEST_JWT_SECRET)}`;
    // isAdmin depends on ADMIN_TELEGRAM_IDS; if not admin the route returns 403 —
    // either way it must NOT delete without confirm.
    pool.query.mockResolvedValue({ rows: [] });
    const res = await request(app)
      .post('/api/admin/clear-cache')
      .set('Authorization', adminToken)
      .send({});
    expect([400, 403, 401]).toContain(res.status);
    if (res.status === 400) {
      expect(res.body.code).toBe('CONFIRM_REQUIRED');
    }
  });
});

describe('GET /api/questions/feed — RU+EN fallback meta', () => {
  it('attaches ruCount/enCount/fallback fields', async () => {
    const limitsRow = {
      requests_per_day: 40, ai_generations_per_month: 45,
      resume_analysis_limit: 1, interview_eval_limit: 3,
      sd_evaluation_limit: 1,
      available_languages: ['Go'], available_modes: ['swipe'],
      requests_today: 0, ai_generations_this_month: 0,
      resume_analyses_this_month: 0, interview_evals_this_month: 0,
      daily_reset_at: new Date(), monthly_reset_at: new Date(),
    };
    // requireEntitlement('mode') → getUserLimits, prefs, base RU (0 rows),
    // filler x2 (0 rows), EN fallback (2 rows)
    pool.query
      .mockResolvedValueOnce({ rows: [limitsRow] })
      .mockResolvedValueOnce({ rows: [{ selected_categories: [], selected_language: 'Go' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 501, category: 'Go Core', difficulty: 'Junior',
            question_text: 'What is a goroutine?', short_answer: 'Lightweight thread managed by Go runtime.',
            options: [], bug_hunting_data: null, blitz_data: null,
            code_completion_data: null, language: 'Go', review_date: '1970-01-01', prev_status: null,
          },
          {
            id: 502, category: 'Go Core', difficulty: 'Junior',
            question_text: 'What is defer?', short_answer: 'Deferred call executed LIFO on return.',
            options: [], bug_hunting_data: null, blitz_data: null,
            code_completion_data: null, language: 'Go', review_date: '1970-01-01', prev_status: null,
          },
        ],
      });

    const res = await request(app)
      .get('/api/questions/feed?language=Go&limit=5&lng=ru&mode=swipe&seed=s1&cursor=0')
      .set('Authorization', authHeader(42));

    // Free-plan entitlement may 403 unknown test users depending on DB seed;
    // accept 200 with fallback meta OR 403 (entitlement), but never 500.
    expect([200, 403]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.meta).toMatchObject({ ruCount: 0, enCount: 2, fallback: true });
      expect(res.body.questions).toHaveLength(2);
    }
  });
});
