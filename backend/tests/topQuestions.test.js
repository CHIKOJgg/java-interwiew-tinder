import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test_secret';
const validToken = jwt.sign({ userId: '123456', plan: 'pro' }, 'test_secret');

const mockPoolQuery = vi.hoisted(() => vi.fn());

vi.mock('../src/config/database.js', () => ({
  default: { query: mockPoolQuery },
}));

vi.mock('../src/config/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

vi.mock('../src/config/redis.js', () => ({
  default: { get: vi.fn(), setex: vi.fn() },
  isConnected: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('../src/utils/telegram.js', () => ({
  default: {
    generateTelegramLink: vi.fn(() => 'https://t.me/test'),
    validateTelegramWebAppData: vi.fn().mockReturnValue({ id: '123', first_name: 'Test' }),
    sendNotification: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('pino-http', () => ({
  default: vi.fn(() => (req, res, next) => next()),
}));

const { default: app } = await import('../src/server.js');

describe('Top Interview Questions Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/questions/top returns paginated top questions', async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          category: 'Core Java',
          difficulty: 'Junior',
          question_text: 'What is the difference between JVM and JRE?',
          short_answer: 'JVM executes bytecode, JRE contains JVM + libraries',
          options: ['Option A', 'Option B'],
          language: 'Java',
          framework: null,
          topic: 'Architecture',
          tags: ['top', 'core'],
          is_top: true,
          top_rank: 1,
          cached_explanation: 'Detailed explanation text',
        },
        {
          id: 2,
          category: 'Collections',
          difficulty: 'Middle',
          question_text: 'How does HashMap work?',
          short_answer: 'Array of buckets with linked lists / red-black trees',
          options: ['Option 1', 'Option 2'],
          language: 'Java',
          framework: null,
          topic: 'Collections',
          tags: ['top'],
          is_top: true,
          top_rank: 2,
          cached_explanation: null,
        },
      ],
    });

    const res = await request(app)
      .get('/api/questions/top?language=Java&limit=10')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.language).toBe('Java');
    expect(res.body.questions).toHaveLength(2);
    expect(res.body.questions[0].question).toBe('What is the difference between JVM and JRE?');
    expect(res.body.questions[0].isTop).toBe(true);
    expect(res.body.questions[0].topRank).toBe(1);
    expect(res.body.questions[0].shortAnswer).toBe('JVM executes bytecode, JRE contains JVM + libraries');
  });

  it('GET /api/questions/top/stats returns top questions counts and categories', async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [
        { category: 'Core Java', count: '15' },
        { category: 'Collections', count: '10' },
        { category: 'Concurrency', count: '8' },
      ],
    });

    const res = await request(app)
      .get('/api/questions/top/stats?language=Java')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.language).toBe('Java');
    expect(res.body.total).toBe(33);
    expect(res.body.categories).toHaveLength(3);
    expect(res.body.categories[0]).toEqual({ name: 'Core Java', count: 15 });
  });

  it('GET /api/questions/feed supports top=true filter', async () => {
    // 0. requireEntitlement('mode') limits query
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{
        requests_per_day: 200, ai_generations_per_month: 500, resume_analysis_limit: 3,
        interview_eval_limit: 20, available_languages: ['Java', 'Python'],
        available_modes: ['swipe', 'test', 'top'],
        model_priority: 'standard', requests_today: 0, ai_generations_this_month: 0,
      }],
    });
    // 1. user_preferences query
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ selected_categories: ['Core Java'], selected_language: 'Java' }],
    });
    // 2. feed query
    mockPoolQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 101,
          category: 'Core Java',
          difficulty: 'Junior',
          question_text: 'Why is String immutable?',
          short_answer: 'For security and string pool caching in memory.',
          options: ['A', 'B'],
          language: 'Java',
          is_top: true,
          top_rank: 1,
        },
      ],
    });

    const res = await request(app)
      .get('/api/questions/feed?language=Java&top=true&mode=swipe&limit=1')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(1);
    expect(res.body.questions[0].isTop).toBe(true);
    expect(res.body.questions[0].topRank).toBe(1);
  });
});
