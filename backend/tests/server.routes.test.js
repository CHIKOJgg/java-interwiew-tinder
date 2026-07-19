import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ─── Mocks (declared BEFORE importing app) ───────────────────────────────
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

vi.mock('../src/utils/telegram.js', () => ({
  validateTelegramWebAppData: vi.fn().mockReturnValue({
    telegram_id: 987654321,
    username: 'testuser',
    first_name: 'Test',
    last_name: 'User',
  }),
  mockValidation: vi.fn(),
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
  isConnected: vi.fn(),
}));

vi.mock('../src/services/aiService.js', () => ({
  evaluateInterviewAnswer: vi.fn(),
  analyzeResume: vi.fn(),
  checkCache: vi.fn(),
}));

vi.mock('../src/services/queueService.js', () => ({
  enqueueJob: vi.fn(() => Promise.resolve()),
}));

vi.mock('../src/services/billingService.js', () => ({
  billingService: {
    getBillingInfo: vi.fn(),
    getHistory: vi.fn(),
    cancelSubscription: vi.fn(),
    activateSubscription: vi.fn(),
  },
}));

vi.mock('../src/services/billing/starsService.js', () => ({
  sendStarsInvoice: vi.fn(() => Promise.resolve(true)),
  getStarsAmount: vi.fn(() => Promise.resolve(450)),
  answerPreCheckout: vi.fn(() => Promise.resolve()),
  sendTelegramMessage: vi.fn(() => Promise.resolve()),
  activateStarsSubscription: vi.fn(() => Promise.resolve()),
}));

vi.mock('../src/services/billing/tonService.js', () => ({
  createTonInvoice: vi.fn(),
  getUserPendingInvoice: vi.fn(),
  pollPendingInvoices: vi.fn(),
}));

vi.mock('../src/services/billing/ukassaService.js', () => ({
  isUkassaEnabled: vi.fn(),
  createUkassaPayment: vi.fn(),
  handleUkassaEvent: vi.fn(),
  verifyUkassaSignature: vi.fn(),
}));

vi.mock('../src/services/metricsService.js', () => ({
  metricsService: {
    trackEvent: vi.fn(),
    getSystemOverview: vi.fn(),
  },
}));

vi.mock('../src/services/referralService.js', () => ({
  referralService: {
    trackReferral: vi.fn(),
    getStats: vi.fn(),
  },
}));

vi.mock('../src/services/questionService.js', () => ({
  updateMastery: vi.fn(() => Promise.resolve({ ef: 2.5, interval: 1, reps: 0, nextReview: new Date() })),
  getDueCount: vi.fn(() => Promise.resolve(0)),
}));

vi.mock('../src/services/languageRegistry.js', () => ({
  getAvailableLanguages: vi.fn(),
}));

// ─── Env BEFORE import ───────────────────────────────────────────────────
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
process.env.ADMIN_TELEGRAM_IDS = '123456789';
process.env.BOT_TOKEN = 'test_bot_token';

const { default: app } = await import('../src/server.js');
const { default: pool } = await import('../src/config/database.js');
const { default: redis } = await import('../src/config/redis.js');
const { isConnected } = await import('../src/config/redis.js');
const { checkCache } = await import('../src/services/aiService.js');
const { updateMastery, getDueCount } = await import('../src/services/questionService.js');
const { verifyUkassaSignature, isUkassaEnabled } = await import('../src/services/billing/ukassaService.js');

const JWT_SECRET = 'test_secret';
const ADMIN_ID = '123456789';
const USER_ID = '987654321';

const adminToken = jwt.sign({ userId: ADMIN_ID, plan: 'admin' }, JWT_SECRET);
const userToken = jwt.sign({ userId: USER_ID, plan: 'free' }, JWT_SECRET);

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.ADMIN_TELEGRAM_IDS = ADMIN_ID;
  process.env.NODE_ENV = 'test';
  process.env.BOT_TOKEN = 'test_bot_token';
});

// Establish safe default implementations so un-mocked pool/redis calls resolve
// (instead of hitting the real DB). Per-test overrides use *Once variants.
// NOTE: we fully reset the mocks each run (clearing the *Once queue) so that
// one-time mocks never leak between tests and offset the query ordering.
beforeEach(() => {
  pool.query.mockReset();
  pool.query.mockImplementation(async () => ({ rows: [] }));
  pool.connect.mockReturnValue({ query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() });
  redis.get.mockReset();
  redis.get.mockResolvedValue(null);
  redis.keys.mockReset();
  redis.keys.mockResolvedValue([]);
  redis.del.mockReset();
  redis.del.mockResolvedValue(0);
  redis.setex.mockReset();
  redis.setex.mockResolvedValue(undefined);
  checkCache.mockReset();
  checkCache.mockResolvedValue(null);
  isConnected.mockReset();
  isConnected.mockResolvedValue(true);
  updateMastery.mockImplementation(() => Promise.resolve({ ef: 2.5, interval: 1, reps: 0, nextReview: new Date() }));
  getDueCount.mockImplementation(() => Promise.resolve(0));
  global.fetch = vi.fn().mockResolvedValue({ json: async () => ({ ok: true, result: 'https://t.me/x' }) });
});

afterEach(() => {
  vi.clearAllMocks();
});

// Default FREE user limits (modes swipe/test only) so requireEntitlement gates
// correctly: feed (swipe) allowed, weak (review) blocked.
function mockUserLimits() {
  pool.query.mockResolvedValueOnce({
    rows: [{
      requests_per_day: 200, ai_generations_per_month: 500, resume_analysis_limit: 3,
      interview_eval_limit: 20, available_languages: ['Java', 'Python', 'TypeScript'],
      available_modes: ['swipe', 'test'],
      model_priority: 'standard', requests_today: 0, ai_generations_this_month: 0,
      resume_analyses_this_month: 0, interview_evals_this_month: 0,
      daily_reset_at: null, monthly_reset_at: null,
    }],
  });
  redis.get.mockResolvedValueOnce(null);
}

