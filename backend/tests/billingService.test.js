import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

vi.mock('../src/config/database.js', () => ({
  default: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
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

vi.mock('../src/services/billing/starsService.js', () => ({
  activateStarsSubscription: vi.fn().mockResolvedValue({ success: true }),
}));

describe('billingService', () => {
  let billingService;
  let pool;
  let logger;
  let activateStarsSubscription;

  beforeAll(async () => {
    const mod = await import('../src/services/billingService.js');
    billingService = mod.billingService;
    pool = (await import('../src/config/database.js')).default;
    logger = (await import('../src/config/logger.js')).default;
    activateStarsSubscription = (await import('../src/services/billing/starsService.js')).activateStarsSubscription;
  });

  beforeEach(() => {
    vi.resetAllMocks();
    pool.query.mockResolvedValue({ rows: [] });
  });

  describe('activateSubscription', () => {
    it('defaults interval to monthly when undefined', async () => {
      await billingService.activateSubscription(1, 'pro', undefined, 'c1');
      expect(activateStarsSubscription).toHaveBeenCalledWith(1, 'pro', 'monthly', 'c1');
    });

    it('passes interval when provided', async () => {
      await billingService.activateSubscription(1, 'pro', 'yearly', 'c1');
      expect(activateStarsSubscription).toHaveBeenCalledWith(1, 'pro', 'yearly', 'c1');
    });
  });

  describe('cancelSubscription', () => {
    let client;

    beforeEach(() => {
      client = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };
      pool.connect.mockResolvedValue(client);
    });

    it('rolls back and returns "No active subscription found" when rowCount === 0', async () => {
      client.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      client.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // UPDATE user_subscriptions
      const result = await billingService.cancelSubscription(1);
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(result).toEqual({ success: true, message: 'No active subscription found' });
      expect(client.release).toHaveBeenCalled();
    });

    it('updates users, commits and returns success when rowCount > 0', async () => {
      client.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      client.query.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // UPDATE user_subscriptions
      client.query.mockResolvedValueOnce({ rows: [] }); // UPDATE users
      const result = await billingService.cancelSubscription(1);
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(logger.info).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
      expect(client.release).toHaveBeenCalled();
    });

    it('rolls back, logs error and throws on failure', async () => {
      client.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      client.query.mockRejectedValueOnce(new Error('db down')); // UPDATE user_subscriptions fails
      await expect(billingService.cancelSubscription(1)).rejects.toThrow('db down');
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(logger.error).toHaveBeenCalled();
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe('getHistory', () => {
    it('defaults limit to 10', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      const result = await billingService.getHistory(1);
      expect(result).toEqual([{ id: 1 }]);
      expect(pool.query.mock.calls[0][1]).toEqual([1, 10]);
    });

    it('uses custom limit', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 2 }] });
      const result = await billingService.getHistory(1, 25);
      expect(result).toEqual([{ id: 2 }]);
      expect(pool.query.mock.calls[0][1]).toEqual([1, 25]);
    });

    it('returns [] on failure', async () => {
      pool.query.mockRejectedValueOnce(new Error('db down'));
      const result = await billingService.getHistory(1);
      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getBillingInfo', () => {
    it('returns active subscription info with is_cancelled false', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          plan_id: 'pro', plan_name: 'Pro', expires_at: '2099-01-01',
          status: 'active', cancelled_at: null, payment_provider: 'stars',
        }]
      });
      const result = await billingService.getBillingInfo(1);
      expect(result).toEqual({
        plan: 'pro', plan_name: 'Pro', expires_at: '2099-01-01',
        status: 'active', is_cancelled: false, provider: 'stars',
      });
    });

    it('sets is_cancelled true when cancelled_at present', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          plan_id: 'pro', plan_name: 'Pro', expires_at: '2099-01-01',
          status: 'active', cancelled_at: '2099-01-01', payment_provider: 'stars',
        }]
      });
      const result = await billingService.getBillingInfo(1);
      expect(result.is_cancelled).toBe(true);
    });

    it('falls back to users free plan when no active row', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      pool.query.mockResolvedValueOnce({ rows: [{ subscription_plan: 'free' }] });
      const result = await billingService.getBillingInfo(1);
      expect(result).toEqual({ plan: 'free', plan_name: 'Free', status: 'active' });
    });

    it('uses plan name from users when plan !== free', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      pool.query.mockResolvedValueOnce({ rows: [{ subscription_plan: 'pro' }] });
      const result = await billingService.getBillingInfo(1);
      expect(result).toEqual({ plan: 'pro', plan_name: 'pro', status: 'active' });
    });

    it('returns free/active on failure', async () => {
      pool.query.mockRejectedValueOnce(new Error('db down'));
      const result = await billingService.getBillingInfo(1);
      expect(result).toEqual({ plan: 'free', status: 'active' });
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
