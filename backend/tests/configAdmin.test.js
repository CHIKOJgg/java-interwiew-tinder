import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('configAdmin', () => {
  let original;

  beforeEach(() => {
    original = process.env.ADMIN_TELEGRAM_IDS;
    vi.resetModules();
  });

  afterEach(() => {
    process.env.ADMIN_TELEGRAM_IDS = original;
    vi.resetModules();
  });

  it('parses comma-separated ids (trims, ignores empties) and isAdmin works', async () => {
    process.env.ADMIN_TELEGRAM_IDS = '123, 456 ,';
    const mod = await import('../src/config/admin.js');
    expect(mod.isAdmin('123')).toBe(true);
    expect(mod.isAdmin(456)).toBe(true);
    expect(mod.isAdmin('999')).toBe(false);
  });

  it('returns false for all ids when env var is empty', async () => {
    process.env.ADMIN_TELEGRAM_IDS = '';
    const mod = await import('../src/config/admin.js');
    expect(mod.isAdmin('123')).toBe(false);
    expect(mod.isAdmin('')).toBe(false);
  });

  it('default export is a Set containing expected ids as strings', async () => {
    process.env.ADMIN_TELEGRAM_IDS = '123, 456';
    const mod = await import('../src/config/admin.js');
    expect(mod.default).toBeInstanceOf(Set);
    expect(mod.default.has('123')).toBe(true);
    expect(mod.default.has('456')).toBe(true);
  });
});
