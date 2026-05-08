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
    req = { body: {}, query: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('should allow admin bypass', async () => {
    req.body.userId = 'admin123';
    const middleware = rateLimit('requests');
    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('should block if rate limit exceeded', async () => {
    req.body.userId = 'user123';
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
    req.body.userId = 'user123';
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
});
