import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

// Real implementation (no mocks) — this is the security-critical validator.
const { validateTelegramWebAppData } = await import('../src/utils/telegram.js');

const BOT_TOKEN = 'TEST_BOT_TOKEN_123';

// Replicates Telegram's initData signing so we can produce valid fixtures.
function makeInitData(user, botToken) {
  const data = {
    query_id: 'AAtest',
    user: JSON.stringify(user),
    auth_date: '1700000000',
  };
  const sorted = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = sorted.map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  const params = new URLSearchParams({ ...data, hash });
  return params.toString();
}

describe('validateTelegramWebAppData', () => {
  const user = { id: 12345, first_name: 'Test', username: 'tester' };

  it('accepts a correctly signed initData', () => {
    const initData = makeInitData(user, BOT_TOKEN);
    const result = validateTelegramWebAppData(initData, BOT_TOKEN);
    expect(result).not.toBeNull();
    expect(result.telegram_id).toBe(12345);
    expect(result.username).toBe('tester');
  });

  it('rejects a tampered initData (wrong hash)', () => {
    const initData = makeInitData(user, BOT_TOKEN).replace('hash=', 'hash=x');
    const result = validateTelegramWebAppData(initData, BOT_TOKEN);
    expect(result).toBeNull();
  });

  it('rejects when the bot token differs', () => {
    const initData = makeInitData(user, BOT_TOKEN);
    const result = validateTelegramWebAppData(initData, 'DIFFERENT_TOKEN');
    expect(result).toBeNull();
  });

  it('rejects initData with no hash', () => {
    const params = new URLSearchParams({
      query_id: 'AAtest',
      user: JSON.stringify(user),
      auth_date: '1700000000',
    });
    const result = validateTelegramWebAppData(params.toString(), BOT_TOKEN);
    expect(result).toBeNull();
  });
});