// ─── HEALTH ───────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('returns 200 ok when db + redis are healthy', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    vi.mocked(isConnected).mockResolvedValueOnce(true);
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('returns 503 degraded when db fails and redis disconnected', async () => {
    pool.query.mockRejectedValueOnce(new Error('db down'));
    vi.mocked(isConnected).mockResolvedValueOnce(false);
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
  });
});

// ─── LANGUAGES ────────────────────────────────────────────────────────────
describe('GET /api/languages', () => {
  it('returns available languages', async () => {
    const { getAvailableLanguages } = await import('../src/services/languageRegistry.js');
    vi.mocked(getAvailableLanguages).mockReturnValueOnce([
      { code: 'Java', name: 'Java' },
      { code: 'Python', name: 'Python' },
      { code: 'TypeScript', name: 'TypeScript' },
    ]);
    const res = await request(app).get('/api/languages');
    expect(res.status).toBe(200);
    expect(res.body.languages).toHaveLength(3);
  });
});

// ─── CATEGORIES ───────────────────────────────────────────────────────────
describe('GET /api/categories', () => {
  it('returns categories for a language', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ category: 'OOP', count: '5' }] });
    const res = await request(app).get('/api/categories?language=Java').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.categories[0]).toEqual({ name: 'OOP', count: 5 });
  });

  it('returns 500 on db error', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app).get('/api/categories').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(500);
  });
});

// ─── AUTH LOGIN ───────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('logs in with valid initData and returns token', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ telegram_id: 987654321 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ initData: 'user=%7B%22id%22%3A987654321%7D' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('processes referralId for new user', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ telegram_id: 987654321, is_new_user: true }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ initData: 'user=%7B%22id%22%3A987654321%7D', referralId: '111' });
    expect(res.status).toBe(200);
  });

  it('auto-grants admin plan when userId in ADMIN_IDS', async () => {
    const tg = await import('../src/utils/telegram.js');
    vi.mocked(tg.validateTelegramWebAppData).mockReturnValueOnce({
      telegram_id: 123456789, username: 'admin', first_name: 'A', last_name: 'D',
    });
    pool.query
      .mockResolvedValueOnce({ rows: [{ telegram_id: 123456789 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/auth/login').send({ initData: 'user=%7B%22id%22%3A123456789%7D' });
    expect(res.status).toBe(200);
    expect(res.body.user.plan).toBe('admin');
  });

  it('returns 401 when invalid in production', async () => {
    process.env.NODE_ENV = 'production';
    const tg = await import('../src/utils/telegram.js');
    vi.mocked(tg.validateTelegramWebAppData).mockReturnValueOnce(null);
    vi.mocked(tg.mockValidation).mockReturnValueOnce(null);
    const res = await request(app).post('/api/auth/login').send({ initData: 'bad' });
    process.env.NODE_ENV = 'test';
    expect(res.status).toBe(401);
  });
});

// ─── PREFERENCES ──────────────────────────────────────────────────────────
describe('Preferences', () => {
  it('GET returns defaults when empty', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/preferences').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.selectedCategories).toEqual([]);
  });

  it('GET returns 500 on error', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app).get('/api/preferences').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(500);
  });

  it('POST updates preferences', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/preferences')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ categories: ['OOP'], language: 'Java' });
    expect(res.status).toBe(200);
  });

  it('POST validation fails without categories', async () => {
    const res = await request(app).post('/api/preferences').set('Authorization', `Bearer ${userToken}`).send({});
    expect(res.status).toBe(400);
  });

  it('POST returns 500 on error', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app)
      .post('/api/preferences')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ categories: ['OOP'] });
    expect(res.status).toBe(500);
  });

  it('POST language updates preference', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/preferences/language')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ language: 'Python' });
    expect(res.status).toBe(200);
  });

  it('POST language validation fails without language', async () => {
    const res = await request(app).post('/api/preferences/language').set('Authorization', `Bearer ${userToken}`).send({});
    expect(res.status).toBe(400);
  });

  it('POST language returns 500 on error', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app)
      .post('/api/preferences/language')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ language: 'Python' });
    expect(res.status).toBe(500);
  });
});

