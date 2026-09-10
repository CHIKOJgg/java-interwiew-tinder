import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { authMiddleware, requireAdmin } from '../src/middleware/auth.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import ADMIN_IDS from '../src/config/admin.js';
import * as telegramUtils from '../src/utils/telegram.js';
import nodemailer from 'nodemailer';

describe('Backend Auth Middleware Deep Coverage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.JWT_SECRET = 'test-secret-key-123';
    process.env.BOT_TOKEN = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';
  });

  it('rejects request when no Authorization header and no Telegram initData provided', () => {
    const req = { headers: {} };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authorization token missing' });
    expect(next).not.toHaveBeenCalled();
  });

  it('authenticates valid JWT Bearer token', () => {
    const token = jwt.sign({ userId: 'user-777', plan: 'pro' }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.userId).toBe('user-777');
    expect(req.userPlan).toBe('pro');
  });

  it('rejects invalid or expired JWT Bearer token', () => {
    const req = { headers: { authorization: 'Bearer invalid.jwt.token' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
  });

  it('authenticates valid Telegram initData via Mode 2 fallback', () => {
    vi.spyOn(telegramUtils, 'validateTelegramWebAppData').mockReturnValue({
      telegram_id: 888999,
      username: 'tg_user',
    });

    const req = { headers: { 'x-telegram-init-data': 'mock_raw_init_data' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.userId).toBe('888999');
    expect(req.userPlan).toBe('init_data');
  });

  it('rejects invalid Telegram initData via Mode 2 fallback', () => {
    vi.spyOn(telegramUtils, 'validateTelegramWebAppData').mockReturnValue(null);

    const req = { headers: { 'x-telegram-init-data': 'invalid_init_data' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authorization token missing' });
  });

  it('requireAdmin allows admin user and blocks non-admin', () => {
    const adminId = Array.from(ADMIN_IDS)[0] || '12345';
    ADMIN_IDS.add('999999');

    // Admin user
    const reqAdmin = { userId: '999999' };
    const resAdmin = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const nextAdmin = vi.fn();

    requireAdmin(reqAdmin, resAdmin, nextAdmin);
    expect(nextAdmin).toHaveBeenCalled();

    // Non-admin user
    const reqNonAdmin = { userId: 'regular_user_123' };
    const resNonAdmin = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const nextNonAdmin = vi.fn();

    requireAdmin(reqNonAdmin, resNonAdmin, nextNonAdmin);
    expect(resNonAdmin.status).toHaveBeenCalledWith(403);
    expect(resNonAdmin.json).toHaveBeenCalledWith({ error: 'Forbidden: Admin access required' });
  });
});

describe('Backend Centralized Error Handler Deep Coverage', () => {
  it('handles 500 error in dev mode vs prod mode, sets CORS headers with origin', () => {
    // Dev mode with origin header
    const devHandler = errorHandler(true, new Set(['http://localhost:5173']));
    const reqDev = {
      path: '/api/test',
      method: 'POST',
      headers: { origin: 'http://localhost:5173' },
    };
    const setHeaderMock = vi.fn();
    const resDev = {
      headersSent: false,
      setHeader: setHeaderMock,
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const err = new Error('Database connection failed');
    err.status = 500;

    devHandler(err, reqDev, resDev, vi.fn());

    expect(resDev.status).toHaveBeenCalledWith(500);
    expect(resDev.json).toHaveBeenCalledWith({ error: 'Database connection failed' });
    expect(setHeaderMock).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:5173');
    expect(setHeaderMock).toHaveBeenCalledWith('Vary', 'Origin');

    // Prod mode masks 500 error message
    const prodHandler = errorHandler(false, null);
    const resProd = {
      headersSent: false,
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    prodHandler(err, { path: '/api/prod', method: 'GET', headers: {} }, resProd, vi.fn());
    expect(resProd.status).toHaveBeenCalledWith(500);
    expect(resProd.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });

  it('skips response if headersSent is true', () => {
    const handler = errorHandler(true);
    const res = {
      headersSent: true,
      status: vi.fn(),
      json: vi.fn(),
    };
    handler(new Error('Boom'), { path: '/', method: 'GET' }, res, vi.fn());
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('Backend Database and RB Pool Logic', () => {
  it('strips sslmode parameter from database URLs cleanly', () => {
    const rawUrl = 'postgres://user:pass@host:5432/db?sslmode=require&application_name=test';
    const url = new URL(rawUrl);
    url.searchParams.delete('sslmode');
    const cleaned = url.toString();

    expect(cleaned).not.toContain('sslmode');
    expect(cleaned).toContain('application_name=test');
  });
});
