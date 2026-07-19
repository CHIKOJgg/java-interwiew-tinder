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

describe('queueService', () => {
  let queueService;
  let pool;
  let logger;

  beforeAll(async () => {
    queueService = await import('../src/services/queueService.js');
    pool = (await import('../src/config/database.js')).default;
    logger = (await import('../src/config/logger.js')).default;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initQueueTable', () => {
    it('runs create table and resolves on success', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      await expect(queueService.initQueueTable()).resolves.toBeUndefined();
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('does not throw when query rejects', async () => {
      pool.query.mockRejectedValueOnce(new Error('exists'));
      await expect(queueService.initQueueTable()).resolves.toBeUndefined();
    });
  });

  describe('enqueueJob', () => {
    it('inserts with JSON-stringified payload on success', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      await queueService.enqueueJob('gen', { a: 1 });
      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(pool.query.mock.calls[0][0]).toContain('INSERT INTO ai_jobs');
      expect(pool.query.mock.calls[0][1]).toEqual(['gen', JSON.stringify({ a: 1 })]);
    });

    it('logs error on failure', async () => {
      pool.query.mockRejectedValueOnce(new Error('db down'));
      await queueService.enqueueJob('gen', { a: 1 });
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('cleanOldJobs', () => {
    it('defaults daysOld to 7', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      await queueService.cleanOldJobs();
      expect(pool.query.mock.calls[0][1]).toEqual([7]);
    });

    it('uses custom daysOld', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      await queueService.cleanOldJobs(30);
      expect(pool.query.mock.calls[0][1]).toEqual([30]);
    });

    it('logs error on failure', async () => {
      pool.query.mockRejectedValueOnce(new Error('db down'));
      await queueService.cleanOldJobs();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