// ─── QUESTION FEED ────────────────────────────────────────────────────────
describe('GET /api/questions/feed', () => {
  it('returns questions + meta (free token)', async () => {
    mockUserLimits();
    pool.query.mockResolvedValueOnce({ rows: [] }); // prefs
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, question_text: 'q' }] }); // main
    const res = await request(app).get('/api/questions/feed?mode=swipe').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.meta).toBeDefined();
  });

  it('caps limit at 10', async () => {
    mockUserLimits();
    pool.query.mockResolvedValueOnce({ rows: [] });
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/questions/feed?mode=swipe&limit=999').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });

  it('filler branch when fewer than limit', async () => {
    mockUserLimits();
    pool.query.mockResolvedValueOnce({ rows: [] });
    pool.query.mockResolvedValueOnce({ rows: [] });
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/questions/feed?mode=swipe').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });

  it('returns 500 on error', async () => {
    mockUserLimits();
    pool.query.mockResolvedValueOnce({ rows: [] }); // prefs
    pool.query.mockRejectedValueOnce(new Error('x')); // main
    const res = await request(app).get('/api/questions/feed?mode=swipe').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(500);
  });
});

// ─── WEAK QUESTIONS (Pro gate) ────────────────────────────────────────────
describe('GET /api/questions/weak', () => {
  it('pro token returns questions', async () => {
    const proToken = jwt.sign({ userId: USER_ID, plan: 'pro' }, JWT_SECRET);
    // getUserLimits (requireEntitlement) — pro plan includes the 'review' mode
    pool.query.mockResolvedValueOnce({
      rows: [{
        requests_per_day: 200, ai_generations_per_month: 500, resume_analysis_limit: 3,
        interview_eval_limit: 20, available_languages: ['Java', 'Python', 'TypeScript'],
        available_modes: ['swipe', 'test', 'review', 'bug-hunting', 'blitz', 'code-completion'],
        model_priority: 'standard', requests_today: 0, ai_generations_this_month: 0,
        resume_analyses_this_month: 0, interview_evals_this_month: 0,
        daily_reset_at: null, monthly_reset_at: null,
      }],
    });
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, question_text: 'q' }] });
    const res = await request(app).get('/api/questions/weak?mode=review').set('Authorization', `Bearer ${proToken}`);
    expect(res.status).toBe(200);
  });

  it('free token blocked with 403', async () => {
    mockUserLimits();
    const res = await request(app).get('/api/questions/weak').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 500 on error', async () => {
    const proToken = jwt.sign({ userId: USER_ID, plan: 'pro' }, JWT_SECRET);
    // getUserLimits (requireEntitlement) — pro plan includes the 'review' mode
    pool.query.mockResolvedValueOnce({
      rows: [{
        requests_per_day: 200, ai_generations_per_month: 500, resume_analysis_limit: 3,
        interview_eval_limit: 20, available_languages: ['Java', 'Python', 'TypeScript'],
        available_modes: ['swipe', 'test', 'review', 'bug-hunting', 'blitz', 'code-completion'],
        model_priority: 'standard', requests_today: 0, ai_generations_this_month: 0,
        resume_analyses_this_month: 0, interview_evals_this_month: 0,
        daily_reset_at: null, monthly_reset_at: null,
      }],
    });
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app).get('/api/questions/weak?mode=review').set('Authorization', `Bearer ${proToken}`);
    expect(res.status).toBe(500);
  });
});

// ─── GENERATE ─────────────────────────────────────────────────────────────
describe('POST /api/generate/:type', () => {
  it('invalid type -> 400', async () => {
    const res = await request(app)
      .post('/api/generate/bogus')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ questionText: 'q' });
    expect(res.status).toBe(400);
  });

  it('missing questionText -> 400', async () => {
    const res = await request(app)
      .post('/api/generate/explanation')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('cached -> ready', async () => {
    checkCache.mockResolvedValueOnce('cached explanation');
    const res = await request(app)
      .post('/api/generate/explanation')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ questionText: 'q' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
  });

  it('uncached -> pending', async () => {
    checkCache.mockResolvedValueOnce(null);
    const res = await request(app)
      .post('/api/generate/explanation')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ questionText: 'q' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
  });
});

// ─── SWIPE ────────────────────────────────────────────────────────────────
describe('Swipe', () => {
  it('POST swipe success with streak', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ current_streak: 1, last_activity_date: '2000-01-01', longest_streak: 1 }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/questions/swipe')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ questionId: '1', status: 'known' });
    expect(res.status).toBe(200);
    expect(res.body.streak).toBeDefined();
  });

  it('POST swipe validation fails', async () => {
    const res = await request(app).post('/api/questions/swipe').set('Authorization', `Bearer ${userToken}`).send({});
    expect(res.status).toBe(400);
  });

  it('POST swipe 500 on error', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app)
      .post('/api/questions/swipe')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ questionId: '1', status: 'known' });
    expect(res.status).toBe(500);
  });

  it('DELETE swipe success', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).delete('/api/questions/swipe/1').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });

  it('DELETE swipe 500 on error', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app).delete('/api/questions/swipe/1').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(500);
  });
});

// ─── REPORT ───────────────────────────────────────────────────────────────
describe('POST /api/questions/:questionId/report', () => {
  it('reports and returns count', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });
    const res = await request(app).post('/api/questions/1/report').set('Authorization', `Bearer ${userToken}`).send({ reason: 'bad' });
    expect(res.status).toBe(200);
  });

  it('deactivates question after 5 reports and notifies', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '5' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/questions/1/report').set('Authorization', `Bearer ${userToken}`).send({ reason: 'bad' });
    expect(res.status).toBe(200);
  });

  it('returns 500 on error', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app).post('/api/questions/1/report').set('Authorization', `Bearer ${userToken}`).send({ reason: 'bad' });
    expect(res.status).toBe(500);
  });
});

// ─── TEST ANSWER ──────────────────────────────────────────────────────────
describe('POST /api/questions/test-answer', () => {
  it('correct answer', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ short_answer: '42' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ current_streak: 1, last_activity_date: '2000-01-01', longest_streak: 1 }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/questions/test-answer')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ questionId: '1', answer: '42' });
    expect(res.status).toBe(200);
    expect(res.body.isCorrect).toBe(true);
  });

  it('incorrect answer', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ short_answer: '42' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ current_streak: 1, last_activity_date: '2000-01-01', longest_streak: 1 }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/questions/test-answer')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ questionId: '1', answer: 'wrong' });
    expect(res.status).toBe(200);
    expect(res.body.isCorrect).toBe(false);
  });

  it('404 when question missing', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/questions/test-answer')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ questionId: '1', answer: 'x' });
    expect(res.status).toBe(404);
  });

  it('validation fails', async () => {
    const res = await request(app).post('/api/questions/test-answer').set('Authorization', `Bearer ${userToken}`).send({});
    expect(res.status).toBe(400);
  });

  it('500 on error', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app)
      .post('/api/questions/test-answer')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ questionId: '1', answer: 'x' });
    expect(res.status).toBe(500);
  });
});

