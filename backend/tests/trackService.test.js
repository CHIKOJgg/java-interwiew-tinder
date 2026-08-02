import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

vi.mock('../src/config/database.js', () => ({
  default: { query: vi.fn().mockResolvedValue({ rows: [] }) }
}));

vi.mock('../src/config/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() }
}));

describe('trackService', () => {
  let svc, pool, logger;

  beforeAll(async () => {
    svc = await import('../src/services/trackService.js');
    pool = (await import('../src/config/database.js')).default;
    logger = (await import('../src/config/logger.js')).default;
  });

  beforeEach(() => { vi.clearAllMocks(); });

  describe('getTracks', () => {
    it('returns tracks for language', async () => {
      const tracks = [{ id: 1, name: 'Java Core', language: 'Java' }];
      pool.query.mockResolvedValueOnce({ rows: tracks });
      const result = await svc.getTracks('Java');
      expect(result).toEqual(tracks);
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('learning_tracks'), ['Java']);
    });

    it('returns empty array when no tracks', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const result = await svc.getTracks('Python');
      expect(result).toEqual([]);
    });

    it('logs error on DB failure', async () => {
      const err = new Error('db down');
      pool.query.mockRejectedValueOnce(err);
      await expect(svc.getTracks('Java')).rejects.toThrow('db down');
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ err }), 'getTracks failed');
    });
  });

  describe('getTrackWithProgress', () => {
    it('returns null when track not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const result = await svc.getTrackWithProgress(1, 42);
      expect(result).toBeNull();
    });

    it('returns track with progress and steps', async () => {
      const trackRow = { id: 1, name: 'Java Core' };
      const progressRow = { current_step: 2, completed: false, completed_at: null };
      const stepRows = [
        { step_order: 1, id: 10, question: 'Q1?', short_answer: 'A1', difficulty: 'Junior' },
        { step_order: 2, id: 11, question: 'Q2?', short_answer: 'A2', difficulty: 'Middle' },
      ];
      pool.query
        .mockResolvedValueOnce({ rows: [trackRow] })
        .mockResolvedValueOnce({ rows: [progressRow] })
        .mockResolvedValueOnce({ rows: stepRows });

      const result = await svc.getTrackWithProgress(1, 42);
      expect(result.name).toBe('Java Core');
      expect(result.totalSteps).toBe(2);
      expect(result.currentStep).toBe(2);
      expect(result.steps).toHaveLength(2);
    });

    it('logs error on DB failure', async () => {
      pool.query.mockRejectedValueOnce(new Error('fail'));
      await expect(svc.getTrackWithProgress(1, 42)).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getNextTrackQuestion', () => {
    it('returns null when track completed', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ completed: true, current_step: 10 }] });
      const result = await svc.getNextTrackQuestion(1, 42);
      expect(result).toBeNull();
    });

    it('returns next question when available', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ current_step: 0, completed: false }] });
      pool.query.mockResolvedValueOnce({ rows: [{ id: 10, question: 'Q?' }] });
      const result = await svc.getNextTrackQuestion(1, 42);
      expect(result.id).toBe(10);
    });

    it('returns null when no further step found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ current_step: 5, completed: false }] });
      pool.query.mockResolvedValueOnce({ rows: [] });
      const result = await svc.getNextTrackQuestion(1, 42);
      expect(result).toBeNull();
    });

    it('logs error on DB failure', async () => {
      pool.query.mockRejectedValueOnce(new Error('fail'));
      await expect(svc.getNextTrackQuestion(1, 42)).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('advanceTrack', () => {
    it('advances to next step when not completed', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })            // track exists
        .mockResolvedValueOnce({ rows: [{ max: 5 }] })           // MAX step_order
        .mockResolvedValueOnce({ rows: [{ current_step: 1 }] })  // progress
        .mockResolvedValueOnce({ rows: [] });                    // upsert
      const result = await svc.advanceTrack(1, 42);
      expect(result.currentStep).toBe(2);
      expect(result.completed).toBe(false);
    });

    it('marks completed when reaching final step', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ max: 5 }] })
        .mockResolvedValueOnce({ rows: [{ current_step: 4 }] })
        .mockResolvedValueOnce({ rows: [] });
      const result = await svc.advanceTrack(1, 42);
      expect(result.currentStep).toBe(5);
      expect(result.completed).toBe(true);
    });

    it('handles first-time progress (no row)', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ max: 3 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      const result = await svc.advanceTrack(1, 42);
      expect(result.currentStep).toBe(1);
      expect(result.completed).toBe(false);
    });

    it('returns completed state without re-inserting when already completed', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ max: 3 }] })
        .mockResolvedValueOnce({ rows: [{ current_step: 3, completed: true }] });
      const result = await svc.advanceTrack(1, 42);
      expect(result.completed).toBe(true);
      expect(pool.query).toHaveBeenCalledTimes(3);
    });

    it('rejects when track does not exist', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      await expect(svc.advanceTrack(999, 42)).rejects.toMatchObject({ status: 404 });
    });

    it('logs error on DB failure', async () => {
      pool.query.mockRejectedValueOnce(new Error('fail'));
      await expect(svc.advanceTrack(1, 42)).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
