import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
// We will dynamically import rateLimit and pool inside beforeAll


vi.mock('../src/config/database.js', () => ({
  default: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
  }
}));

vi.mock('../src/config/redis.js', () => ({
  default: {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
  }
}));

describe('Rate Limiter Middleware', () => {
  let rateLimit;
  let pool;
  let req;
  let res;
  let next;

  beforeAll(async () => {
    process.env.ADMIN_TELEGRAM_IDS = 'admin123';
    rateLimit = (await import('../src/middleware/rateLimiter.js')).rateLimit;
    pool = (await import('../src/config/database.js')).default;
  });

  beforeEach(() => {
    req = { body: {}, query: {}, userId: undefined };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('should allow admin bypass', async () => {
    req.userId = 'admin123';
    const middleware = rateLimit('requests');
    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('should block if rate limit exceeded', async () => {
    req.userId = 'user123';
    pool.query.mockResolvedValueOnce({
      rows: [{
        requests_per_day: 5,
        requests_today: 5,
        daily_reset_at: new Date().toISOString()
      }]
    });

    const middleware = rateLimit('requests');
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Rate limit exceeded'
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow if under rate limit and increment counter', async () => {
    req.userId = 'user123';
    pool.query.mockResolvedValueOnce({
      rows: [{
        requests_per_day: 5,
        requests_today: 3,
        daily_reset_at: new Date().toISOString()
      }]
    });
    pool.query.mockResolvedValueOnce({ rows: [] }); // Update user_rate_limits

    const middleware = rateLimit('requests');
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  it('incrementCounter must reject non-allowlisted fields (SQL injection guard)', async () => {
    const { incrementCounter } = await import('../src/middleware/rateLimiter.js');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Reset mocks but keep pool.query as a spy
    pool.query.mockReset();
    await incrementCounter('user123', 'requests_today; DROP TABLE users;--');
    // DB query must NOT be called with a malicious field
    expect(pool.query).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('incrementCounter allows allowlisted fields', async () => {
    const { incrementCounter } = await import('../src/middleware/rateLimiter.js');
    pool.query.mockReset();
    pool.query.mockResolvedValueOnce({ rows: [] });
    await incrementCounter('user123', 'requests_today');
    expect(pool.query).toHaveBeenCalledTimes(1);
    const sql = pool.query.mock.calls[0][0];
    expect(sql).toContain('requests_today');
  });
});