// ─── BUG HUNT ANSWER ──────────────────────────────────────────────────────
describe('POST /api/questions/bug-hunt-answer', () => {
  it('correct answer', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ bug_hunting_data: { bug: 'x' } }] }) // resolveAIData
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ current_streak: 1, last_activity_date: '2000-01-01', longest_streak: 1 }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/questions/bug-hunt-answer')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ questionId: '1', answer: 'x' });
    expect(res.status).toBe(200);
    expect(res.body.isCorrect).toBe(true);
  });

  it('404 when data missing', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ bug_hunting_data: null }] });
    checkCache.mockResolvedValueOnce(null);
    const res = await request(app)
      .post('/api/questions/bug-hunt-answer')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ questionId: '1', answer: 'x' });
    expect(res.status).toBe(404);
  });

  it('validation fails', async () => {
    const res = await request(app).post('/api/questions/bug-hunt-answer').set('Authorization', `Bearer ${userToken}`).send({});
    expect(res.status).toBe(400);
  });

  it('500 on error', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app)
      .post('/api/questions/bug-hunt-answer')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ questionId: '1', answer: 'x' });
    expect(res.status).toBe(500);
  });
});

// ─── BLITZ ANSWER ─────────────────────────────────────────────────────────
describe('POST /api/questions/blitz-answer', () => {
  it('trusts client when data missing', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ blitz_data: null }] }) // resolveAIData
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ current_streak: 1, last_activity_date: '2000-01-01', longest_streak: 1 }] })
      .mockResolvedValueOnce({ rows: [] });
    checkCache.mockResolvedValueOnce(null);
    const res = await request(app)
      .post('/api/questions/blitz-answer')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ questionId: '1', answer: true, clientIsCorrect: true });
    expect(res.status).toBe(200);
    expect(res.body.isCorrect).toBe(true);
  });

  it('uses server data when present', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ blitz_data: { isCorrect: true } }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ current_streak: 1, last_activity_date: '2000-01-01', longest_streak: 1 }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/questions/blitz-answer')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ questionId: '1', answer: true });
    expect(res.status).toBe(200);
    expect(res.body.isCorrect).toBe(true);
  });

  it('500 on error', async () => {
    // resolveAIData error is caught internally (falls back to clientIsCorrect),
    // so the reject must land on recordProgress to surface a 500.
    pool.query.mockResolvedValueOnce({ rows: [{ blitz_data: null }] }); // resolveAIData
    pool.query.mockRejectedValueOnce(new Error('x')); // recordProgress
    const res = await request(app)
      .post('/api/questions/blitz-answer')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ questionId: '1', answer: true });
    expect(res.status).toBe(500);
  });
});

// ─── CODE COMPLETION ANSWER ───────────────────────────────────────────────
describe('POST /api/questions/code-completion-answer', () => {
  it('correct answer', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ code_completion_data: { correctPart: 'abc' } }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ current_streak: 1, last_activity_date: '2000-01-01', longest_streak: 1 }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/questions/code-completion-answer')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ questionId: '1', answer: 'abc' });
    expect(res.status).toBe(200);
    expect(res.body.isCorrect).toBe(true);
  });

  it('404 when data missing', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ code_completion_data: null }] });
    checkCache.mockResolvedValueOnce(null);
    const res = await request(app)
      .post('/api/questions/code-completion-answer')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ questionId: '1', answer: 'abc' });
    expect(res.status).toBe(404);
  });

  it('validation fails', async () => {
    const res = await request(app).post('/api/questions/code-completion-answer').set('Authorization', `Bearer ${userToken}`).send({});
    expect(res.status).toBe(400);
  });

  it('500 on error', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app)
      .post('/api/questions/code-completion-answer')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ questionId: '1', answer: 'abc' });
    expect(res.status).toBe(500);
  });
});

// ─── INTERVIEW EVALUATE ───────────────────────────────────────────────────
describe('POST /api/questions/interview-evaluate', () => {
  it('400 without question/answer', async () => {
    const res = await request(app).post('/api/questions/interview-evaluate').set('Authorization', `Bearer ${userToken}`).send({});
    expect(res.status).toBe(400);
  });

  it('success', async () => {
    const { evaluateInterviewAnswer } = await import('../src/services/aiService.js');
    vi.mocked(evaluateInterviewAnswer).mockResolvedValueOnce({ score: 8, feedback: 'good' });
    const res = await request(app)
      .post('/api/questions/interview-evaluate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ question: 'q', answer: 'a' });
    expect(res.status).toBe(200);
    expect(res.body.score).toBe(8);
  });

  it('500 on error', async () => {
    const { evaluateInterviewAnswer } = await import('../src/services/aiService.js');
    vi.mocked(evaluateInterviewAnswer).mockRejectedValueOnce(new Error('x'));
    const res = await request(app)
      .post('/api/questions/interview-evaluate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ question: 'q', answer: 'a' });
    expect(res.status).toBe(500);
  });
});

// ─── SAVED QUESTIONS ──────────────────────────────────────────────────────
describe('Saved questions', () => {
  it('POST save success', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/questions/save').set('Authorization', `Bearer ${userToken}`).send({ questionId: '1' });
    expect(res.status).toBe(200);
  });

  it('POST save validation fails', async () => {
    const res = await request(app).post('/api/questions/save').set('Authorization', `Bearer ${userToken}`).send({});
    expect(res.status).toBe(400);
  });

  it('POST save 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app).post('/api/questions/save').set('Authorization', `Bearer ${userToken}`).send({ questionId: '1' });
    expect(res.status).toBe(500);
  });

  it('DELETE save success', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).delete('/api/questions/save').set('Authorization', `Bearer ${userToken}`).send({ questionId: '1' });
    expect(res.status).toBe(200);
  });

  it('DELETE save validation fails', async () => {
    const res = await request(app).delete('/api/questions/save').set('Authorization', `Bearer ${userToken}`).send({});
    expect(res.status).toBe(400);
  });

  it('DELETE save 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app).delete('/api/questions/save').set('Authorization', `Bearer ${userToken}`).send({ questionId: '1' });
    expect(res.status).toBe(500);
  });

  it('GET saved success', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, question_text: 'q' }] });
    const res = await request(app).get('/api/questions/saved').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(1);
  });

  it('GET saved 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app).get('/api/questions/saved').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(500);
  });
});

