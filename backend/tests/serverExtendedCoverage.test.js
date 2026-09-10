import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
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

vi.mock('../src/config/redis.js', () => ({
  default: {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    on: vi.fn(),
    keys: vi.fn().mockResolvedValue([]),
    del: vi.fn().mockResolvedValue(1),
  },
  isConnected: vi.fn().mockReturnValue(true),
}));

vi.mock('../src/utils/telegram.js', () => ({
  validateTelegramWebAppData: vi.fn().mockReturnValue({
    telegram_id: 987654321,
    username: 'testuser',
    first_name: 'Test',
  }),
  mockValidation: vi.fn(),
}));

vi.mock('../src/services/billing/ukassaService.js', () => ({
  isUkassaEnabled: vi.fn().mockReturnValue(true),
  createUkassaPayment: vi.fn().mockResolvedValue({ paymentId: 'pay_1', confirmationUrl: 'https://pay.ru' }),
  handleUkassaEvent: vi.fn().mockResolvedValue({ activated: true, paymentId: 'pay_1' }),
  verifyUkassaSignature: vi.fn().mockImplementation((raw, sig) => sig === 'valid_sig'),
}));

vi.mock('../src/services/billingService.js', () => ({
  billingService: {
    getBillingInfo: vi.fn().mockResolvedValue({ plan: 'pro', expiresAt: '2026-10-01' }),
    getHistory: vi.fn().mockResolvedValue([{ id: 'sub_1', plan: 'pro' }]),
    cancelSubscription: vi.fn().mockResolvedValue({ cancelled: true }),
  },
}));

vi.mock('../src/services/aiService.js', () => ({
  analyzeResume: vi.fn().mockResolvedValue({ skills: ['Java', 'Spring'], experienceLevel: 'Middle' }),
  evaluateInterviewAnswer: vi.fn().mockResolvedValue({ score: 9, feedback: 'Good' }),
  checkCache: vi.fn().mockResolvedValue(null),
}));

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
process.env.ADMIN_TELEGRAM_IDS = '123456789';
process.env.BOT_TOKEN = 'test_bot_token';

const { default: app } = await import('../src/server.js');
const { default: pool } = await import('../src/config/database.js');

const JWT_SECRET = 'test_secret';
const ADMIN_ID = '123456789';
const USER_ID = '987654321';

const adminToken = jwt.sign({ userId: ADMIN_ID, plan: 'admin' }, JWT_SECRET);
const userToken = jwt.sign({ userId: USER_ID, plan: 'free' }, JWT_SECRET);

describe('Server Extended Routes Coverage', () => {
  beforeEach(() => {
    pool.query.mockReset();
    pool.query.mockResolvedValue({ rows: [] });
  });

  it('checks health check endpoint', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('serves demo questions without authentication', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 1, category: 'Core', difficulty: 'junior', question_text: 'What is JVM?', short_answer: 'Java Virtual Machine' },
      ],
    });

    const res = await request(app).get('/api/demo/questions?language=Java&lng=en');
    expect(res.status).toBe(200);
    expect(res.body.questions).toBeDefined();
    expect(res.body.questions.length).toBe(1);
  });

  it('computes demo percentile without authentication', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ below_count: 85, total_count: 100 }],
    });

    const res = await request(app).get('/api/demo/percentile?language=Java&score=8');
    expect(res.status).toBe(200);
    expect(res.body.percentile).toBe(85);
  });

  it('handles waitlist subscription and unsubscription', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app)
      .post('/api/waitlist')
      .send({
        email: 'developer@example.com',
        lang: 'en',
        source: 'landing',
        consent: true,
      });

    expect([200, 451]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
    }
  });

  it('fetches billing methods, info, and handles subscription cancellation', async () => {
    // 1. Billing methods
    const methodsRes = await request(app)
      .get('/api/billing/methods')
      .set('Authorization', `Bearer ${userToken}`);
    expect(methodsRes.status).toBe(200);
    expect(methodsRes.body).toHaveProperty('stars');
    expect(methodsRes.body).toHaveProperty('card');

    // 2. Billing info
    const infoRes = await request(app)
      .get('/api/billing/info')
      .set('Authorization', `Bearer ${userToken}`);
    expect(infoRes.status).toBe(200);
    expect(infoRes.body.plan).toBe('pro');

    // 3. Billing history
    const historyRes = await request(app)
      .get('/api/billing/history')
      .set('Authorization', `Bearer ${userToken}`);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.history).toBeDefined();

    // 4. Cancel subscription
    const cancelRes = await request(app)
      .delete('/api/billing/subscription')
      .set('Authorization', `Bearer ${userToken}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.cancelled).toBe(true);
  });

  it('handles resume analysis and retrieval', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    const analyzeRes = await request(app)
      .post('/api/user/analyze-resume')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ resumeText: '5 years Java experience in Spring Boot', language: 'Java' });

    expect([200, 429]).toContain(analyzeRes.status);
    if (analyzeRes.status === 200) {
      expect(analyzeRes.body.success).toBe(true);
    }

    // Retrieve resume
    pool.query.mockResolvedValueOnce({
      rows: [{ resume_text: '5 years Java', parsed_resume_data: { level: 'Senior' } }],
    });

    const getRes = await request(app)
      .get('/api/user/resume')
      .set('Authorization', `Bearer ${userToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.resume_text).toBe('5 years Java');
  });

  it('handles UKassa webhook with valid signature and rejects invalid signature', async () => {
    const eventBody = {
      event: 'payment.succeeded',
      object: { id: 'pay_1', amount: { value: '590.00', currency: 'RUB' } },
    };

    // Valid webhook
    const validRes = await request(app)
      .post('/api/billing/ukassa/webhook')
      .set('X-Request-Signature', 'valid_sig')
      .send(eventBody);

    expect([200, 204]).toContain(validRes.status);

    // Invalid webhook signature
    const invalidRes = await request(app)
      .post('/api/billing/ukassa/webhook')
      .set('X-Request-Signature', 'bad_sig')
      .send(eventBody);

    expect(invalidRes.status).toBe(403);
  });
});
