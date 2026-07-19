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

describe('questionService', () => {
  let questionService;
  let pool;
  let logger;

  beforeAll(async () => {
    questionService = await import('../src/services/questionService.js');
    pool = (await import('../src/config/database.js')).default;
    logger = (await import('../src/config/logger.js')).default;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateMastery', () => {
    it('creates new mastery when rows.length === 0', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await questionService.updateMastery(1, 10, 5);

      expect(result).toEqual(expect.objectContaining({
        ef: expect.any(Number),
        interval: expect.any(Number),
        reps: expect.any(Number),
        nextReview: expect.any(Date),
      }));
      expect(result.reps).toBe(1);
      expect(result.interval).toBe(1);
    });

    it('updates existing record with quality >= 3 and reps === 0', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ ease_factor: 2.5, interval_days: 5, repetitions: 0 }] });
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await questionService.updateMastery(1, 10, 4);
      expect(result.reps).toBe(1);
      expect(result.interval).toBe(1);
    });

    it('uses interval 6 when reps === 1', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ ease_factor: 2.5, interval_days: 1, repetitions: 1 }] });
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await questionService.updateMastery(1, 10, 4);
      expect(result.reps).toBe(2);
      expect(result.interval).toBe(6);
    });

    it('multiplies interval by ef when reps > 1', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ ease_factor: 2.5, interval_days: 6, repetitions: 2 }] });
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await questionService.updateMastery(1, 10, 4);
      expect(result.reps).toBe(3);
      expect(result.interval).toBe(Math.round(6 * 2.5));
    });

    it('resets reps and interval when quality < 3', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ ease_factor: 2.5, interval_days: 30, repetitions: 5 }] });
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await questionService.updateMastery(1, 10, 1);
      expect(result.reps).toBe(0);
      expect(result.interval).toBe(1);
    });

    it('clamps EF to minimum 1.3', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ ease_factor: 1.3, interval_days: 1, repetitions: 0 }] });
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await questionService.updateMastery(1, 10, 0);
      expect(result.ef).toBeGreaterThanOrEqual(1.3);
    });

    it('returns object on success', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await questionService.updateMastery(1, 10, 3);
      expect(result).toHaveProperty('ef');
      expect(result).toHaveProperty('interval');
      expect(result).toHaveProperty('reps');
      expect(result).toHaveProperty('nextReview');
    });

    it('logs error and throws on failure', async () => {
      pool.query.mockRejectedValueOnce(new Error('db down'));
      await expect(questionService.updateMastery(1, 10, 3)).rejects.toThrow('db down');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getDueCount', () => {
    it('returns parsed count on success', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ count: '42' }] });
      const result = await questionService.getDueCount(1);
      expect(result).toBe(42);
    });

    it('uses custom language parameter', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ count: '7' }] });
      const result = await questionService.getDueCount(1, 'Python');
      expect(result).toBe(7);
      expect(pool.query.mock.calls[0][1]).toEqual([1, 'Python']);
    });

    it('returns 0 on failure', async () => {
      pool.query.mockRejectedValueOnce(new Error('db down'));
      const result = await questionService.getDueCount(1);
      expect(result).toBe(0);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
