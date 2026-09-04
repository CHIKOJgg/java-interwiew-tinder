import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/config/database.js', () => ({
  default: { query: vi.fn().mockResolvedValue({ rows: [] }) },
}));

vi.mock('../src/config/redis.js', () => ({
  default: {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
  },
}));

const { default: pool } = await import('../src/config/database.js');
const { peekQuota, consumeQuota } = await import('../src/middleware/rateLimiter.js');

const limitsRow = {
  requests_per_day: 1000,
  ai_generations_per_month: 45,
  resume_analysis_limit: 1,
  interview_eval_limit: 3,
  sd_evaluation_limit: 1,
  available_languages: ['Java'],
  available_modes: ['swipe'],
  requests_today: 0,
  ai_generations_this_month: 0,
  resume_analyses_this_month: 0,
  interview_evals_this_month: 0,
  daily_reset_at: new Date().toISOString(),
  monthly_reset_at: new Date().toISOString(),
};

beforeEach(() => {
  pool.query.mockReset();
  pool.query.mockResolvedValue({ rows: [limitsRow] });
});

describe('peekQuota / consumeQuota (quota only on real generation)', () => {
  it('peek allows under quota without consuming', async () => {
    const r = await peekQuota('u1', 'ai_generation');
    expect(r.allowed).toBe(true);
    // only the limits SELECT, no INSERT
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('peek blocks exhausted quota', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ ...limitsRow, ai_generations_this_month: 45 }],
    });
    const r = await peekQuota('u1', 'ai_generation');
    expect(r.allowed).toBe(false);
    expect(r.used).toBe(45);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('consume increments when allowed', async () => {
    const r = await consumeQuota('u1', 'ai_generation');
    expect(r.allowed).toBe(true);
    // limits SELECT + increment INSERT
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  it('consume does not increment when exhausted', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ ...limitsRow, ai_generations_this_month: 45 }],
    });
    const r = await consumeQuota('u1', 'ai_generation');
    expect(r.allowed).toBe(false);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('unknown limit type allows through', async () => {
    const r = await consumeQuota('u1', 'nonexistent_type');
    expect(r.allowed).toBe(true);
    expect(pool.query).not.toHaveBeenCalled();
  });
});