// ─── EXPLAIN ──────────────────────────────────────────────────────────────
describe('POST /api/questions/explain', () => {
  it('400 without questionId', async () => {
    const res = await request(app).post('/api/questions/explain').set('Authorization', `Bearer ${userToken}`).send({});
    expect(res.status).toBe(400);
  });

  it('404 unknown question', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // rateLimit: getUserLimits
    pool.query.mockResolvedValueOnce({ rows: [] }); // rateLimit: incrementCounter
    pool.query.mockResolvedValueOnce({ rows: [] }); // question SELECT
    const res = await request(app).post('/api/questions/explain').set('Authorization', `Bearer ${userToken}`).send({ questionId: '999' });
    expect(res.status).toBe(404);
  });

  it('cached_explanation -> cached', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // rateLimit: getUserLimits
    pool.query.mockResolvedValueOnce({ rows: [] }); // rateLimit: incrementCounter
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, question_text: 'q', short_answer: 'a', cached_explanation: 'expl', language: 'Java' }] });
    const res = await request(app).post('/api/questions/explain').set('Authorization', `Bearer ${userToken}`).send({ questionId: '1' });
    expect(res.status).toBe(200);
    expect(res.body.cached).toBe(true);
  });

  it('ai cache hit -> cached', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // rateLimit: getUserLimits
    pool.query.mockResolvedValueOnce({ rows: [] }); // rateLimit: incrementCounter
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, question_text: 'q', short_answer: 'a', cached_explanation: null, language: 'Java' }] });
    checkCache.mockResolvedValueOnce('cached ai');
    const res = await request(app).post('/api/questions/explain').set('Authorization', `Bearer ${userToken}`).send({ questionId: '1' });
    expect(res.status).toBe(200);
    expect(res.body.cached).toBe(true);
  });

  it('free daily limit -> 403 DAILY_AI_LIMIT', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // rateLimit: getUserLimits
    pool.query.mockResolvedValueOnce({ rows: [] }); // rateLimit: incrementCounter
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, question_text: 'q', short_answer: 'a', cached_explanation: null, language: 'Java' }] });
    checkCache.mockResolvedValueOnce(null);
    pool.query.mockResolvedValueOnce({ rows: [{ subscription_plan: 'free' }] });
    pool.query.mockResolvedValueOnce({ rows: [] }); // upsert
    pool.query.mockResolvedValueOnce({ rows: [{ ai_explanations_today: 5 }] }); // select
    const res = await request(app).post('/api/questions/explain').set('Authorization', `Bearer ${userToken}`).send({ questionId: '1' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('DAILY_AI_LIMIT');
  });

  it('pending when not cached (free under limit)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // rateLimit: getUserLimits
    pool.query.mockResolvedValueOnce({ rows: [] }); // rateLimit: incrementCounter
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, question_text: 'q', short_answer: 'a', cached_explanation: null, language: 'Java' }] });
    checkCache.mockResolvedValueOnce(null);
    pool.query.mockResolvedValueOnce({ rows: [{ subscription_plan: 'free' }] });
    pool.query.mockResolvedValueOnce({ rows: [] }); // upsert
    pool.query.mockResolvedValueOnce({ rows: [{ ai_explanations_today: 0 }] }); // select
    pool.query.mockResolvedValueOnce({ rows: [] }); // increment
    const res = await request(app).post('/api/questions/explain').set('Authorization', `Bearer ${userToken}`).send({ questionId: '1' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
  });

  it('500 on error', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // rateLimit: getUserLimits
    pool.query.mockResolvedValueOnce({ rows: [] }); // rateLimit: incrementCounter
    pool.query.mockRejectedValueOnce(new Error('x')); // question SELECT
    const res = await request(app).post('/api/questions/explain').set('Authorization', `Bearer ${userToken}`).send({ questionId: '1' });
    expect(res.status).toBe(500);
  });
});

// ─── RESUME ───────────────────────────────────────────────────────────────
describe('Resume', () => {
  it('POST analyze-resume 400 without text', async () => {
    const res = await request(app).post('/api/user/analyze-resume').set('Authorization', `Bearer ${userToken}`).send({});
    expect(res.status).toBe(400);
  });

  it('POST analyze-resume success', async () => {
    const { analyzeResume } = await import('../src/services/aiService.js');
    vi.mocked(analyzeResume).mockResolvedValueOnce({ skills: ['Java'] });
    const res = await request(app)
      .post('/api/user/analyze-resume')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ resumeText: 'Java dev' });
    expect(res.status).toBe(200);
  });

  it('POST analyze-resume 500', async () => {
    const { analyzeResume } = await import('../src/services/aiService.js');
    vi.mocked(analyzeResume).mockRejectedValueOnce(new Error('x'));
    const res = await request(app)
      .post('/api/user/analyze-resume')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ resumeText: 'Java dev' });
    expect(res.status).toBe(500);
  });

  it('GET resume success', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ resume_text: 'x', parsed_resume_data: {} }] });
    const res = await request(app).get('/api/user/resume').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });

  it('GET resume 404 when user missing', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/user/resume').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(404);
  });

  it('GET resume 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app).get('/api/user/resume').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(500);
  });
});

