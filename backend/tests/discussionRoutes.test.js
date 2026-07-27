import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../src/config/database.js', () => ({
  default: {
    query: vi.fn(),
    on: vi.fn(),
    connect: vi.fn().mockReturnValue({ query: vi.fn(), release: vi.fn() }),
  },
}));

vi.mock('../src/config/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() },
}));

vi.mock('../src/utils/telegram.js', () => ({
  validateTelegramWebAppData: vi.fn().mockReturnValue({ telegram_id: 987654321, username: 'testuser', first_name: 'Test' }),
}));

vi.mock('pino-http', () => ({
  default: vi.fn().mockReturnValue((req, res, next) => { req.log = { info: vi.fn(), error: vi.fn(), warn: vi.fn() }; next(); }),
}));

vi.mock('../src/config/redis.js', () => ({
  default: { get: vi.fn(), setex: vi.fn(), on: vi.fn(), keys: vi.fn(), del: vi.fn() },
  isConnected: vi.fn(),
}));

vi.mock('../src/services/aiService.js', () => ({ evaluateInterviewAnswer: vi.fn(), analyzeResume: vi.fn(), checkCache: vi.fn() }));
vi.mock('../src/services/queueService.js', () => ({ enqueueJob: vi.fn(() => Promise.resolve()) }));
vi.mock('../src/services/billingService.js', () => ({ billingService: { getBillingInfo: vi.fn(), getHistory: vi.fn(), cancelSubscription: vi.fn(), activateSubscription: vi.fn() } }));
vi.mock('../src/services/billing/starsService.js', () => ({ sendStarsInvoice: vi.fn(), getStarsAmount: vi.fn(), answerPreCheckout: vi.fn(), sendTelegramMessage: vi.fn(), activateStarsSubscription: vi.fn() }));
vi.mock('../src/services/billing/tonService.js', () => ({ createTonInvoice: vi.fn(), getUserPendingInvoice: vi.fn(), pollPendingInvoices: vi.fn() }));
vi.mock('../src/services/billing/ukassaService.js', () => ({ isUkassaEnabled: vi.fn(), createUkassaPayment: vi.fn(), handleUkassaEvent: vi.fn(), verifyUkassaSignature: vi.fn() }));
vi.mock('../src/services/metricsService.js', () => ({ metricsService: { trackEvent: vi.fn(), getSystemOverview: vi.fn() } }));
vi.mock('../src/services/referralService.js', () => ({ referralService: { trackReferral: vi.fn(), getStats: vi.fn() } }));
vi.mock('../src/services/questionService.js', () => ({ updateMastery: vi.fn(), getDueCount: vi.fn() }));
vi.mock('../src/services/languageRegistry.js', () => ({ getAvailableLanguages: vi.fn() }));

vi.mock('../src/services/discussionService.js', () => ({
  getDiscussions: vi.fn(),
  createDiscussion: vi.fn(),
  voteDiscussion: vi.fn(),
  markSolution: vi.fn(),
}));

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_disc';
process.env.ADMIN_TELEGRAM_IDS = '123456789';
process.env.BOT_TOKEN = 'test_bot_token';

const { default: app } = await import('../src/server.js');
const { default: pool } = await import('../src/config/database.js');
const { getDiscussions, createDiscussion, voteDiscussion, markSolution } = await import('../src/services/discussionService.js');
const { metricsService } = await import('../src/services/metricsService.js');

const JWT_SECRET = 'test_secret_disc';
const USER_ID = '987654321';

// The server passes req.userId as a string from the JWT token
const userToken = jwt.sign({ userId: USER_ID, plan: 'free' }, JWT_SECRET);

describe('Discussion API endpoints', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('GET /api/questions/:id/discussions', () => {
    it('returns discussions list', async () => {
      const discussions = [{ id: 1, content: 'Nice question!', upvotes: 5 }];
      getDiscussions.mockResolvedValueOnce(discussions);

      const res = await request(app)
        .get('/api/questions/123/discussions')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.discussions).toEqual(discussions);
      expect(getDiscussions).toHaveBeenCalledWith(123, USER_ID);
    });

    it('returns 500 on service error', async () => {
      getDiscussions.mockRejectedValueOnce(new Error('db error'));

      const res = await request(app)
        .get('/api/questions/123/discussions')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/questions/:id/discussions', () => {
    it('creates a new discussion', async () => {
      const discussion = { id: 1, created_at: new Date().toISOString() };
      createDiscussion.mockResolvedValueOnce(discussion);

      const res = await request(app)
        .post('/api/questions/123/discussions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: 'My answer', codeSnippet: 'print("hi")' });

      expect(res.status).toBe(201);
      expect(res.body.discussion).toEqual(discussion);
      expect(createDiscussion).toHaveBeenCalledWith(123, USER_ID, 'My answer', 'print("hi")', undefined);
    });

    it('rejects missing content', async () => {
      const res = await request(app)
        .post('/api/questions/123/discussions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/discussions/:id/vote', () => {
    it('upvotes a discussion', async () => {
      voteDiscussion.mockResolvedValueOnce({ vote: 1 });

      const res = await request(app)
        .post('/api/discussions/5/vote')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ vote: 1 });

      expect(res.status).toBe(200);
      expect(res.body.vote).toBe(1);
      expect(voteDiscussion).toHaveBeenCalledWith(5, USER_ID, 1);
    });

    it('rejects invalid vote value', async () => {
      const res = await request(app)
        .post('/api/discussions/5/vote')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ vote: 42 });

      expect(res.status).toBe(400);
    });

    it('rejects missing vote', async () => {
      const res = await request(app)
        .post('/api/discussions/5/vote')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/discussions/:id/solution', () => {
    it('marks discussion as solution when user owns the question', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ question_id: 1, user_id: USER_ID }] });
      markSolution.mockResolvedValueOnce();

      const res = await request(app)
        .post('/api/discussions/5/solution')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 404 when discussion not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/discussions/999/solution')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
    });
  });
});
