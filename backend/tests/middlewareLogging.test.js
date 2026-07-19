import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('uuid', () => ({ v4: vi.fn(() => 'test-uuid') }));
vi.mock('pino-http', () => ({ default: vi.fn(() => (req, res, next) => next()) }));
vi.mock('../src/config/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), child: vi.fn().mockReturnThis() },
}));

let validateBody;
let sanitizeText;
let sanitizeBody;
let requestLogger;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import('../src/middleware/logging.js');
  validateBody = mod.validateBody;
  sanitizeText = mod.sanitizeText;
  sanitizeBody = mod.sanitizeBody;
  requestLogger = mod.requestLogger;
});

function makeRes() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn(), headersSent: false };
}

describe('validateBody', () => {
  it('returns 400 with "X is required" when required field missing (undefined)', () => {
    const mw = validateBody({ name: { required: true } });
    const req = { body: {} };
    const res = makeRes();
    const next = vi.fn();
    mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Validation failed', details: ['name is required'] });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when required field is null', () => {
    const mw = validateBody({ name: { required: true } });
    const req = { body: { name: null } };
    const res = makeRes();
    const next = vi.fn();
    mw(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ error: 'Validation failed', details: ['name is required'] });
  });

  it('returns 400 when required field is empty string', () => {
    const mw = validateBody({ name: { required: true } });
    const req = { body: { name: '' } };
    const res = makeRes();
    const next = vi.fn();
    mw(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ error: 'Validation failed', details: ['name is required'] });
  });

  it('returns 400 on type mismatch', () => {
    const mw = validateBody({ age: { type: 'number' } });
    const req = { body: { age: 'notnum' } };
    const res = makeRes();
    const next = vi.fn();
    mw(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ error: 'Validation failed', details: ['age must be of type number'] });
  });

  it('returns 400 when maxLength exceeded', () => {
    const mw = validateBody({ bio: { maxLength: 5 } });
    const req = { body: { bio: 'toolongstring' } };
    const res = makeRes();
    const next = vi.fn();
    mw(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ error: 'Validation failed', details: ['bio exceeds max length 5'] });
  });

  it('returns 400 when enum does not contain value', () => {
    const mw = validateBody({ plan: { enum: ['a', 'b'] } });
    const req = { body: { plan: 'c' } };
    const res = makeRes();
    const next = vi.fn();
    mw(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ error: 'Validation failed', details: ['plan must be one of: a, b'] });
  });

  it('collects multiple errors', () => {
    const mw = validateBody({ a: { required: true }, b: { type: 'number' } });
    const req = { body: { b: 'x' } };
    const res = makeRes();
    const next = vi.fn();
    mw(req, res, next);
    const payload = res.json.mock.calls[0][0];
    expect(res.status).toHaveBeenCalledWith(400);
    expect(payload.details).toEqual(['a is required', 'b must be of type number']);
  });

  it('calls next when all valid', () => {
    const mw = validateBody({ name: { required: true, type: 'string' } });
    const req = { body: { name: 'ok' } };
    const res = makeRes();
    const next = vi.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('skips type/maxLength/enum checks when field absent', () => {
    const mw = validateBody({ name: { type: 'string', maxLength: 3, enum: ['x'] } });
    const req = { body: {} };
    const res = makeRes();
    const next = vi.fn();
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

// placeholder

describe('sanitizeText', () => {
  it('returns non-string as-is', () => {
    expect(sanitizeText(123)).toBe(123);
    expect(sanitizeText(null)).toBe(null);
  });

  it('removes null characters', () => {
    const nc = String.fromCharCode(0);
    expect(sanitizeText(`a${nc}b`)).toBe('ab');
  });

  it('caps long strings at 10000 chars', () => {
    const long = 'x'.repeat(10050);
    expect(sanitizeText(long).length).toBe(10000);
  });
});

describe('sanitizeBody', () => {
  it('calls next without change when body is not an object', () => {
    const req = { body: undefined };
    const res = makeRes();
    const next = vi.fn();
    sanitizeBody(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('sanitizes string values in body', () => {
    const req = { body: { a: 'a\r\nb', b: 5, c: '<script>x</script>' } };
    const res = makeRes();
    const next = vi.fn();
    sanitizeBody(req, res, next);
    expect(req.body.a).toBe('a\nb');
    expect(req.body.b).toBe(5);
    expect(req.body.c).toBe('x');
    expect(next).toHaveBeenCalled();
  });
});

describe('requestLogger', () => {
  it('is a function (pino-http middleware)', () => {
    expect(typeof requestLogger).toBe('function');
  });
});
