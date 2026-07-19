import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/config/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() },
}));

const { errorHandler } = await import('../src/middleware/errorHandler.js');

function makeRes() {
  return {
    statusCode: null,
    body: null,
    headersSent: false,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

describe('errorHandler', () => {
  it('returns 500 with generic message in production (no leak)', () => {
    const handler = errorHandler(false); // isDev = false
    const res = makeRes();
    const next = vi.fn();
    const err = new Error('secret DB password is "kolbaserbochhka"');
    handler(err, { path: '/x', method: 'GET' }, res, next);
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal server error');
    expect(res.body.error).not.toContain('kolbaserbochhka');
  });

  it('includes the error message in development', () => {
    const handler = errorHandler(true); // isDev = true
    const res = makeRes();
    const err = new Error('boom');
    handler(err, { path: '/x', method: 'GET' }, res, vi.fn());
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('boom');
  });

  it('respects a custom err.status (e.g. 400)', () => {
    const handler = errorHandler(false);
    const res = makeRes();
    const err = new Error('bad input');
    err.status = 400;
    handler(err, { path: '/x', method: 'POST' }, res, vi.fn());
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('bad input'); // 4xx are safe to expose
  });

  it('does not overwrite an already-sent response', () => {
    const handler = errorHandler(true);
    const res = makeRes();
    res.headersSent = true;
    const err = new Error('late error');
    handler(err, { path: '/x', method: 'GET' }, res, vi.fn());
    expect(res.statusCode).toBe(null);
  });

  it('respects a custom err.statusCode (e.g. 404)', () => {
    const handler = errorHandler(true);
    const res = makeRes();
    const err = new Error('not found');
    err.statusCode = 404;
    handler(err, { path: '/x', method: 'GET' }, res, vi.fn());
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('not found');
  });

  it('logs the error via logger.error', async () => {
    const handler = errorHandler(true);
    const res = makeRes();
    const err = new Error('log me');
    handler(err, { path: '/x', method: 'GET' }, res, vi.fn());
    const logger = (await import('../src/config/logger.js')).default;
    expect(logger.error).toHaveBeenCalled();
  });

  it('uses generic message when no error message in production', () => {
    const handler = errorHandler(false);
    const res = makeRes();
    const err = {}; // no message
    handler(err, { path: '/x', method: 'GET' }, res, vi.fn());
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });

  it('uses the message when no error message in development', () => {
    const handler = errorHandler(true);
    const res = makeRes();
    const err = {};
    handler(err, { path: '/x', method: 'GET' }, res, vi.fn());
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});
