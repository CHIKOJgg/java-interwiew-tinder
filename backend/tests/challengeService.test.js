import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

vi.mock('../src/config/database.js', () => ({
  default: { query: vi.fn().mockResolvedValue({ rows: [] }) }
}));

vi.mock('../src/config/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() }
}));

describe('challengeService', () => {
  let svc, pool, logger;

  beforeAll(async () => {
    svc = await import('../src/services/challengeService.js');
    pool = (await import('../src/config/database.js')).default;
    logger = (await import('../src/config/logger.js')).default;
  });

  beforeEach(() => { vi.clearAllMocks(); });

  describe('getCurrentChallenge', () => {
    it('returns challenge when found', async () => {
      const challenge = { id: 1, language: 'Java', theme: 'Spring Basics' };
      pool.query.mockResolvedValueOnce({ rows: [challenge] });
      const result = await svc.getCurrentChallenge('Java');
      expect(result).toEqual(challenge);
    });

    it('returns null when no active challenge', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const result = await svc.getCurrentChallenge('Python');
      expect(result).toBeNull();
    });

    it('logs error on DB failure', async () => {
      pool.query.mockRejectedValueOnce(new Error('fail'));
      await expect(svc.getCurrentChallenge('Java')).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getLeaderboard', () => {
    it('returns leaderboard rows with rank', async () => {
      const lb = [{ user_id: 1, first_name: 'Alice', score: 100 }];
      pool.query.mockResolvedValueOnce({ rows: lb });
      const result = await svc.getLeaderboard(1);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ user_id: 1, first_name: 'Alice', rank: 1 });
    });

    it('applies limit parameter', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      await svc.getLeaderboard(1, 5);
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1, 5]);
    });

    it('logs error on DB failure', async () => {
      pool.query.mockRejectedValueOnce(new Error('fail'));
      await expect(svc.getLeaderboard(1)).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('submitChallengeResult', () => {
    it('inserts challenge result with streak bonus', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ current_streak: 5 }] });
      pool.query.mockResolvedValueOnce({ rows: [] });
      await svc.submitChallengeResult(1, 42, 90, 10, 0.9);
      expect(pool.query).toHaveBeenCalledTimes(2);
      const secondCall = pool.query.mock.calls[1];
      expect(secondCall[0]).toContain('INSERT INTO challenge_results');
    });

    it('logs error on DB failure', async () => {
      pool.query.mockRejectedValueOnce(new Error('fail'));
      await expect(svc.submitChallengeResult(1, 42, 90, 10, 0.9)).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('createWeeklyChallenge', () => {
    it('creates challenge with provided theme', async () => {
      const row = { id: 1, language: 'Java', theme: 'My Theme' };
      pool.query.mockResolvedValueOnce({ rows: [row] });
      const result = await svc.createWeeklyChallenge('Java', 'My Theme');
      expect(result.id).toBe(1);
    });

    it('returns null when conflict (ON CONFLICT DO NOTHING)', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const result = await svc.createWeeklyChallenge('Java', 'Existing');
      expect(result).toBeNull();
    });

    it('logs error on DB failure', async () => {
      pool.query.mockRejectedValueOnce(new Error('fail'));
      await expect(svc.createWeeklyChallenge('Java', 'Theme')).rejects.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
