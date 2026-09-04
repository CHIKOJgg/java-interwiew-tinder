import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../src/config/database.js', () => ({
  default: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    on: vi.fn(),
    connect: vi.fn(),
  }
}));

vi.mock('../src/config/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  }
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
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    on: vi.fn(),
  },
  isConnected: vi.fn().mockResolvedValue(true),
}));

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_stats_secret';

const { default: app } = await import('../src/server.js');
const { default: pool } = await import('../src/config/database.js');

describe('User Statistics API', () => {
  const JWT_SECRET = 'test_stats_secret';
  const USER_ID = '123456789';
  let token;

  beforeAll(() => {
    token = jwt.sign({ userId: USER_ID, plan: 'free' }, JWT_SECRET);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/stats', () => {
    it('returns accuracy, totalSeen, and breakdown by language (Java and Python)', async () => {
      // 1. result query (user_progress for chosen language)
      pool.query.mockResolvedValueOnce({
        rows: [{ known_count: '8', unknown_count: '2', total_seen: '10' }]
      });
      // 2. totalResult query (questions count for language)
      pool.query.mockResolvedValueOnce({
        rows: [{ total: '50' }]
      });
      // 3. userStreak query
      pool.query.mockResolvedValueOnce({
        rows: [{ current_streak: 5, longest_streak: 12 }]
      });
      // 4. langBreakdown query
      pool.query.mockResolvedValueOnce({
        rows: [
          { language: 'Java', known_count: '8', unknown_count: '2', total_seen: '10' },
          { language: 'Python', known_count: '15', unknown_count: '5', total_seen: '20' }
        ]
      });

      const res = await request(app)
        .get('/api/stats?language=Java')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.known).toBe(8);
      expect(res.body.unknown).toBe(2);
      expect(res.body.totalSeen).toBe(10);
      expect(res.body.accuracy).toBe(80); // 8/10 * 100
      expect(res.body.streak).toBe(5);
      expect(res.body.longestStreak).toBe(12);
      expect(res.body.byLanguage).toBeDefined();
      expect(res.body.byLanguage.Java).toEqual({
        known: 8, unknown: 2, totalSeen: 10, accuracy: 80
      });
      expect(res.body.byLanguage.Python).toEqual({
        known: 15, unknown: 5, totalSeen: 20, accuracy: 75
      });
    });

    it('handles 0 answered questions gracefully with 0% accuracy', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ known_count: '0', unknown_count: '0', total_seen: '0' }]
      });
      pool.query.mockResolvedValueOnce({
        rows: [{ total: '30' }]
      });
      pool.query.mockResolvedValueOnce({
        rows: [{ current_streak: 0, longest_streak: 0 }]
      });
      pool.query.mockResolvedValueOnce({
        rows: []
      });

      const res = await request(app)
        .get('/api/stats?language=Python')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.accuracy).toBe(0);
      expect(res.body.byLanguage.Python.accuracy).toBe(0);
      expect(res.body.byLanguage.Java.accuracy).toBe(0);
    });
  });

  describe('GET /api/stats/topics', () => {
    it('calculates accuracy relative to answered questions, not total questions in db', async () => {
      // Suppose category Concurrency has 20 total questions in DB.
      // User answered 2 questions, both known (2 known, 0 unknown).
      // Correct accuracy is 100%, coverage is 10% (2/20).
      pool.query.mockResolvedValueOnce({
        rows: [
          { category: 'Concurrency', known: '2', unknown: '0', total: '20' },
          { category: 'Collections', known: '3', unknown: '1', total: '15' },
          { category: 'Spring', known: '0', unknown: '0', total: '25' }
        ]
      });

      const res = await request(app)
        .get('/api/stats/topics?language=Java')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.topics).toHaveLength(3);

      const concurrency = res.body.topics.find(t => t.name === 'Concurrency');
      expect(concurrency.known).toBe(2);
      expect(concurrency.unknown).toBe(0);
      expect(concurrency.answered).toBe(2);
      expect(concurrency.accuracy).toBe(100); // 2/2 = 100%
      expect(concurrency.coverage).toBe(10);   // 2/20 = 10%

      const collections = res.body.topics.find(t => t.name === 'Collections');
      expect(collections.answered).toBe(4);
      expect(collections.accuracy).toBe(75); // 3/4 = 75%
      expect(collections.coverage).toBe(20); // 3/15 = 20%

      const spring = res.body.topics.find(t => t.name === 'Spring');
      expect(spring.answered).toBe(0);
      expect(spring.accuracy).toBe(0);
      expect(spring.coverage).toBe(0);
    });
  });

  describe('GET /api/stats/answers', () => {
    it('returns answered questions with pagination, summary, and status', async () => {
      // 1. countResult query
      pool.query.mockResolvedValueOnce({
        rows: [{ count: '2' }]
      });
      // 2. summaryResult query
      pool.query.mockResolvedValueOnce({
        rows: [{ known_count: '1', unknown_count: '1', total_seen: '2' }]
      });
      // 3. list query
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 101,
            question_text: 'What are Python GIL limitations?',
            short_answer: 'GIL prevents true parallel bytecode execution across multiple CPU cores in CPython.',
            category: 'Concurrency',
            difficulty: 'Middle',
            language: 'Python',
            framework: 'AsyncIO',
            topic: 'GIL',
            is_top: true,
            top_rank: 5,
            status: 'unknown',
            answered_at: '2026-09-04T12:00:00Z',
            interval_days: 1,
            repetition_number: 0,
          },
          {
            id: 102,
            question_text: 'What is a Python generator?',
            short_answer: 'A function that returns an iterator which yields values one at a time using yield.',
            category: 'Core',
            difficulty: 'Junior',
            language: 'Python',
            framework: null,
            topic: 'Generators',
            is_top: true,
            top_rank: 1,
            status: 'known',
            answered_at: '2026-09-04T12:30:00Z',
            interval_days: 3,
            repetition_number: 1,
          }
        ]
      });

      const res = await request(app)
        .get('/api/stats/answers?language=Python&status=all')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.questions).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
      expect(res.body.pagination.hasMore).toBe(false);
      expect(res.body.summary.totalAnswered).toBe(2);
      expect(res.body.summary.knownCount).toBe(1);
      expect(res.body.summary.unknownCount).toBe(1);
      expect(res.body.summary.accuracy).toBe(50);

      const q1 = res.body.questions[0];
      expect(q1.id).toBe(101);
      expect(q1.question).toBe('What are Python GIL limitations?');
      expect(q1.status).toBe('unknown');
      expect(q1.language).toBe('Python');
    });

    it('filters by status=unknown (mistakes only)', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      pool.query.mockResolvedValueOnce({ rows: [{ known_count: '5', unknown_count: '1', total_seen: '6' }] });
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 201,
          question_text: 'Virtual Threads pinning in Java 21',
          short_answer: 'Synchronized blocks pin virtual threads to carrier threads.',
          category: 'Concurrency',
          difficulty: 'Senior',
          language: 'Java',
          framework: null,
          topic: 'Virtual Threads',
          is_top: true,
          top_rank: 10,
          status: 'unknown',
          answered_at: '2026-09-04T14:00:00Z',
        }]
      });

      const res = await request(app)
        .get('/api/stats/answers?language=Java&status=unknown')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.questions).toHaveLength(1);
      expect(res.body.questions[0].status).toBe('unknown');
      expect(res.body.summary.accuracy).toBe(83); // 5/6 * 100
    });
  });
});