// ─── SUBSCRIPTION ─────────────────────────────────────────────────────────
describe('Subscription', () => {
  it('GET plans success', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'free', name: 'Free' }] });
    const res = await request(app).get('/api/subscription/plans').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });

  it('GET plans empty -> defaults', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/subscription/plans').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.plans).toHaveLength(2);
  });

  it('GET plans 500 -> defaults', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app).get('/api/subscription/plans').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.plans).toHaveLength(2);
  });

  it('GET status admin', async () => {
    const res = await request(app).get('/api/subscription/status').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('admin');
  });

  it('GET status active row', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ plan: 'pro', plan_name: 'Pro' }] });
    const res = await request(app).get('/api/subscription/status').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('pro');
  });

  it('GET status fallback free', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/subscription/status').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('free');
  });

  it('GET status 500 -> free', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app).get('/api/subscription/status').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('free');
  });
});

// ─── BILLING ──────────────────────────────────────────────────────────────
describe('Billing', () => {
  it('POST stars/create-invoice success', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ json: async () => ({ ok: true, result: 'https://t.me/invoice' }) });
    const res = await request(app).post('/api/billing/stars/create-invoice').set('Authorization', `Bearer ${userToken}`).send({ planId: 'pro' });
    expect(res.status).toBe(200);
    expect(res.body.url).toBeDefined();
  });

  it('POST stars/create-invoice 500 on fetch reject', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('net'));
    const res = await request(app).post('/api/billing/stars/create-invoice').set('Authorization', `Bearer ${userToken}`).send({ planId: 'pro' });
    expect(res.status).toBe(500);
  });

  it('POST stars/invoice success', async () => {
    const { sendStarsInvoice } = await import('../src/services/billing/starsService.js');
    vi.mocked(sendStarsInvoice).mockResolvedValueOnce(true);
    const res = await request(app).post('/api/billing/stars/invoice').set('Authorization', `Bearer ${userToken}`).send({ planId: 'pro' });
    expect(res.status).toBe(200);
  });

  it('POST stars/invoice validation fails', async () => {
    const res = await request(app).post('/api/billing/stars/invoice').set('Authorization', `Bearer ${userToken}`).send({});
    expect(res.status).toBe(400);
  });

  it('POST stars/invoice 500', async () => {
    const { sendStarsInvoice } = await import('../src/services/billing/starsService.js');
    vi.mocked(sendStarsInvoice).mockRejectedValueOnce(new Error('x'));
    const res = await request(app).post('/api/billing/stars/invoice').set('Authorization', `Bearer ${userToken}`).send({ planId: 'pro' });
    expect(res.status).toBe(500);
  });

  it('GET billing/info success', async () => {
    const { billingService } = await import('../src/services/billingService.js');
    vi.mocked(billingService.getBillingInfo).mockResolvedValueOnce({ plan: 'free' });
    const res = await request(app).get('/api/billing/info').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });

  it('GET billing/info 500', async () => {
    const { billingService } = await import('../src/services/billingService.js');
    vi.mocked(billingService.getBillingInfo).mockRejectedValueOnce(new Error('x'));
    const res = await request(app).get('/api/billing/info').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(500);
  });

  it('GET billing/history success', async () => {
    const { billingService } = await import('../src/services/billingService.js');
    vi.mocked(billingService.getHistory).mockResolvedValueOnce([{ id: 1 }]);
    const res = await request(app).get('/api/billing/history').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });

  it('GET billing/history 500', async () => {
    const { billingService } = await import('../src/services/billingService.js');
    vi.mocked(billingService.getHistory).mockRejectedValueOnce(new Error('x'));
    const res = await request(app).get('/api/billing/history').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(500);
  });

  it('GET billing/methods returns flags', async () => {
    const res = await request(app).get('/api/billing/methods').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.stars).toBe(true);
  });

  it('DELETE billing/subscription success', async () => {
    const { billingService } = await import('../src/services/billingService.js');
    vi.mocked(billingService.cancelSubscription).mockResolvedValueOnce({ success: true });
    const res = await request(app).delete('/api/billing/subscription').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });

  it('DELETE billing/subscription 500', async () => {
    const { billingService } = await import('../src/services/billingService.js');
    vi.mocked(billingService.cancelSubscription).mockRejectedValueOnce(new Error('x'));
    const res = await request(app).delete('/api/billing/subscription').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(500);
  });

  it('POST ton/invoice 503 without wallet', async () => {
    delete process.env.TON_WALLET_ADDRESS;
    const res = await request(app).post('/api/billing/ton/invoice').set('Authorization', `Bearer ${userToken}`).send({ planId: 'pro' });
    expect(res.status).toBe(503);
  });

  it('POST ton/invoice success', async () => {
    process.env.TON_WALLET_ADDRESS = 'EQabc';
    const res = await request(app).post('/api/billing/ton/invoice').set('Authorization', `Bearer ${userToken}`).send({ planId: 'pro' });
    expect(res.status).toBe(200);
    delete process.env.TON_WALLET_ADDRESS;
  });

  it('POST ton/invoice validation fails', async () => {
    const res = await request(app).post('/api/billing/ton/invoice').set('Authorization', `Bearer ${userToken}`).send({});
    expect(res.status).toBe(400);
  });

  it('POST ton/invoice 500', async () => {
    process.env.TON_WALLET_ADDRESS = 'EQabc';
    const { createTonInvoice } = await import('../src/services/billing/tonService.js');
    vi.mocked(createTonInvoice).mockRejectedValueOnce(new Error('x'));
    const res = await request(app).post('/api/billing/ton/invoice').set('Authorization', `Bearer ${userToken}`).send({ planId: 'pro' });
    expect(res.status).toBe(500);
    delete process.env.TON_WALLET_ADDRESS;
  });

  it('GET ton/check no invoice -> fulfilled true', async () => {
    const { getUserPendingInvoice } = await import('../src/services/billing/tonService.js');
    vi.mocked(getUserPendingInvoice).mockResolvedValueOnce(null);
    const res = await request(app).get('/api/billing/ton/check').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.fulfilled).toBe(true);
  });

  it('GET ton/check with invoice', async () => {
    const { getUserPendingInvoice } = await import('../src/services/billing/tonService.js');
    vi.mocked(getUserPendingInvoice).mockResolvedValueOnce({ invoice_id: 't1', amount_ton: 1.5, expires_at: '2099' });
    const res = await request(app).get('/api/billing/ton/check').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.fulfilled).toBe(false);
  });

  it('GET ton/check 500', async () => {
    const { getUserPendingInvoice } = await import('../src/services/billing/tonService.js');
    vi.mocked(getUserPendingInvoice).mockRejectedValueOnce(new Error('x'));
    const res = await request(app).get('/api/billing/ton/check').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(500);
  });

  it('POST ukassa/invoice 503 when disabled', async () => {
    vi.mocked(isUkassaEnabled).mockReturnValueOnce(false);
    const res = await request(app).post('/api/billing/ukassa/invoice').set('Authorization', `Bearer ${userToken}`).send({ planId: 'pro' });
    expect(res.status).toBe(503);
  });

  it('POST ukassa/invoice success', async () => {
    vi.mocked(isUkassaEnabled).mockReturnValueOnce(true);
    const res = await request(app).post('/api/billing/ukassa/invoice').set('Authorization', `Bearer ${userToken}`).send({ planId: 'pro' });
    expect(res.status).toBe(200);
  });

  it('POST ukassa/invoice validation fails', async () => {
    const res = await request(app).post('/api/billing/ukassa/invoice').set('Authorization', `Bearer ${userToken}`).send({});
    expect(res.status).toBe(400);
  });

  it('POST ukassa/invoice 500', async () => {
    vi.mocked(isUkassaEnabled).mockReturnValueOnce(true);
    const { createUkassaPayment } = await import('../src/services/billing/ukassaService.js');
    vi.mocked(createUkassaPayment).mockRejectedValueOnce(new Error('x'));
    const res = await request(app).post('/api/billing/ukassa/invoice').set('Authorization', `Bearer ${userToken}`).send({ planId: 'pro' });
    expect(res.status).toBe(500);
  });

  it('POST ukassa/webhook invalid signature -> 403', async () => {
    vi.mocked(verifyUkassaSignature).mockReturnValueOnce(false);
    const res = await request(app).post('/api/billing/ukassa/webhook').set('x-request-signature', 'bad').send({ type: 'x' });
    expect(res.status).toBe(403);
  });

  it('POST ukassa/webhook valid signature -> ok', async () => {
    vi.mocked(verifyUkassaSignature).mockReturnValueOnce(true);
    const res = await request(app).post('/api/billing/ukassa/webhook').set('x-request-signature', 'ok').send({ type: 'notification' });
    expect(res.status).toBe(200);
  });
});

