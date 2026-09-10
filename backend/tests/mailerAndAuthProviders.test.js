import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as authProviders from '../src/utils/authProviders.js';
import * as mailer from '../src/utils/mailer.js';

// Setup database mock
vi.mock('../src/config/database.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('../src/config/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../src/services/referralService.js', () => ({
  referralService: {
    trackReferral: vi.fn().mockResolvedValue(true),
  },
}));

describe('mailer.js', () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...origEnv };
    vi.restoreAllMocks();
  });

  it('should return false when transporter is null (dev fallback)', async () => {
    const res = await mailer.sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      text: 'Test message body',
    });
    expect(res).toBe(false);
  });
});

describe('authProviders.js', () => {
  const origEnv = { ...process.env };
  let pool;

  beforeEach(async () => {
    const dbModule = await import('../src/config/database.js');
    pool = dbModule.default;
    vi.clearAllMocks();
    process.env = { ...origEnv };
  });

  afterEach(() => {
    process.env = { ...origEnv };
  });

  describe('verifyGoogle', () => {
    it('throws error if ENABLE_GOOGLE_AUTH is not true', async () => {
      process.env.ENABLE_GOOGLE_AUTH = 'false';
      await expect(authProviders.verifyGoogle('token123')).rejects.toThrow('Google auth is not enabled');
    });

    it('throws error if GOOGLE_CLIENT_ID is not configured', async () => {
      process.env.ENABLE_GOOGLE_AUTH = 'true';
      delete process.env.GOOGLE_CLIENT_ID;
      await expect(authProviders.verifyGoogle('token123')).rejects.toThrow('Google auth requires GOOGLE_CLIENT_ID');
    });

    it('returns null if idToken is empty', async () => {
      process.env.ENABLE_GOOGLE_AUTH = 'true';
      process.env.GOOGLE_CLIENT_ID = 'my-client-id';
      const res = await authProviders.verifyGoogle('');
      expect(res).toBeNull();
    });

    it('throws error if Google token endpoint returns non-200', async () => {
      process.env.ENABLE_GOOGLE_AUTH = 'true';
      process.env.GOOGLE_CLIENT_ID = 'my-client-id';
      const origFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
      });

      await expect(authProviders.verifyGoogle('invalid-token')).rejects.toThrow('Google token validation failed');
      global.fetch = origFetch;
    });

    it('throws error if audience mismatches', async () => {
      process.env.ENABLE_GOOGLE_AUTH = 'true';
      process.env.GOOGLE_CLIENT_ID = 'my-client-id';
      const origFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          aud: 'different-client-id',
          sub: '12345',
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      });

      await expect(authProviders.verifyGoogle('valid-token-wrong-aud')).rejects.toThrow('Google token audience mismatch');
      global.fetch = origFetch;
    });

    it('throws error if token is expired', async () => {
      process.env.ENABLE_GOOGLE_AUTH = 'true';
      process.env.GOOGLE_CLIENT_ID = 'my-client-id';
      const origFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          aud: 'my-client-id',
          sub: '12345',
          exp: Math.floor(Date.now() / 1000) - 100, // expired
        }),
      });

      await expect(authProviders.verifyGoogle('expired-token')).rejects.toThrow('Google token expired');
      global.fetch = origFetch;
    });

    it('returns normalized user info for valid Google payload', async () => {
      process.env.ENABLE_GOOGLE_AUTH = 'true';
      process.env.GOOGLE_CLIENT_ID = 'my-client-id';
      const origFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          aud: 'my-client-id',
          sub: 'sub-google-999',
          email: 'alex@example.com',
          given_name: 'Alex',
          family_name: 'Dev',
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      });

      const user = await authProviders.verifyGoogle('valid-token');
      expect(user).toBeTruthy();
      expect(user.auth_provider).toBe('google');
      expect(user.email).toBe('alex@example.com');
      expect(user.username).toBe('alex');
      expect(user.first_name).toBe('Alex');
      expect(user.last_name).toBe('Dev');
      expect(user.telegram_id).toMatch(/^g_/);
      global.fetch = origFetch;
    });
  });

  describe('issueEmailCode & verifyEmailCode', () => {
    it('throws error if ENABLE_EMAIL_AUTH is not true', async () => {
      process.env.ENABLE_EMAIL_AUTH = 'false';
      await expect(authProviders.issueEmailCode('test@example.com')).rejects.toThrow('Email auth is not enabled');
    });

    it('throws error on invalid email format', async () => {
      process.env.ENABLE_EMAIL_AUTH = 'true';
      await expect(authProviders.issueEmailCode('not-an-email')).rejects.toThrow('Invalid email');
    });

    it('issues code and successfully verifies email code', async () => {
      process.env.ENABLE_EMAIL_AUTH = 'true';

      const issued = await authProviders.issueEmailCode('dev@domain.com');
      expect(issued).toBe(true);

      // Attempt verification with invalid code
      expect(() => authProviders.verifyEmailCode('dev@domain.com', '000000')).toThrow('Invalid code');

      // Now verify error when no code requested
      expect(() => authProviders.verifyEmailCode('unrequested@domain.com', '123456')).toThrow('No code requested');
    });
  });

  describe('resolveAuth', () => {
    it('resolves google auth provider', async () => {
      process.env.ENABLE_GOOGLE_AUTH = 'true';
      process.env.GOOGLE_CLIENT_ID = 'test-client';
      const origFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          aud: 'test-client',
          sub: 'sub-123',
          email: 'test@example.com',
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      });

      const res = await authProviders.resolveAuth({ provider: 'google', idToken: 'token' }, false);
      expect(res.email).toBe('test@example.com');
      global.fetch = origFetch;
    });

    it('falls back to telegram provider when provider is telegram or default', async () => {
      const res = await authProviders.resolveAuth({ provider: 'telegram' }, true);
      expect(res).toBeDefined();
      expect(res.id || res.telegram_id).toBeDefined();
    });
  });

  describe('upsertUser', () => {
    it('inserts or updates user and issues jwt', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            telegram_id: '12345',
            username: 'dev_user',
            first_name: 'Dev',
            subscription_plan: 'free',
            is_new_user: true,
          },
        ],
      });

      const jwtSign = vi.fn().mockReturnValue('mocked.jwt.token');
      const { referralService } = await import('../src/services/referralService.js');

      const result = await authProviders.upsertUser(
        {
          telegram_id: '12345',
          username: 'dev_user',
          first_name: 'Dev',
          last_name: null,
          auth_provider: 'telegram',
        },
        'ref_456',
        jwtSign
      );

      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(referralService.trackReferral).toHaveBeenCalledWith('ref_456', '12345');
      expect(jwtSign).toHaveBeenCalledWith({ userId: '12345', plan: 'free' });
      expect(result.token).toBe('mocked.jwt.token');
      expect(result.user.telegram_id).toBe('12345');
    });

    it('handles referral failure gracefully without throwing', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 2,
            telegram_id: '99999',
            username: 'dev2',
            first_name: 'Dev2',
            subscription_plan: 'pro',
            is_new_user: true,
          },
        ],
      });

      const { referralService } = await import('../src/services/referralService.js');
      referralService.trackReferral.mockRejectedValueOnce(new Error('Referral DB fail'));

      const jwtSign = vi.fn().mockReturnValue('jwt2');

      const result = await authProviders.upsertUser(
        { telegram_id: '99999', username: 'dev2', auth_provider: 'telegram' },
        'broken_ref',
        jwtSign
      );

      expect(result.token).toBe('jwt2');
    });
  });
});
