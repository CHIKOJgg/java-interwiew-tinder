import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

vi.mock('../src/config/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() },
}));

vi.mock('jsonwebtoken', () => ({
  default: { verify: vi.fn(), sign: vi.fn() },
}));

vi.mock('@sentry/node', () => ({
  default: { setUser: vi.fn(), captureException: vi.fn() },
  setUser: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock('../src/config/admin.js', () => ({
  default: new Set(['42', '43']),
  isAdmin: vi.fn(),
}));

let authMiddleware;
let requireAdmin;
let jwt;
let Sentry;
let logger;
let ADMIN_IDS;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test_secret';
  const auth = await import('../src/middleware/auth.js');
  authMiddleware = auth.authMiddleware;
  requireAdmin = auth.requireAdmin;
  jwt = (await import('jsonwebtoken')).default;
  Sentry = await import('@sentry/node');
  logger = (await import('../src/config/logger.js')).default;
  ADMIN_IDS = (await import('../src/config/admin.js')).default;
});

let req;
let res;
let next;

beforeEach(() => {
  req = { headers: {}, body: {}, query: {} };
  res = { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn(), headersSent: false };
  next = vi.fn();
  vi.clearAllMocks();
});

describe('authMiddleware', () => {
  it('returns 401 when Authorization header is missing', () => {
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authorization token missing' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when header does not start with Bearer', () => {
    req.headers.authorization = 'Basic sometoken';
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authorization token missing' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when jwt.verify throws (invalid/expired token)', () => {
    req.headers.authorization = 'Bearer badtoken';
    jwt.verify.mockImplementation(() => { throw new Error('bad'); });
    authMiddleware(req, res, next);
    expect(logger.error).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('sets req.userId/req.userPlan, calls Sentry.setUser and next on success', () => {
    req.headers.authorization = 'Bearer goodtoken';
    jwt.verify.mockReturnValue({ userId: '7', plan: 'pro' });
    authMiddleware(req, res, next);
    expect(req.userId).toBe('7');
    expect(req.userPlan).toBe('pro');
    expect(Sentry.setUser).toHaveBeenCalledWith({ id: '7' });
    expect(next).toHaveBeenCalled();
  });
});

describe('requireAdmin', () => {
  it('returns 403 when req.userId is missing', () => {
    req.userId = undefined;
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden: Admin access required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when userId is not in ADMIN_IDS', () => {
    req.userId = '999';
    expect(ADMIN_IDS.has(String(req.userId))).toBe(false);
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden: Admin access required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when userId is in ADMIN_IDS', () => {
    req.userId = '42';
    expect(ADMIN_IDS.has(String(req.userId))).toBe(true);
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