// ─── BOT WEBHOOK ──────────────────────────────────────────────────────────
describe('POST /api/bot/webhook', () => {
  it('no secret in test -> ok', async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    const res = await request(app).post('/api/bot/webhook').send({ update_id: 1 });
    expect(res.status).toBe(200);
  });

  it('invalid secret in production -> 403', async () => {
    process.env.NODE_ENV = 'production';
    process.env.TELEGRAM_WEBHOOK_SECRET = 'secret123';
    const res = await request(app).post('/api/bot/webhook').set('x-telegram-bot-api-secret-token', 'wrong').send({ update_id: 1 });
    process.env.NODE_ENV = 'test';
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    expect(res.status).toBe(403);
  });

  it('pre_checkout_query handled', async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    const res = await request(app).post('/api/bot/webhook').send({
      update_id: 1,
      pre_checkout_query: { id: 'pcq1', invoice_payload: JSON.stringify({ userId: '1', planId: 'pro' }) },
    });
    expect(res.status).toBe(200);
  });

  it('successful_payment handled', async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    const res = await request(app).post('/api/bot/webhook').send({
      update_id: 1,
      message: {
        chat: { id: 5 },
        successful_payment: { invoice_payload: JSON.stringify({ userId: '1', planId: 'pro' }), telegram_payment_charge_id: 'c1' },
      },
    });
    expect(res.status).toBe(200);
  });
});

