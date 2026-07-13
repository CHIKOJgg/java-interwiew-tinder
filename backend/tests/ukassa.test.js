import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createHmac } from 'crypto';

// 1. Mocks BEFORE importing app
vi.mock('../src/config/database.js', () => ({
  default: {
    query: vi.fn(),
    on: vi.fn(),
    connect: vi.fn().mockReturnValue({ query: vi.fn(), release: vi.fn() }),
  }
}));

vi.mock('../src/config/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() }
}));

vi.mock('pino-http', () => ({
  default: vi.fn().mockReturnValue((req, res, next) => { req.log = { info: vi.fn(), error: vi.fn(), warn: vi.fn() }; next(); })
}));

vi.mock('../src/config/redis.js', () => ({
  default: { get: vi.fn(), setex: vi.fn(), on: vi.fn() },
  isConnected: vi.fn().mockResolvedValue(true),
}));

// 2. Env BEFORE import
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
process.env.TON_WALLET_ADDRESS = 'test_wallet_address';
process.env.ADMIN_TELEGRAM_IDS = '123456789';
process.env.UKASSA_TOKEN = 'test_ukassa_secret';
process.env.UKASSA_SHOP_ID = 'test_shop';

const { default: app } = await import('../src/server.js');
const { default: pool } = await import('../src/config/database.js');
const { isUkassaEnabled, verifyUkassaSignature, createUkassaPayment } = await import('../src/services/billing/ukassaService.js');

const USER_ID = '987654321';
const token = jwt.sign({ userId: USER_ID, plan: 'free' }, 'test_secret');

describe('U-Kassa (bank card) provider', () => {
  afterEach(() => vi.clearAllMocks());

  describe('enablement gating', () => {
    it('isUkassaEnabled() is true when UKASSA_TOKEN set, false when unset', () => {
      expect(isUkassaEnabled()).toBe(true);
      const saved = process.env.UKASSA_TOKEN;
      delete process.env.UKASSA_TOKEN;
      expect(isUkassaEnabled()).toBe(false);
      process.env.UKASSA_TOKEN = saved;
      expect(isUkassaEnabled()).toBe(true);
    });
  });

  describe('signature verification', () => {
    it('accepts a correct HMAC-SHA256 signature over the raw body', () => {
      const token = process.env.UKASSA_TOKEN;
      const raw = JSON.stringify({ event: 'payment.succeeded', object: { id: 'pay_1' } });
      const sig = createHmac('sha256', token).update(raw).digest('hex');
      expect(verifyUkassaSignature(Buffer.from(raw), sig)).toBe(true);
    });

    it('rejects a wrong signature', () => {
      const raw = JSON.stringify({ event: 'payment.succeeded' });
      expect(verifyUkassaSignature(Buffer.from(raw), 'deadbeef')).toBe(false);
    });

    it('rejects when signature is missing', () => {
      expect(verifyUkassaSignature(Buffer.from('{}'), undefined)).toBe(false);
    });
  });

  describe('POST /api/billing/ukassa/invoice', () => {
    it('returns a confirmation URL when configured', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'pay_test', status: 'pending', confirmation: { confirmation_url: 'https://yookassa.ru/pay_test' } }),
      });

      const response = await request(app)
        .post('/api/billing/ukassa/invoice')
        .set('Authorization', `Bearer ${token}`)
        .send({ planId: 'pro', interval: 'monthly' });

      expect(response.status).toBe(200);
      expect(response.body.paymentId).toBe('pay_test');
      expect(response.body.confirmationUrl).toBe('https://yookassa.ru/pay_test');

      const [url, opts] = global.fetch.mock.calls[0];
      expect(url).toContain('api.yookassa.ru/v3/payments');
      const body = JSON.parse(opts.body);
      expect(body.amount.currency).toBe('RUB');
      expect(body.payment_method_data.type).toBe('bank_card');
      expect(body.metadata.userId).toBe(USER_ID);
      expect(opts.headers.Authorization).toMatch(/^Basic /);
    });

    it('returns 503 when U-Kassa is not configured', async () => {
      const saved = process.env.UKASSA_TOKEN;
      delete process.env.UKASSA_TOKEN;
      const response = await request(app)
        .post('/api/billing/ukassa/invoice')
        .set('Authorization', `Bearer ${token}`)
        .send({ planId: 'pro' });
      expect(response.status).toBe(503);
      process.env.UKASSA_TOKEN = saved;
    });
  });

  describe('GET /api/billing/methods', () => {
    it('reports card availability based on UKASSA_TOKEN', async () => {
      const response = await request(app).get('/api/billing/methods').set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('stars');
      expect(response.body).toHaveProperty('ton');
      expect(response.body.card).toBe(true);
    });
  });

  describe('POST /api/billing/ukassa/webhook', () => {
    it('activates subscription on a valid signed payment.succeeded event', async () => {
      const event = {
        event: 'payment.succeeded',
        object: { id: 'pay_webhook', metadata: { userId: USER_ID, planId: 'pro', interval: 'monthly' } },
      };
      const raw = JSON.stringify(event);
      const sig = createHmac('sha256', process.env.UKASSA_TOKEN).update(raw).digest('hex');

      const response = await request(app)
        .post('/api/billing/ukassa/webhook')
        .set('Content-Type', 'application/json')
        .set('X-Request-Signature', sig)
        .send(raw);

      expect(response.status).toBe(200);
      // activation writes to user_subscriptions + users tables
      expect(pool.query).toHaveBeenCalled();
    });

    it('rejects an unsigned webhook with 403', async () => {
      const event = { event: 'payment.succeeded', object: { id: 'pay_x' } };
      const response = await request(app)
        .post('/api/billing/ukassa/webhook')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(event));
      expect(response.status).toBe(403);
    });
  });

  describe('createUkassaPayment (unit)', () => {
    it('uses Bearer auth when no shop id is configured', async () => {
      const savedShop = process.env.UKASSA_SHOP_ID;
      delete process.env.UKASSA_SHOP_ID;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'pay_b', status: 'pending', confirmation: { confirmation_url: 'https://x/y' } }),
      });
      await createUkassaPayment(USER_ID, 'pro', 'monthly', 'https://t.me');
      const [, opts] = global.fetch.mock.calls[0];
      expect(opts.headers.Authorization).toMatch(/^Bearer /);
      process.env.UKASSA_SHOP_ID = savedShop;
    });
  });
});
