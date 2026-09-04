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
const regularUserToken = jwt.sign({ userId: USER_ID, plan: 'free' }, 'test_secret');
const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';

describe('Persona: Bug Hunter & Adversary (Security, Exploits & Bug Hunting Mode)', () => {
  beforeEach(() => {
    pool.query.mockReset();
    pool.query.mockImplementation(async () => ({ rows: [] }));
  });

  describe('Privilege Escalation & Unauthorized Access', () => {
    it('blocks regular users from accessing admin routes (/api/admin/clear-cache)', async () => {
      pool.query.mockImplementation(async (sql) => {
        const q = typeof sql === 'string' ? sql : sql.text;
        if (q.includes('FROM users WHERE telegram_id')) {
          return { rows: [{ id: 1, telegram_id: USER_ID, plan: 'free', language: 'Java' }] };
        }
        return { rows: [] };
      });

      const res = await request(app)
        .post('/api/admin/clear-cache')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({});

      expect([401, 403]).toContain(res.status);
    });

    it('rejects requests with forged/tampered JWT tokens', async () => {
      const res = await request(app)
        .get('/api/user/stats')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated requests to protected endpoints', async () => {
      const res = await request(app)
        .post('/api/questions/swipe')
        .send({ questionId: 1, status: 'known' });

      expect(res.status).toBe(401);
    });
  });

  describe('Adversarial Inputs & Boundary Testing', () => {
    it('handles parameterized SQL injection payloads in question reports without leaking DB errors', async () => {
      pool.query.mockImplementation(async (sql) => {
        const q = typeof sql === 'string' ? sql : sql.text;
        if (q.includes('FROM users WHERE telegram_id')) {
          return { rows: [{ id: 1, telegram_id: USER_ID, plan: 'free', language: 'Java' }] };
        }
        if (q.includes('INSERT INTO question_reports')) {
          return { rows: [{ id: 99 }] };
        }
        if (q.includes('COUNT(*) FROM question_reports')) {
          return { rows: [{ count: '1' }] };
        }
        return { rows: [] };
      });

      const maliciousReason = "'; DROP TABLE users; --";
      const res = await request(app)
        .post('/api/questions/10/report')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({ reason: maliciousReason, comment: 'Bug hunt test' });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).not.toHaveProperty('stack');
    });

    it('rejects invalid swipe status values', async () => {
      const res = await request(app)
        .post('/api/questions/swipe')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({ questionId: 1, status: 'super_like_unsupported' });

      expect([400, 422]).toContain(res.status);
    });
  });

  describe('Bug Hunting Game Mode', () => {
    it('evaluates bug hunting answer against generated bug data', async () => {
      pool.query.mockImplementation(async (sql) => {
        const q = typeof sql === 'string' ? sql : sql.text;
        if (q.includes('FROM users WHERE telegram_id')) {
          return { rows: [{ id: 1, telegram_id: USER_ID, plan: 'free', language: 'Java' }] };
        }
        if (q.includes('FROM questions WHERE id')) {
          return {
            rows: [{
              id: 50,
              question_text: 'Fix NPE in Java stream',
              bug_hunting_data: {
                code: 'String s = null; s.length();',
                bug: 'Null check missing',
                options: ['Null check missing', 'Array index out of bounds', 'Memory leak'],
              },
            }],
          };
        }
        return { rows: [] };
      });

      const res = await request(app)
        .post('/api/questions/bug-hunt-answer')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({ questionId: 50, answer: 'Null check missing' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('isCorrect', true);
      expect(res.body.correctAnswer).toBe('Null check missing');
    });
  });
});