// ─── STATS ────────────────────────────────────────────────────────────────
describe('Stats', () => {
  it('GET stats/percentile success', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ below_count: 5, total_count: 10 }] });
    const res = await request(app).get('/api/stats/percentile?score=5').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.percentile).toBe(50);
  });

  it('GET stats/percentile 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app).get('/api/stats/percentile').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(500);
  });

  it('GET referrals/stats success', async () => {
    const { referralService } = await import('../src/services/referralService.js');
    vi.mocked(referralService.getStats).mockResolvedValueOnce({ invited: 1 });
    const res = await request(app).get('/api/referrals/stats').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });

  it('GET referrals/stats 500', async () => {
    const { referralService } = await import('../src/services/referralService.js');
    vi.mocked(referralService.getStats).mockRejectedValueOnce(new Error('x'));
    const res = await request(app).get('/api/referrals/stats').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(500);
  });

  it('GET stats/categories empty cats -> {0,0}', async () => {
    const res = await request(app).get('/api/stats/categories').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ known: 0, total: 0 });
  });

  it('GET stats/categories success', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ known: 3, total: 10 }] });
    const res = await request(app).get('/api/stats/categories?categories=%5B%22OOP%22%5D').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.known).toBe(3);
  });

  it('GET stats/categories 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app).get('/api/stats/categories?categories=%5B%22OOP%22%5D').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(500);
  });

  it('GET stats success', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ known_count: 5, unknown_count: 3, total_seen: 8 }] })
      .mockResolvedValueOnce({ rows: [{ total: 100 }] })
      .mockResolvedValueOnce({ rows: [{ current_streak: 2, longest_streak: 5 }] });
    const res = await request(app).get('/api/stats').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.known).toBe(5);
  });

  it('GET stats 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app).get('/api/stats').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(500);
  });

  it('GET questions/due-count success', async () => {
    const { getDueCount } = await import('../src/services/questionService.js');
    vi.mocked(getDueCount).mockResolvedValueOnce(7);
    const res = await request(app).get('/api/questions/due-count').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(7);
  });

  it('GET questions/due-count 500', async () => {
    const { getDueCount } = await import('../src/services/questionService.js');
    vi.mocked(getDueCount).mockRejectedValueOnce(new Error('x'));
    const res = await request(app).get('/api/questions/due-count').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(500);
  });

  it('POST questions/mastery success', async () => {
    const { updateMastery } = await import('../src/services/questionService.js');
    vi.mocked(updateMastery).mockResolvedValueOnce({ success: true });
    const res = await request(app)
      .post('/api/questions/mastery')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ questionId: '1', quality: 5 });
    expect(res.status).toBe(200);
  });

  it('POST questions/mastery validation fails', async () => {
    const res = await request(app).post('/api/questions/mastery').set('Authorization', `Bearer ${userToken}`).send({});
    expect(res.status).toBe(400);
  });

  it('POST questions/mastery 500', async () => {
    const { updateMastery } = await import('../src/services/questionService.js');
    vi.mocked(updateMastery).mockRejectedValueOnce(new Error('x'));
    const res = await request(app)
      .post('/api/questions/mastery')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ questionId: '1', quality: 5 });
    expect(res.status).toBe(500);
  });
});

// ─── ADMIN ────────────────────────────────────────────────────────────────
describe('Admin endpoints', () => {
  it('POST grant-plan success (transaction)', async () => {
    const client = pool.connect();
    client.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // cancel
      .mockResolvedValueOnce({ rows: [] }) // insert
      .mockResolvedValueOnce({ rows: [] }) // update users
      .mockResolvedValueOnce({ rows: [] }); // COMMIT
    const res = await request(app)
      .post('/api/admin/grant-plan')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ targetUserId: '555', planId: 'pro' });
    expect(res.status).toBe(200);
  });

  it('POST grant-plan 500 on error', async () => {
    const client = pool.connect();
    client.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(new Error('x')); // insert -> ROLLBACK
    client.query.mockResolvedValue({ rows: [] }); // ROLLBACK
    const res = await request(app)
      .post('/api/admin/grant-plan')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ targetUserId: '555', planId: 'pro' });
    expect(res.status).toBe(500);
  });

  it('GET admin/users success', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ telegram_id: 1 }] });
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('GET admin/users 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(500);
  });

  it('GET admin/metrics success', async () => {
    const { metricsService } = await import('../src/services/metricsService.js');
    vi.mocked(metricsService.getSystemOverview).mockResolvedValueOnce({ totalUsers: 5 });
    const res = await request(app).get('/api/admin/metrics').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('GET admin/metrics 500', async () => {
    const { metricsService } = await import('../src/services/metricsService.js');
    vi.mocked(metricsService.getSystemOverview).mockRejectedValueOnce(new Error('x'));
    const res = await request(app).get('/api/admin/metrics').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(500);
  });

  it('POST admin/clear-cache success', async () => {
    pool.query.mockResolvedValueOnce({ rows: [], rowCount: 3 });
    redis.keys.mockResolvedValueOnce([]);
    const res = await request(app).post('/api/admin/clear-cache').set('Authorization', `Bearer ${adminToken}`).send({});
    expect(res.status).toBe(200);
  });

  it('POST admin/clear-cache 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app).post('/api/admin/clear-cache').set('Authorization', `Bearer ${adminToken}`).send({});
    expect(res.status).toBe(500);
  });

  it('GET admin/reports success', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(app).get('/api/admin/reports').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('GET admin/reports 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app).get('/api/admin/reports').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(500);
  });

  it('POST admin/reports/:id/approve success', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/admin/reports/1/approve').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('POST admin/reports/:id/approve 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app).post('/api/admin/reports/1/approve').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(500);
  });

  it('DELETE admin/questions/:id success', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app).delete('/api/admin/questions/1').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('DELETE admin/questions/:id 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app).delete('/api/admin/questions/1').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(500);
  });

  it('PUT admin/questions/:id success', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .put('/api/admin/questions/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ question_text: 'q', short_answer: 'a' });
    expect(res.status).toBe(200);
  });

  it('PUT admin/questions/:id 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'));
    const res = await request(app)
      .put('/api/admin/questions/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ question_text: 'q', short_answer: 'a' });
    expect(res.status).toBe(500);
  });
});
