import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// 1. Setup Mocks BEFORE importing app
vi.mock('../src/config/database.js', () => ({
  default: {
    query: vi.fn(),
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
    setex: vi.fn(),
    on: vi.fn(),
  },
  isConnected: vi.fn().mockResolvedValue(true),
}));

// 2. Set test env BEFORE importing app
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
process.env.ADMIN_TELEGRAM_IDS = '123456789';

const { default: app } = await import('../src/server.js');
const { default: pool } = await import('../src/config/database.js');

describe('Auth Integration Tests', () => {
  const JWT_SECRET = 'test_secret';
  const ADMIN_ID = '123456789';
  const USER_ID = '987654321';

  beforeAll(() => {
    // These are already set globally but ensure local consistency
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.ADMIN_TELEGRAM_IDS = ADMIN_ID;
    process.env.NODE_ENV = 'test';
    process.env.BOT_TOKEN = ''; // Force mockValidation
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should login and return a token with valid initData', async () => {
      const mockUser = {
        telegram_id: parseInt(USER_ID),
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
      };

      pool.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // INSERT users
        .mockResolvedValueOnce({ rows: [] }); // SELECT user_subscriptions

      const response = await request(app)
        .post('/api/auth/login')
        .send({ initData: 'user=%7B%22id%22%3A987654321%2C%22username%22%3A%22testuser%22%7D' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
    });
  });

  describe('Protected Routes', () => {
    it('should return 401 if Authorization header is missing', async () => {
      const response = await request(app).get('/api/stats');
      expect(response.status).toBe(401);
    });

    it('should return 401 if JWT is invalid or expired', async () => {
      const response = await request(app)
        .get('/api/stats')
        .set('Authorization', 'Bearer invalid_token');
      expect(response.status).toBe(401);
    });

    it('should return 200 if valid JWT is provided', async () => {
      const token = jwt.sign({ userId: USER_ID, plan: 'free' }, JWT_SECRET);
      
      pool.query
        .mockResolvedValueOnce({ rows: [{ known_count: 5, unknown_count: 10, total_seen: 15 }] }) // result
        .mockResolvedValueOnce({ rows: [{ total: 100 }] }); // totalResult

      const response = await request(app)
        .get('/api/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.known).toBe(5);
    });
  });

  describe('Admin Routes', () => {
    it('should return 403 if user is not an admin', async () => {
      const token = jwt.sign({ userId: USER_ID, plan: 'free' }, JWT_SECRET);
      
      const response = await request(app)
        .post('/api/admin/grant-plan')
        .set('Authorization', `Bearer ${token}`)
        .send({ targetUserId: USER_ID, planId: 'pro' });

      expect(response.status).toBe(403);
    });

    it('should return 200 if user is an admin', async () => {
      const token = jwt.sign({ userId: ADMIN_ID, plan: 'admin' }, JWT_SECRET);
      
      pool.query.mockResolvedValue({ rows: [] }); 

      const response = await request(app)
        .post('/api/admin/grant-plan')
        .set('Authorization', `Bearer ${token}`)
        .send({ targetUserId: USER_ID, planId: 'pro' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
