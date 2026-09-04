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

vi.mock('../src/services/aiService.js', () => ({
  evaluateInterviewAnswer: vi.fn(),
  analyzeResume: vi.fn(),
  checkCache: vi.fn(),
}));

vi.mock('../src/services/queueService.js', () => ({
  enqueueJob: vi.fn(() => Promise.resolve({ id: 'job-123' })),
}));

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
process.env.ADMIN_TELEGRAM_IDS = '123456789';

const { default: app } = await import('../src/server.js');
const { default: pool } = await import('../src/config/database.js');
const { default: redis } = await import('../src/config/redis.js');
const { evaluateInterviewAnswer, analyzeResume, checkCache } = await import('../src/services/aiService.js');

const USER_ID = '987654321';
const userToken = jwt.sign({ userId: USER_ID, plan: 'free' }, 'test_secret');
const proToken = jwt.sign({ userId: USER_ID, plan: 'pro' }, 'test_secret');

const mockUserLimits = {
  requests_per_day: 40,
  ai_generations_per_month: 45,
  resume_analysis_limit: 10,
  interview_eval_limit: 50,
  available_languages: ['Java', 'Python', 'TypeScript'],
  available_modes: ['swipe', 'test', 'mock-interview', 'system-design'],
  model_priority: 'standard',
  sd_evaluation_limit: 5,
  requests_today: 0,
  ai_generations_this_month: 0,
  resume_analyses_this_month: 0,
  interview_evals_this_month: 0,
  daily_reset_at: new Date().toISOString(),
  monthly_reset_at: new Date().toISOString(),
};

describe('Persona: AI Connoisseur (Explanations, Mock Interviews & Resume Analysis)', () => {
  beforeEach(() => {
    pool.query.mockReset();
    redis.get.mockReset();
    redis.get.mockResolvedValue(null);
  });

  it('serves explanation directly from cache if already generated', async () => {
    checkCache.mockResolvedValueOnce('## Cached In-Depth Java Explanation\n\n`String` is immutable because...');

    pool.query.mockImplementation(async (sql) => {
      const q = typeof sql === 'string' ? sql : sql.text;
      if (q.includes('FROM users WHERE telegram_id')) {
        return { rows: [{ id: 1, telegram_id: USER_ID, plan: 'free', language: 'Java' }] };
      }
      if (q.includes('FROM questions WHERE id')) {
        return {
          rows: [{
            id: 42,
            question_text: 'Why is String immutable in Java?',
            short_answer: 'Security and caching',
            category: 'Java Core',
          }],
        };
      }
      if (q.includes('subscription_plans') || q.includes('user_rate_limits')) {
        return { rows: [mockUserLimits] };
      }
      return { rows: [] };
    });

    const res = await request(app)
      .post('/api/questions/explain')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ questionId: 42 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('cached', true);
    expect(res.body.explanation).toContain('Cached In-Depth Java Explanation');
  });

  it('evaluates mock interview answer with detailed score and feedback', async () => {
    evaluateInterviewAnswer.mockResolvedValueOnce({
      score: 8,
      feedback: 'Great explanation of memory pools and JVM garbage collection phases.',
      correctVersion: 'Mention G1 GC region-based layout for completeness.',
    });

    pool.query.mockImplementation(async (sql) => {
      const q = typeof sql === 'string' ? sql : sql.text;
      if (q.includes('FROM users WHERE telegram_id')) {
        return { rows: [{ id: 1, telegram_id: USER_ID, plan: 'pro', language: 'Java' }] };
      }
      if (q.includes('subscription_plans') || q.includes('user_rate_limits')) {
        return { rows: [mockUserLimits] };
      }
      return { rows: [] };
    });

    const res = await request(app)
      .post('/api/questions/interview-evaluate')
      .set('Authorization', `Bearer ${proToken}`)
      .send({
        question: 'Explain how JVM Garbage Collection works in Java 17',
        answer: 'The JVM divides heap memory into young and old generations. Minor GC runs on eden...',
        language: 'Java',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('score', 8);
    expect(res.body).toHaveProperty('feedback');
    expect(res.body).toHaveProperty('correctVersion');
  });

  it('analyzes resume and generates targeted interview prep roadmap', async () => {
    analyzeResume.mockResolvedValueOnce({
      experienceLevel: 'Middle',
      strengths: ['Spring Boot', 'PostgreSQL'],
      gaps: ['Kafka', 'Distributed Systems'],
      recommendedQuestions: ['Explain Kafka partition rebalancing', 'How does 2PC work?'],
    });

    pool.query.mockImplementation(async (sql) => {
      const q = typeof sql === 'string' ? sql : sql.text;
      if (q.includes('FROM users WHERE telegram_id')) {
        return { rows: [{ id: 1, telegram_id: USER_ID, plan: 'pro', language: 'Java' }] };
      }
      if (q.includes('subscription_plans') || q.includes('user_rate_limits')) {
        return { rows: [mockUserLimits] };
      }
      return { rows: [] };
    });

    const res = await request(app)
      .post('/api/user/analyze-resume')
      .set('Authorization', `Bearer ${proToken}`)
      .send({
        resumeText: 'Software Engineer with 3 years experience building REST APIs with Spring Boot and PostgreSQL.',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('parsedData');
    expect(res.body.parsedData).toHaveProperty('experienceLevel', 'Middle');
    expect(res.body.parsedData.strengths).toContain('Spring Boot');
  });
});
