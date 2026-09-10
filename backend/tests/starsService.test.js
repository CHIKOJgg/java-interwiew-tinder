import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import pool from '../src/config/database.js';
import {
  getStarsAmount,
  sendStarsInvoice,
  answerPreCheckout,
  sendTelegramMessage,
  activateStarsSubscription,
} from '../src/services/billing/starsService.js';

describe('starsService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.BOT_TOKEN = 'mock-bot-token-123';
    process.env.STARS_PRO_MONTHLY_AMOUNT = '450';
    process.env.STARS_PRO_YEARLY_AMOUNT = '3000';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('getStarsAmount', () => {
    it('returns DB configured amount if found', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce({
        rows: [{ amount: 500 }],
      });

      const amount = await getStarsAmount('pro', 'monthly');
      expect(amount).toBe(500);
    });

    it('falls back to environment variable if DB returns empty', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce({
        rows: [],
      });

      const monthly = await getStarsAmount('pro', 'monthly');
      expect(monthly).toBe(450);

      vi.spyOn(pool, 'query').mockResolvedValueOnce({
        rows: [],
      });
      const yearly = await getStarsAmount('pro', 'yearly');
      expect(yearly).toBe(3000);
    });

    it('falls back to environment variable if DB query throws error', async () => {
      vi.spyOn(pool, 'query').mockRejectedValueOnce(new Error('DB failure'));

      const amount = await getStarsAmount('pro', 'monthly');
      expect(amount).toBe(450);
    });
  });

  describe('sendStarsInvoice', () => {
    it('sends invoice via Telegram Bot API with correct payload', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [{ amount: 450 }] });
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 999 } }),
      });

      const res = await sendStarsInvoice(123456, 'pro', 'monthly');
      expect(res.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.telegram.org/botmock-bot-token-123/sendInvoice',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('throws error if Bot API returns failure', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [{ amount: 450 }] });
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: false, description: 'Chat not found' }),
      });

      await expect(sendStarsInvoice(123456, 'pro', 'monthly')).rejects.toThrow(
        'sendInvoice failed: Chat not found'
      );
    });

    it('throws error if BOT_TOKEN is missing', async () => {
      delete process.env.BOT_TOKEN;
      await expect(sendStarsInvoice(123456, 'pro', 'monthly')).rejects.toThrow(
        'BOT_TOKEN is not configured'
      );
    });
  });

  describe('answerPreCheckout', () => {
    it('answers pre_checkout_query successfully with ok: true', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      await answerPreCheckout('pcq_123', true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.telegram.org/botmock-bot-token-123/answerPreCheckoutQuery',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ pre_checkout_query_id: 'pcq_123', ok: true }),
        })
      );
    });

    it('sends error message when ok is false', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      await answerPreCheckout('pcq_123', false, 'Payment not accepted');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.telegram.org/botmock-bot-token-123/answerPreCheckoutQuery',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            pre_checkout_query_id: 'pcq_123',
            ok: false,
            error_message: 'Payment not accepted',
          }),
        })
      );
    });
  });

  describe('sendTelegramMessage', () => {
    it('sends text message via Telegram API', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      await sendTelegramMessage(123456, 'Hello world');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.telegram.org/botmock-bot-token-123/sendMessage',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ chat_id: 123456, text: 'Hello world' }),
        })
      );
    });
  });

  describe('activateStarsSubscription', () => {
    it('throws error if chargeId is missing', async () => {
      await expect(activateStarsSubscription(123, 'pro', 'monthly', null)).rejects.toThrow(
        'Missing chargeId'
      );
    });

    it('detects replay and ignores already processed chargeId', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [{ id: 1 }] }),
        release: vi.fn(),
      };
      vi.spyOn(pool, 'connect').mockResolvedValueOnce(mockClient);

      const res = await activateStarsSubscription(123, 'pro', 'monthly', 'ch_duplicate');
      expect(res.success).toBe(true);
      expect(res.replayed).toBe(true);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('activates subscription, commits transaction, and updates user', async () => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [] }) // replay check
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [] }) // activeSub
          .mockResolvedValueOnce({}) // INSERT user_subscriptions
          .mockResolvedValueOnce({}) // UPDATE users
          .mockResolvedValueOnce({}), // COMMIT
        release: vi.fn(),
      };
      vi.spyOn(pool, 'connect').mockResolvedValueOnce(mockClient);

      const res = await activateStarsSubscription(123, 'pro', 'monthly', 'ch_fresh_123');
      expect(res.success).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('rolls back on error and rethrows', async () => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [] }) // replay check
          .mockResolvedValueOnce({}) // BEGIN
          .mockRejectedValueOnce(new Error('Insert error')) // query fails
          .mockResolvedValueOnce({}), // ROLLBACK
        release: vi.fn(),
      };
      vi.spyOn(pool, 'connect').mockResolvedValueOnce(mockClient);

      await expect(
        activateStarsSubscription(123, 'pro', 'monthly', 'ch_error_123')
      ).rejects.toThrow('Insert error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
