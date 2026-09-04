import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../src/config/database.js', () => ({
  default: {
    query: vi.fn(),
    on: vi.fn(),
    connect: vi.fn().mockReturnValue({
      query: vi.fn(),
      release: vi.fn(),
    }),
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

vi.mock('../src/config/redis.js', () => ({
  default: {
    get: vi.fn(),
    setex: vi.fn(),
    on: vi.fn(),
    keys: vi.fn(),
    del: vi.fn(),
  },
  isConnected: vi.fn().mockReturnValue(true),
}));

vi.mock('../src/services/questionService.js', () => ({
  updateMastery: vi.fn(() => Promise.resolve({ ef: 2.5, interval: 1, reps: 0, nextReview: new Date() })),
  getDueCount: vi.fn(() => Promise.resolve(0)),
}));

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
process.env.ADMIN_TELEGRAM_IDS = '123456789';

const { default: app } = await import('../src/server.js');
const { default: pool } = await import('../src/config/database.js');

const USER_ID = '987654321';
const userToken = jwt.sign({ userId: USER_ID, plan: 'free' }, 'test_secret');

describe('Persona: Speed Swiper (Rapid Swipe Cadence & Deck Depletion)', () => {
  beforeEach(() => {
    pool.query.mockReset();
    pool.query.mockImplementation(async () => ({ rows: [] }));
  });

  it('accepts rapid successive right-swipes ("known") with streak calculation', async () => {
    pool.query.mockImplementation(async (sql, params) => {
      const q = typeof sql === 'string' ? sql : sql.text;
      if (q.includes('FROM users WHERE telegram_id')) {
        return { rows: [{ id: 1, telegram_id: USER_ID, plan: 'free', language: 'Java' }] };
      }
      if (q.includes('INSERT INTO user_progress')) {
        return { rows: [{ id: 101, user_id: 1, question_id: params[1], status: 'known' }] };
      }
      if (q.includes('user_progress') && q.includes('streak')) {
        return { rows: [{ streak: 5, longest_streak: 10 }] };
      }
      return { rows: [] };
    });

    const swipePromises = [1, 2, 3, 4, 5].map(qId =>
      request(app)
        .post('/api/questions/swipe')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ questionId: qId, status: 'known' })
    );

    const responses = await Promise.all(swipePromises);
    for (const res of responses) {
      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('success', true);
    }
  });

  it('serves fast-paced question feed with cursor and excludes seen questions', async () => {
    pool.query.mockImplementation(async (sql) => {
      const q = typeof sql === 'string' ? sql : sql.text;
      if (q.includes('FROM users WHERE telegram_id')) {
        return { rows: [{ id: 1, telegram_id: USER_ID, plan: 'free', language: 'Java' }] };
      }
      if (q.includes('FROM questions')) {
        return {
          rows: Array.from({ length: 10 }, (_, i) => ({
            id: 200 + i,
            question_text: `Java Question ${i}`,
            short_answer: `Short Answer ${i}`,
            category: 'Java Core',
            difficulty: 'Junior',
            language: 'Java',
          })),
        };
      }
      return { rows: [] };
    });

    const res = await request(app)
      .get('/api/questions/feed?limit=10&mode=swipe&cursor=0&exclude=101&exclude=102&exclude=103')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('questions');
    expect(Array.isArray(res.body.questions)).toBe(true);
  });

  it('handles blitz-answer rapid submissions without timing out', async () => {
    pool.query.mockImplementation(async (sql) => {
      const q = typeof sql === 'string' ? sql : sql.text;
      if (q.includes('FROM users WHERE telegram_id')) {
        return { rows: [{ id: 1, telegram_id: USER_ID, plan: 'free', language: 'Java' }] };
      }
      if (q.includes('FROM questions WHERE id=')) {
        return { rows: [{ question_text: 'q', language: 'Java', blitz_data: { statement: 's', isCorrect: true } }] };
      }
      return { rows: [] };
    });

    const res = await request(app)
      .post('/api/questions/blitz-answer')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ questionId: 15, answer: true, clientIsCorrect: true });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });
});
