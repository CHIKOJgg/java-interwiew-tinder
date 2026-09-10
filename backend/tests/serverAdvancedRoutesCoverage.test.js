import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ─── Mocks ─────────────────────────────────────────────────────────────
vi.mock('../src/config/database.js', () => {
  const query = vi.fn().mockResolvedValue({ rows: [] });
  const client = {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    release: vi.fn(),
  };
  return {
    default: {
      query,
      connect: vi.fn().mockResolvedValue(client),
      on: vi.fn(),
    },
  };
});

vi.mock('../src/config/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
    levels: { values: { info: 30, error: 50 } },
  },
}));

vi.mock('pino-http', () => ({
  default: vi.fn().mockReturnValue((req, res, next) => {
    req.log = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
    next();
  }),
}));

vi.mock('../src/config/redis.js', () => {
  const store = new Map();
  return {
    default: {
      get: vi.fn().mockImplementation(async (key) => store.get(key) || null),
      set: vi.fn().mockImplementation(async (key, val) => {
        store.set(key, val);
        return 'OK';
      }),
      setex: vi.fn().mockImplementation(async (key, ttl, val) => {
        store.set(key, val);
        return 'OK';
      }),
      del: vi.fn().mockResolvedValue(1),
      keys: vi.fn().mockResolvedValue([]),
      on: vi.fn(),
    },
    isConnected: vi.fn().mockReturnValue(true),
  };
});

vi.mock('../src/services/referralService.js', () => ({
  referralService: {
    getStats: vi.fn().mockResolvedValue({
      totalReferrals: 8,
      activeReferrals: 5,
      bonusDaysEarned: 25,
      referralCode: 'REF123',
    }),
  },
}));

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_for_advanced_routes';
process.env.ADMIN_TELEGRAM_IDS = '111111111';

const { default: app } = await import('../src/server.js');
const { default: pool } = await import('../src/config/database.js');

const JWT_SECRET = 'test_secret_for_advanced_routes';
const USER_ID = '987654321';
const ADMIN_ID = '111111111';

const userToken = jwt.sign({ userId: USER_ID, plan: 'pro' }, JWT_SECRET);
const adminToken = jwt.sign({ userId: ADMIN_ID, plan: 'admin' }, JWT_SECRET);

