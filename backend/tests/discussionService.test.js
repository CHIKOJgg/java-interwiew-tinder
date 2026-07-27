import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

vi.mock('../src/config/database.js', () => ({
  default: { query: vi.fn().mockResolvedValue({ rows: [] }) }
}));

vi.mock('../src/config/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() }
}));

describe('discussionService', () => {
  let svc, pool, logger;

  beforeAll(async () => {
    svc = await import('../src/services/discussionService.js');
    pool = (await import('../src/config/database.js')).default;
    logger = (await import('../src/config/logger.js')).default;
  });

  beforeEach(() => { vi.clearAllMocks(); });

  describe('getDiscussions', () => {
    it('returns empty array when no discussions', async () => {
      pool.query.mockResolvedValue({ rows: [] });
      const result = await svc.getDiscussions(1, 42);
      expect(result).toEqual([]);
    });

    it('loads replies for threads that have them', async () => {
      const discRow = { id: 10, reply_count: 2, question_id: 1, content: 'Main', upvotes: 3 };
      const replyRows = [
        { id: 11, parent_id: 10, content: 'Reply 1', upvotes: 1 },
        { id: 12, parent_id: 10, content: 'Reply 2', upvotes: 2 },
      ];
      pool.query
        .mockResolvedValueOnce({ rows: [discRow] })
        .mockResolvedValueOnce({ rows: replyRows });

      const result = await svc.getDiscussions(1, 42);
      expect(result).toHaveLength(1);
      expect(result[0].replies).toHaveLength(2);
      expect(result[0].replies[0].content).toBe('Reply 1');
    });

    it('logs error and re-throws on DB failure', async () => {
      const dbError = new Error('connection lost');
      pool.query.mockRejectedValueOnce(dbError);
      await expect(svc.getDiscussions(1, 42)).rejects.toThrow('connection lost');
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ err: dbError }), 'getDiscussions failed');
    });
  });

  describe('createDiscussion', () => {
    it('inserts and returns new discussion', async () => {
      const createdAt = new Date();
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1, created_at: createdAt }] });
      const result = await svc.createDiscussion(1, 42, 'Hello', 'code', null);
      expect(result.id).toBe(1);
      expect(result.created_at).toBe(createdAt);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO question_discussions'),
        [1, 42, 'Hello', 'code', null]
      );
    });

    it('logs error on DB failure', async () => {
      const dbError = new Error('insert failed');
      pool.query.mockRejectedValueOnce(dbError);
      await expect(svc.createDiscussion(1, 42, 'text')).rejects.toThrow('insert failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('voteDiscussion', () => {
    it('creates new upvote', async () => {
      pool.query.mockResolvedValue({ rows: [] });
      pool.query.mockResolvedValue({ rows: [] });
      const result = await svc.voteDiscussion(10, 42, 1);
      expect(result.vote).toBe(1);
    });

    it('removes vote when same vote clicked (toggle off)', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ vote: 1 }] });
      pool.query.mockResolvedValueOnce({ rows: [] });
      pool.query.mockResolvedValueOnce({ rows: [] });
      const result = await svc.voteDiscussion(10, 42, 1);
      expect(result.vote).toBe(0);
    });

    it('switches vote direction', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ vote: -1 }] });
      pool.query.mockResolvedValueOnce({ rows: [] });
      pool.query.mockResolvedValueOnce({ rows: [] });
      const result = await svc.voteDiscussion(10, 42, 1);
      expect(result.vote).toBe(1);
    });

    it('logs error on DB failure', async () => {
      const dbError = new Error('vote failed');
      pool.query.mockRejectedValueOnce(dbError);
      await expect(svc.voteDiscussion(10, 42, 1)).rejects.toThrow('vote failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('markSolution', () => {
    it('marks discussion as solution', async () => {
      pool.query.mockResolvedValue({ rows: [] });
      await svc.markSolution(10, 1, 42);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE question_discussions SET is_solution'),
        [10, 1, 42]
      );
    });

    it('logs error on DB failure', async () => {
      const dbError = new Error('update failed');
      pool.query.mockRejectedValueOnce(dbError);
      await expect(svc.markSolution(10, 1, 42)).rejects.toThrow('update failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
