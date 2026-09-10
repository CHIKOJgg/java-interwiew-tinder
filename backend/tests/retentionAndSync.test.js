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
  default: null,
  isConnected: vi.fn().mockResolvedValue(false),
  getAsync: vi.fn(),
  setAsync: vi.fn(),
  delAsync: vi.fn(),
  isRedisAvailable: vi.fn().mockReturnValue(false),
}));

describe('Retention and Cross-Device Sync Endpoints', () => {
  let app;
  let pool;
  let token;
  const mockUserId = '123456789';
  const secret = 'test-secret';

  beforeAll(async () => {
    process.env.JWT_SECRET = secret;
    process.env.NODE_ENV = 'test';

    const serverModule = await import('../src/server.js');
    app = serverModule.default;
    pool = (await import('../src/config/database.js')).default;

    token = jwt.sign({ userId: mockUserId, plan: 'pro' }, secret);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/sync-code and POST /api/auth/sync-verify', () => {
    it('generates a 6-digit sync code for authenticated user', async () => {
      const res = await request(app)
        .post('/api/auth/sync-code')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.code).toMatch(/^\d{6}$/);
      expect(res.body.syncToken).toBeDefined();
    });

    it('verifies sync code and authenticates desktop user', async () => {
      // 1. Generate code
      const codeRes = await request(app)
        .post('/api/auth/sync-code')
        .set('Authorization', `Bearer ${token}`);

      const code = codeRes.body.code;

      // Mock pool queries for user lookup & initial stats
      pool.query
        .mockResolvedValueOnce({
          rows: [{
            telegram_id: mockUserId,
            username: 'sync_user',
            first_name: 'Sync',
            subscription_plan: 'pro',
            language: 'Java',
          }]
        }) // SELECT * FROM users
        .mockResolvedValueOnce({ rows: [] }) // tracks
        .mockResolvedValueOnce({ rows: [{ known_count: 5, unknown_count: 1, total_seen: 6 }] }) // stats
        .mockResolvedValueOnce({ rows: [{ total: 100 }] }) // total
        .mockResolvedValueOnce({ rows: [{ current_streak: 3, longest_streak: 7 }] }) // streak
        .mockResolvedValueOnce({ rows: [{ today_seen: 4 }] }) // today_seen
        .mockResolvedValueOnce({ rows: [{ daily_goal: 25 }] }); // daily_goal

      // 2. Verify code on desktop
      const verifyRes = await request(app)
        .post('/api/auth/sync-verify')
        .send({ code });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.token).toBeDefined();
      expect(verifyRes.body.user.telegram_id).toBe(mockUserId);
      expect(verifyRes.body.stats.todaySeen).toBe(4);
      expect(verifyRes.body.stats.dailyGoal).toBe(25);
    });

    it('rejects invalid or already-used sync code', async () => {
      const res = await request(app)
        .post('/api/auth/sync-verify')
        .send({ code: '000000' });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid or expired');
    });
  });

  describe('PUT /api/user/preferences/daily-goal', () => {
    it('updates daily goal in preferences', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put('/api/user/preferences/daily-goal')
        .set('Authorization', `Bearer ${token}`)
        .send({ dailyGoal: 30 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.dailyGoal).toBe(30);
    });

    it('rejects invalid daily goal payload', async () => {
      const res = await request(app)
        .put('/api/user/preferences/daily-goal')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/stats/answers (Answer History)', () => {
    it('returns answer history with retention intervals', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: 1 }] }) // countResult
        .mockResolvedValueOnce({ rows: [{ known_count: 1, unknown_count: 0, total_seen: 1 }] }) // summaryResult
        .mockResolvedValueOnce({
          rows: [{
            id: 42,
            question_text: 'What is ACID?',
            short_answer: 'Atomicity, Consistency, Isolation, Durability',
            category: 'Databases',
            difficulty: 'Middle',
            language: 'Java',
            framework: null,
            topic: 'Databases & SQL',
            is_top: true,
            top_rank: 10,
            status: 'known',
            answered_at: new Date(),
            interval_days: 6,
            repetition_number: 2,
            next_review: new Date(),
          }]
        });

      const res = await request(app)
        .get('/api/stats/answers')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.questions).toHaveLength(1);
      expect(res.body.questions[0].intervalDays).toBe(6);
      expect(res.body.questions[0].repetitionNumber).toBe(2);
      expect(res.body.questions[0].nextReview).toBeDefined();
    });
  });
});
