import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

vi.mock('../src/config/database.js', () => ({
  default: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
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

describe('metricsService', () => {
  let metricsService;
  let pool;
  let logger;

  beforeAll(async () => {
    const mod = await import('../src/services/metricsService.js');
    metricsService = mod.metricsService;
    pool = (await import('../src/config/database.js')).default;
    logger = (await import('../src/config/logger.js')).default;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackEvent', () => {
    it('inserts event on success', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      await metricsService.trackEvent(1, 'click', { a: 1 }, 10);
      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(pool.query.mock.calls[0][0]).toContain('INSERT INTO analytics_events');
    });

    it('logs error on failure', async () => {
      pool.query.mockRejectedValueOnce(new Error('db down'));
      await metricsService.trackEvent(1, 'click');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getSystemOverview', () => {
    it('aggregates 6 queries on success', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ total_users: '10', total_questions: '5', active_subscribers: '2' }] })
        .mockResolvedValueOnce({ rows: [{ dau: '1', wau: '2', mau: '3' }] })
        .mockResolvedValueOnce({ rows: [{ monthly_revenue: '123.456' }] })
        .mockResolvedValueOnce({ rows: [{ count: '4' }] })
        .mockResolvedValueOnce({ rows: [{ question_text: 'q', fail_count: '2' }] })
        .mockResolvedValueOnce({ rows: [{ status: 'pending', count: '3' }, { status: 'done', count: '1' }] });

      const result = await metricsService.getSystemOverview();

      expect(pool.query).toHaveBeenCalledTimes(6);
      expect(result.overview.monthlyRevenue).toBe('123.46');
      expect(result.activity.dau).toBe(1);
      expect(result.activity.wau).toBe(2);
      expect(result.activity.mau).toBe(3);
      expect(result.topFailedQuestions).toEqual([{ question_text: 'q', fail_count: '2' }]);
      expect(result.jobs).toEqual({ pending: 3, done: 1 });
    });

    it('uses parseFloat fallback and ||0 defaults', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ total_users: null, total_questions: '5', active_subscribers: '2' }] })
        .mockResolvedValueOnce({ rows: [{ dau: null, wau: null, mau: null }] })
        .mockResolvedValueOnce({ rows: [{ monthly_revenue: null }] })
        .mockResolvedValueOnce({ rows: [{ count: '4' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await metricsService.getSystemOverview();
      expect(result.overview.monthlyRevenue).toBe('0.00');
      expect(result.activity.dau).toBe(0);
    });

    it('logs error and throws on failure', async () => {
      pool.query.mockRejectedValueOnce(new Error('db down'));
      await expect(metricsService.getSystemOverview()).rejects.toThrow('db down');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
