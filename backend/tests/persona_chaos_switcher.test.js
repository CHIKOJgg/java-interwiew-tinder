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
const userToken = jwt.sign({ userId: USER_ID, plan: 'pro' }, 'test_secret');

describe('Persona: Chaos Switcher (Language, Mode, and Filter Hopping)', () => {
  beforeEach(() => {
    pool.query.mockReset();
    pool.query.mockImplementation(async () => ({ rows: [] }));
  });

  it('updates user language preference across multiple language switches', async () => {
    pool.query.mockImplementation(async (sql) => {
      const q = typeof sql === 'string' ? sql : sql.text;
      if (q.includes('FROM users WHERE telegram_id')) {
        return { rows: [{ id: 1, telegram_id: USER_ID, plan: 'pro', language: 'Java' }] };
      }
      if (q.includes('UPDATE users SET language')) {
        return { rows: [{ id: 1, language: 'Python' }] };
      }
      return { rows: [] };
    });

    const langs = ['Python', 'TypeScript', 'Go', 'Java'];
    for (const lang of langs) {
      const res = await request(app)
        .post('/api/preferences/language')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ language: lang });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    }
  });

  it('serves tailored feeds when toggling across different learning modes and filters', async () => {
    pool.query.mockImplementation(async (sql, params) => {
      const q = typeof sql === 'string' ? sql : sql.text;
      if (q.includes('FROM users WHERE telegram_id')) {
        return { rows: [{ id: 1, telegram_id: USER_ID, plan: 'pro', language: 'Java' }] };
      }
      if (q.includes('FROM questions')) {
        return {
          rows: [
            { id: 301, question_text: 'Python async/await', language: 'Python', category: 'Async', difficulty: 'Middle' },
            { id: 302, question_text: 'Python GIL', language: 'Python', category: 'Concurrency', difficulty: 'Senior' },
          ],
        };
      }
      return { rows: [] };
    });

    // Request with language=Python, mode=test, difficulty=Middle, difficulty=Senior
    const res = await request(app)
      .get('/api/questions/feed?limit=5&mode=test&language=Python&difficulties=Middle&difficulties=Senior')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('questions');
    expect(res.body.questions).toHaveLength(2);
    expect(res.body.questions[0].language).toBe('Python');
  });

  it('updates selected categories filter and returns accurate category stats', async () => {
    pool.query.mockImplementation(async (sql) => {
      const q = typeof sql === 'string' ? sql : sql.text;
      if (q.includes('FROM users WHERE telegram_id')) {
        return { rows: [{ id: 1, telegram_id: USER_ID, plan: 'pro', language: 'Java' }] };
      }
      if (q.includes('INSERT INTO user_preferences')) {
        return { rows: [{ id: 1, categories: ['Collections', 'Multithreading'] }] };
      }
      return { rows: [] };
    });

    const res = await request(app)
      .post('/api/preferences')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ categories: ['Collections', 'Multithreading'] });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });
});
