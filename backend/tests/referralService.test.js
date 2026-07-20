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
  sendTelegramMessage: vi.fn().mockResolvedValue({ ok: true }),
}));

describe('referralService', () => {
  let referralService;
  let pool;
  let logger;
  let sendTelegramMessage;

  beforeAll(async () => {
    const mod = await import('../src/services/referralService.js');
    referralService = mod.referralService;
    pool = (await import('../src/config/database.js')).default;
    logger = (await import('../src/config/logger.js')).default;
    sendTelegramMessage = (await import('../src/services/billing/starsService.js')).sendTelegramMessage;
  });

  beforeEach(() => {
    vi.resetAllMocks();
    pool.query.mockResolvedValue({ rows: [] });
  });

  describe('trackReferral', () => {
    let client;

    beforeEach(() => {
      client = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };
      pool.connect.mockResolvedValue(client);
    });

    it('returns early without connecting when referrer === referred', async () => {
      await referralService.trackReferral(1, 1);
      expect(pool.connect).not.toHaveBeenCalled();
    });

    it('grants a two-sided reward and notifies both sides on first insert', async () => {
      client.query.mockResolvedValueOnce({ rows: [] });            // BEGIN
      client.query.mockResolvedValueOnce({ rows: [{ id: 9 }] });   // INSERT ... RETURNING id
      client.query.mockResolvedValue({ rows: [] });                // grants + UPDATE + COMMIT
      pool.query.mockResolvedValueOnce({ rows: [{ telegram_id: 1, first_name: 'Al' }, { telegram_id: 2, first_name: 'Bo' }] });
      sendTelegramMessage.mockResolvedValue({ ok: true });

      await referralService.trackReferral(1, 2);

      expect(client.query).toHaveBeenCalledWith('BEGIN');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(logger.info).toHaveBeenCalled();
      expect(sendTelegramMessage).toHaveBeenCalledTimes(2);
    });

    it('does not double-reward when the user was already referred', async () => {
      client.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      client.query.mockResolvedValueOnce({ rows: [] }); // INSERT DO NOTHING -> no rows
      client.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      await referralService.trackReferral(1, 2);

      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(sendTelegramMessage).not.toHaveBeenCalled();
    });

    it('rolls back and logs error on failure', async () => {
      client.query.mockResolvedValueOnce({ rows: [] });        // BEGIN
      client.query.mockRejectedValueOnce(new Error('db down')); // INSERT fails
      await referralService.trackReferral(1, 2);
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(logger.error).toHaveBeenCalled();
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe('processConversion', () => {
    let client;

    beforeEach(() => {
      client = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };
      pool.connect.mockResolvedValue(client);
    });

    it('commits and returns when no referral record', async () => {
      client.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      client.query.mockResolvedValueOnce({ rows: [] }); // SELECT (empty)

      await referralService.processConversion(2);

      expect(client.query).toHaveBeenCalledWith('BEGIN');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(sendTelegramMessage).not.toHaveBeenCalled();
    });

    it('grants reward, commits, logs info and notifies when record exists', async () => {
      client.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      client.query.mockResolvedValueOnce({ rows: [{ referrer_id: 1, id: 5 }] }); // SELECT
      client.query.mockResolvedValueOnce({ rows: [] }); // UPDATE referrals
      client.query.mockResolvedValueOnce({ rows: [] }); // UPDATE user_subscriptions
      client.query.mockResolvedValueOnce({ rows: [] }); // UPDATE users
      client.query.mockResolvedValueOnce({ rows: [] }); // COMMIT
      pool.query.mockResolvedValueOnce({ rows: [{ first_name: 'Bob' }] });
      sendTelegramMessage.mockResolvedValue({ ok: true });

      await referralService.processConversion(2);

      expect(client.query).toHaveBeenCalledWith('BEGIN');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(logger.info).toHaveBeenCalled();
      expect(sendTelegramMessage).toHaveBeenCalled();
    });

    it('logs error when sendTelegramMessage rejects', async () => {
      client.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      client.query.mockResolvedValueOnce({ rows: [{ referrer_id: 1, id: 5 }] }); // SELECT
      client.query.mockResolvedValueOnce({ rows: [] }); // UPDATE referrals
      client.query.mockResolvedValueOnce({ rows: [] }); // UPDATE user_subscriptions
      client.query.mockResolvedValueOnce({ rows: [] }); // UPDATE users
      client.query.mockResolvedValueOnce({ rows: [] }); // COMMIT
      pool.query.mockResolvedValueOnce({ rows: [{ first_name: 'Bob' }] });
      sendTelegramMessage.mockRejectedValue(new Error('tg down'));

      await referralService.processConversion(2);
      expect(logger.error).toHaveBeenCalled();
    });

    it('rolls back, logs error and releases on failure', async () => {
      client.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      client.query.mockResolvedValueOnce({ rows: [{ referrer_id: 1, id: 5 }] }); // SELECT
      client.query.mockRejectedValueOnce(new Error('db down')); // UPDATE referrals fails

      await referralService.processConversion(2);
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(logger.error).toHaveBeenCalled();
      expect(client.release).toHaveBeenCalled();
    });

    it('releases client in finally', async () => {
      client.query.mockResolvedValueOnce({ rows: [] });
      await referralService.processConversion(2);
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('returns total/converted/rewardDays on success', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ total_referrals: '3', converted_referrals: '2' }] });
      const result = await referralService.getStats(1);
      // Two-sided: 7 days per signup (3) + 7 days per conversion (2) = 35.
      expect(result).toEqual({ total: 3, converted: 2, rewardDays: 35 });
    });

    it('returns zeros on failure', async () => {
      pool.query.mockRejectedValueOnce(new Error('db down'));
      const result = await referralService.getStats(1);
      expect(result).toEqual({ total: 0, converted: 0, rewardDays: 0 });
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
