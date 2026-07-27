import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const mockPoolQuery = vi.fn();

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
  default: { get: vi.fn(), setex: vi.fn(), isConnected: vi.fn(() => true) },
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

vi.mock('../src/services/aiService.js', () => ({
  default: { explainQuestion: vi.fn().mockResolvedValue({ theory: 'test', code: null }) },
}));

vi.mock('../src/services/queueService.js', () => ({
  default: { add: vi.fn().mockResolvedValue(true) },
}));

vi.mock('../src/services/billingService.js', () => ({
  default: { createPayment: vi.fn(), verifyPayment: vi.fn(), handleProWebhook: vi.fn() },
}));

vi.mock('../src/services/billing/starsService.js', () => ({
  default: { verifyStarsPayment: vi.fn() },
}));

vi.mock('../src/services/billing/tonService.js', () => ({
  default: { verifyTonPayload: vi.fn() },
}));

vi.mock('../src/services/billing/ukassaService.js', () => ({
  default: { createPayment: vi.fn(), handleWebhook: vi.fn(), notifyAdmins: vi.fn() },
}));

vi.mock('../src/services/metricsService.js', () => ({
  default: { trackEvent: vi.fn(), increment: vi.fn(), gauge: vi.fn() },
}));

vi.mock('../src/services/referralService.js', () => ({
  default: { generateReferralLink: vi.fn(), handleReferral: vi.fn() },
}));

vi.mock('../src/services/questionService.js', () => ({
  default: { getQuestions: vi.fn(), getQuestionById: vi.fn(), recordAnswer: vi.fn(), recordSwipe: vi.fn() },
}));

vi.mock('../src/services/languageRegistry.js', () => ({
  getLanguage: vi.fn(() => ({ prompts: {} })),
}));

vi.mock('../src/services/discussionService.js', () => ({
  default: { getDiscussions: vi.fn(), getDiscussion: vi.fn(), createDiscussion: vi.fn(), addReply: vi.fn() },
}));

vi.mock('../src/services/challengeService.js', () => ({
  default: { getWeeklyChallenges: vi.fn(), recordChallengeAttempt: vi.fn(), getLeaderboard: vi.fn(), recordBadgeProgress: vi.fn() },
}));

vi.mock('../src/services/progressService.js', () => ({
  default: { getProgress: vi.fn(), exportProgress: vi.fn() },
}));

vi.mock('../src/services/certificateService.js', () => ({
  default: { generateCertificate: vi.fn(), verifyCertificate: vi.fn() },
}));

vi.mock('../src/services/executionService.js', () => ({
  default: { execute: vi.fn() },
}));

vi.mock('../src/services/peerToPeer.js', () => ({
  default: class PeerToPeerSignaling { handleConnection() {} },
}));

import { app } from '../src/server.js';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('connected');
    expect(res.body.redis).toBe('connected');
    expect(res.body).toHaveProperty('timestamp');
  });
});

describe('GET /api/me', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
  });

  it('returns user profile with valid token', async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ id: 1, telegram_id: '123456', first_name: 'Test', username: 'testuser', language: 'Java', plan: 'pro', current_streak: 5, longest_streak: 10, known_count: 42, total_answered: 50, avatar_url: null, created_at: new Date().toISOString() }],
    });

    const res = await request(app)
      .get('/api/me')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body.user.first_name).toBe('Test');
    expect(res.body.user.username).toBe('testuser');
  });
});

describe('PUT /api/me', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).put('/api/me').send({ first_name: 'New' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when no fields to update', async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/me')
      .set('Authorization', 'Bearer valid-token')
      .send({});
    expect(res.status).toBe(400);
  });

  it('updates first_name when valid', async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ id: 1, first_name: 'NewName', username: 'testuser', language: 'Java', plan: 'pro' }],
    });

    const res = await request(app)
      .put('/api/me')
      .set('Authorization', 'Bearer valid-token')
      .send({ first_name: 'NewName' });
    expect(res.status).toBe(200);
    expect(res.body.user.first_name).toBe('NewName');
  });
});

describe('POST /api/questions/submit (UGC)', () => {
  it('returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/questions/submit')
      .send({ question_text: 'Q?', short_answer: 'A', category: 'Java' });
    expect(res.status).toBe(401);
  });

  it('submits a UGC question successfully', async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/questions/submit')
      .set('Authorization', 'Bearer valid-token')
      .send({ question_text: 'What is Java?', short_answer: 'A programming language', category: 'Java', difficulty: 'Junior' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/questions/ugc', () => {
  it('returns approved UGC questions', async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ id: 1, category: 'Java', difficulty: 'Junior', question_text: 'Q1', short_answer: 'A1', language: 'Java', status: 'approved', created_at: new Date().toISOString() }],
    });

    const res = await request(app).get('/api/questions/ugc?language=Java');
    expect(res.status).toBe(200);
    expect(res.body.questions).toBeInstanceOf(Array);
  });
});

describe('GET /api/admin/ugc', () => {
  it('returns pending UGC questions', async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ id: 1, question_text: 'Pending Q', status: 'pending', created_at: new Date().toISOString(), username: 'user1', first_name: 'User' }],
    });

    const res = await request(app)
      .get('/api/admin/ugc')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body.questions).toBeInstanceOf(Array);
  });
});

describe('POST /api/admin/ugc/:id/review', () => {
  it('returns 400 for invalid action', async () => {
    const res = await request(app)
      .post('/api/admin/ugc/1/review')
      .set('Authorization', 'Bearer valid-token')
      .send({ action: 'invalid' });
    expect(res.status).toBe(400);
  });

  it('approves a UGC question', async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: 1, question_text: 'Q', short_answer: 'A', category: 'Java', difficulty: 'Junior', language: 'Java' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .post('/api/admin/ugc/1/review')
      .set('Authorization', 'Bearer valid-token')
      .send({ action: 'approve' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/email/subscribe', () => {
  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/email/subscribe')
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('subscribes a valid email', async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/email/subscribe')
      .send({ email: 'test@example.com', language: 'Java' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/email/unsubscribe', () => {
  it('unsubscribes an email', async () => {
    mockPoolQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app)
      .post('/api/email/unsubscribe')
      .send({ email: 'test@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/email/daily-challenge', () => {
  it('returns null when no challenge for today', async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/email/daily-challenge?language=Java');
    expect(res.status).toBe(200);
    expect(res.body.challenge).toBeNull();
  });

  it('returns today challenge with questions', async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ id: 1, question_ids: [1, 2] }],
    }).mockResolvedValueOnce({
      rows: [{ id: 1, category: 'Java', question_text: 'Q1', short_answer: 'A1' }, { id: 2, category: 'Java', question_text: 'Q2', short_answer: 'A2' }],
    });

    const res = await request(app).get('/api/email/daily-challenge?language=Java');
    expect(res.status).toBe(200);
    expect(res.body.challenge).not.toBeNull();
    expect(res.body.challenge.questions).toHaveLength(2);
  });
});