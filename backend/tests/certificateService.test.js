import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

vi.mock('../src/config/database.js', () => ({
  default: { query: vi.fn().mockResolvedValue({ rows: [] }) }
}));

vi.mock('../src/config/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() }
}));

describe('certificateService', () => {
  let svc, pool, logger;

  beforeAll(async () => {
    svc = await import('../src/services/certificateService.js');
    pool = (await import('../src/config/database.js')).default;
    logger = (await import('../src/config/logger.js')).default;
  });

  beforeEach(() => { vi.clearAllMocks(); });

  describe('generateCertificate', () => {
    it('creates certificate and returns id and issuedAt', async () => {
      const issuedAt = new Date('2026-07-27');
      pool.query
        .mockResolvedValueOnce({ rows: [{ completed: true, name: 'Java Core' }] }) // completion check
        .mockResolvedValueOnce({ rows: [{ id: 42, issued_at: issuedAt }] });

      const result = await svc.generateCertificate({ userId: 1, trackId: 5, title: 'Java Pro', score: 85 });
      expect(result.id).toBe(42);
      expect(result.issuedAt).toBe(issuedAt);
      expect(result.title).toBe('Java Pro');
      expect(result.score).toBe(85);
    });

    it('upserts on conflict (ON CONFLICT DO UPDATE SET)', async () => {
      const issuedAt = new Date();
      pool.query
        .mockResolvedValueOnce({ rows: [{ completed: true, name: 'Java Core' }] })
        .mockResolvedValueOnce({ rows: [{ id: 42, issued_at: issuedAt }] });

      await svc.generateCertificate({ userId: 1, trackId: 5, title: 'Java Pro', score: 90 });
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        [1, 5, 'Java Pro', 90]
      );
    });

    it('defaults title to the track name', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ completed: true, name: 'Java Core' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, issued_at: new Date() }] });

      await svc.generateCertificate({ userId: 1, trackId: 5, title: '', score: 90 });
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        [1, 5, 'Java Core', 90]
      );
    });

    it('rejects when the track is not completed', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      await expect(svc.generateCertificate({ userId: 1, trackId: 5, title: 'T', score: 50 }))
        .rejects.toMatchObject({ status: 403 });
    });

    it('logs and re-throws on DB error', async () => {
      const dbError = new Error('insert failed');
      pool.query.mockRejectedValueOnce(dbError);
      await expect(svc.generateCertificate({ userId: 1, trackId: 5, title: 'T', score: 50 }))
        .rejects.toThrow('insert failed');
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ err: dbError }), 'generateCertificate failed');
    });
  });

  describe('getUserCertificates', () => {
    it('returns certificates array for user', async () => {
      const certs = [{ id: 1, title: 'Java Core', score: 85 }];
      pool.query.mockResolvedValueOnce({ rows: certs });
      const result = await svc.getUserCertificates(42);
      expect(result).toEqual(certs);
    });

    it('returns empty array when user has no certificates', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const result = await svc.getUserCertificates(42);
      expect(result).toEqual([]);
    });

    it('logs and re-throws on DB error', async () => {
      const dbError = new Error('select failed');
      pool.query.mockRejectedValueOnce(dbError);
      await expect(svc.getUserCertificates(42)).rejects.toThrow('select failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
