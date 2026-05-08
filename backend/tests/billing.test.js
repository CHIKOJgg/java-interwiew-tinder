import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// 1. Setup Mocks BEFORE importing app
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
process.env.TON_WALLET_ADDRESS = 'test_wallet_address';
process.env.ADMIN_TELEGRAM_IDS = '123456789';

const { default: app } = await import('../src/server.js');
const { default: pool } = await import('../src/config/database.js');

describe('Billing Integration Tests', () => {
  const USER_ID = '987654321';
  const token = jwt.sign({ userId: USER_ID, plan: 'free' }, 'test_secret');

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('TON Billing', () => {
    it('POST /api/billing/ton/invoice should create an invoice', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/billing/ton/invoice')
        .set('Authorization', `Bearer ${token}`)
        .send({ planId: 'pro', interval: 'monthly' });

      expect(response.status).toBe(200);
      expect(response.body.address).toBe('test_wallet_address');
      expect(response.body.comment).toBeDefined();
    });

    it('GET /api/billing/ton/check should return pending invoice', async () => {
      pool.query.mockResolvedValueOnce({ 
        rows: [{ invoice_id: 'IT-987654321-abcd', amount_ton: 2.0 }] 
      });

      const response = await request(app)
        .get('/api/billing/ton/check')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.invoiceId).toBe('IT-987654321-abcd');
    });
  });

  describe('Stars Billing', () => {
    it('POST /api/billing/stars/invoice should send invoice', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, result: {} })
      });

      const response = await request(app)
        .post('/api/billing/stars/invoice')
        .set('Authorization', `Bearer ${token}`)
        .send({ planId: 'pro' });

      expect(response.status).toBe(200);
      expect(response.body.sent).toBe(true);
    });
  });

  describe('Billing Info & Management', () => {
    it('GET /api/billing/info should return current plan info', async () => {
      // Mock plan query first (used in requireEntitlement sometimes, but here we just need the info route)
      pool.query.mockResolvedValueOnce({
        rows: [{
          plan_id: 'pro',
          plan_name: 'Pro Plan',
          status: 'active',
          expires_at: new Date(Date.now() + 86400000),
          payment_provider: 'stars',
          cancelled_at: null
        }]
      });

      const response = await request(app)
        .get('/api/billing/info')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.plan).toBe('pro');
    });

    it('DELETE /api/billing/subscription should cancel active subscription', async () => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE sub
          .mockResolvedValueOnce({}) // UPDATE user
          .mockResolvedValueOnce({}), // COMMIT
        release: vi.fn(),
      };
      pool.connect.mockResolvedValueOnce(mockClient);

      const response = await request(app)
        .delete('/api/billing/subscription')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