describe('Server Advanced Routes Coverage Suite', () => {
  beforeEach(() => {
    pool.query.mockReset();
    pool.query.mockResolvedValue({ rows: [] });
  });

  it('serves API index endpoint with available endpoints', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.name).toContain('Interview Tinder API');
    expect(res.body.endpoints).toHaveProperty('health');
    expect(res.body.endpoints).toHaveProperty('categories');
  });

  it('serves /api/public/stats with user, question, company counts', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: '1500' }] })
      .mockResolvedValueOnce({ rows: [{ count: '990' }] })
      .mockResolvedValueOnce({ rows: [{ count: '45' }] });

    const res = await request(app).get('/api/public/stats');
    expect(res.status).toBe(200);
    expect(res.body.users).toBe(1500);
    expect(res.body.questions).toBe(990);
    expect(res.body.companies).toBe(45);
  });

  it('serves /api/filters and /api/categories for language', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ category: 'Collections', count: 120 }] })
      .mockResolvedValueOnce({ rows: [{ framework: 'Spring Boot', count: 80 }] })
      .mockResolvedValueOnce({ rows: [{ topic: 'HashMap', count: 40 }] })
      .mockResolvedValueOnce({ rows: [{ difficulty: 'Middle', count: 200 }] });

    const resFilters = await request(app).get('/api/filters?language=Java');
    expect(resFilters.status).toBe(200);
    expect(resFilters.body.language).toBe('Java');
    expect(resFilters.body.categories[0].name).toBe('Collections');
    expect(resFilters.body.frameworks[0].name).toBe('Spring Boot');

    pool.query
      .mockResolvedValueOnce({ rows: [{ category: 'Core', count: 90 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const resCats = await request(app).get('/api/categories?language=Java');
    expect(resCats.status).toBe(200);
    expect(resCats.body.categories[0].name).toBe('Core');
  });

  it('serves /api/companies list ordered by sort order', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { name: 'Google', icon: 'google.svg' },
        { name: 'Yandex', icon: 'yandex.svg' },
      ],
    });

    const res = await request(app).get('/api/companies');
    expect(res.status).toBe(200);
    expect(res.body.companies.length).toBe(2);
    expect(res.body.companies[0].name).toBe('Google');
  });

  it('serves user stats, accuracy and streak via /api/stats', async () => {
    // 1. Progress stats
    pool.query.mockResolvedValueOnce({
      rows: [{ known_count: '40', unknown_count: '10', total_seen: '50' }],
    });
    // 2. Total active questions
    pool.query.mockResolvedValueOnce({
      rows: [{ total: '300' }],
    });
    // 3. User streaks
    pool.query.mockResolvedValueOnce({
      rows: [{ current_streak: 5, longest_streak: 12 }],
    });
    // 4. Lang breakdown
    pool.query.mockResolvedValueOnce({
      rows: [{ language: 'Java', known_count: '40', unknown_count: '10', total_seen: '50' }],
    });

    const res = await request(app)
      .get('/api/stats?language=Java')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.known).toBe(40);
    expect(res.body.unknown).toBe(10);
    expect(res.body.totalSeen).toBe(50);
    expect(res.body.accuracy).toBe(80);
    expect(res.body.streak).toBe(5);
    expect(res.body.longestStreak).toBe(12);
  });

  it('serves time series progress via /api/stats/history', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { day: '2026-09-01', known: 5, unknown: 1 },
        { day: '2026-09-02', known: 8, unknown: 2 },
      ],
    });

    const res = await request(app)
      .get('/api/stats/history?period=7d&language=Java')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.history.length).toBe(2);
    expect(res.body.history[0].day).toBe('2026-09-01');
  });

  it('serves topic breakdown via /api/stats/topics', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { category: 'Java Core', known: '15', total: '20' },
        { category: 'Spring', known: '8', total: '10' },
      ],
    });

    const res = await request(app)
      .get('/api/stats/topics?language=Java')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.topics).toBeDefined();
  });

  it('computes category stats via /api/stats/categories', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ known: '12', total: '30' }],
    });

    const categoriesParam = encodeURIComponent(JSON.stringify(['Java Core', 'Collections']));
    const res = await request(app)
      .get(`/api/stats/categories?language=Java&categories=${categoriesParam}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.known).toBe(12);
    expect(res.body.total).toBe(30);
  });

  it('computes authenticated user percentile via /api/stats/percentile', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ below_count: '90', total_count: '100' }],
    });

    const res = await request(app)
      .get('/api/stats/percentile?language=Java&score=15')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.percentile).toBe(90);
  });

  it('serves referral statistics via /api/referrals/stats', async () => {
    const res = await request(app)
      .get('/api/referrals/stats')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.totalReferrals).toBe(8);
    expect(res.body.bonusDaysEarned).toBe(25);
  });

  it('serves test distractors with exclusion filter via /api/questions/distractors', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 10, short_answer: 'Distractor answer 1' },
        { id: 11, short_answer: 'Distractor answer 2' },
      ],
    });

    const res = await request(app)
      .get('/api/questions/distractors?language=Java&limit=2&exclude=1,2,3')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.distractors.length).toBe(2);
    expect(res.body.distractors[0].text).toBe('Distractor answer 1');
  });

  it('serves weak questions for pro review mode via /api/questions/weak', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 55,
          category: 'JVM',
          difficulty: 'Middle',
          question_text: 'What are GC roots?',
          short_answer: 'Objects accessible outside the heap.',
          cached_explanation: 'Stack frames, JNI, system classes',
          language: 'Java',
        },
      ],
    });

    const res = await request(app)
      .get('/api/questions/weak?language=Java')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.questions.length).toBe(1);
    expect(res.body.questions[0].question).toBe('What are GC roots?');
  });

  it('allows admin to update and delete questions via admin routes', async () => {
    // 1. DELETE /api/admin/questions/:questionId
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    const delRes = await request(app)
      .delete('/api/admin/questions/42')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    // 2. PUT /api/admin/questions/:questionId
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    const putRes = await request(app)
      .put('/api/admin/questions/42')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        question_text: 'Updated question content',
        short_answer: 'Updated answer',
      });

    expect(putRes.status).toBe(200);
    expect(putRes.body.success).toBe(true);
  });
});
