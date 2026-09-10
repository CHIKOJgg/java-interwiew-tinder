import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mocks
const mockQuery = vi.fn();
const mockConnect = vi.fn();

vi.mock('../src/config/database.js', () => ({
  default: {
    query: (...args) => mockQuery(...args),
    connect: () => mockConnect(),
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
    processConversion: vi.fn().mockResolvedValue(true),
  },
}));

describe('tonService', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...origEnv };
    process.env.TON_WALLET_ADDRESS = 'EQD_TEST_WALLET_ADDRESS_123';
    process.env.TON_PRO_MONTHLY_AMOUNT = '2.0';
    process.env.TON_PRO_YEARLY_AMOUNT = '13.0';
    process.env.TON_PRO_MAX_MONTHLY_AMOUNT = '12.0';
    process.env.TON_PRO_MAX_YEARLY_AMOUNT = '110.0';
  });

  afterEach(() => {
    process.env = { ...origEnv };
  });

  describe('createTonInvoice', () => {
    it('throws if TON_WALLET_ADDRESS is not configured', async () => {
      delete process.env.TON_WALLET_ADDRESS;
      const { createTonInvoice } = await import('../src/services/billing/tonService.js');
      await expect(createTonInvoice('user123', 'pro')).rejects.toThrow('TON_WALLET_ADDRESS is not configured');
    });

    it('throws on unknown plan', async () => {
      const { createTonInvoice } = await import('../src/services/billing/tonService.js');
      await expect(createTonInvoice('user123', 'ultra_super_plan')).rejects.toThrow('Unknown plan');
    });

    it('creates monthly invoice for pro plan', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const { createTonInvoice } = await import('../src/services/billing/tonService.js');

      const inv = await createTonInvoice('1001', 'pro', 'monthly');
      expect(inv.address).toBe('EQD_TEST_WALLET_ADDRESS_123');
      expect(inv.amountTon).toBe(2.0);
      expect(inv.comment).toMatch(/^IT-1001-/);
      expect(mockQuery).toHaveBeenCalledTimes(2); // UPDATE old, INSERT new
    });

    it('creates yearly invoice for pro_max plan', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const { createTonInvoice } = await import('../src/services/billing/tonService.js');

      const inv = await createTonInvoice('1002', 'pro_max', 'yearly');
      expect(inv.amountTon).toBe(110.0);
      expect(inv.comment).toMatch(/^IT-1002-/);
    });
  });

  describe('getUserPendingInvoice', () => {
    it('returns the latest unfulfilled invoice or null', async () => {
      const fakeInvoice = { invoice_id: 'IT-1001-abc', user_id: '1001', amount_ton: 2.0 };
      mockQuery.mockResolvedValueOnce({ rows: [fakeInvoice] });

      const { getUserPendingInvoice } = await import('../src/services/billing/tonService.js');
      const res = await getUserPendingInvoice('1001');
      expect(res).toEqual(fakeInvoice);

      mockQuery.mockResolvedValueOnce({ rows: [] });
      const resNull = await getUserPendingInvoice('9999');
      expect(resNull).toBeNull();
    });
  });

  describe('activateTonSubscription', () => {
    it('throws if txHash is missing', async () => {
      const { activateTonSubscription } = await import('../src/services/billing/tonService.js');
      await expect(activateTonSubscription('1001', 'pro', 'monthly', '')).rejects.toThrow('Missing txHash');
    });

    it('detects replay attack when txHash was already used', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [{ id: 42 }] }), // found existing
        release: vi.fn(),
      };
      mockConnect.mockResolvedValueOnce(mockClient);

      const { activateTonSubscription } = await import('../src/services/billing/tonService.js');
      const res = await activateTonSubscription('1001', 'pro', 'monthly', 'already_used_tx_hash', 'IT-1001-xyz');

      expect(res).toEqual({ success: true, duplicate: true });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('activates new yearly subscription successfully', async () => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [] }) // duplicate check: none
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [] }) // activeSub: none
          .mockResolvedValueOnce({ rows: [] }) // INSERT user_subscriptions
          .mockResolvedValueOnce({ rows: [] }) // UPDATE users
          .mockResolvedValueOnce({ rows: [] }) // UPDATE pending_ton_invoices
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: vi.fn(),
      };
      mockConnect.mockResolvedValueOnce(mockClient);

      const { activateTonSubscription } = await import('../src/services/billing/tonService.js');
      const res = await activateTonSubscription('1001', 'pro', 'yearly', 'fresh_tx_123', 'IT-1001-xyz');

      expect(res).toEqual({ success: true });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('handles unique_violation error code 23505 as duplicate', async () => {
      const dbErr = new Error('duplicate key');
      dbErr.code = '23505';

      const mockClient = {
        query: vi.fn()
          .mockResolvedValue({ rows: [] })
          .mockResolvedValueOnce({ rows: [] }) // duplicate check: none
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockRejectedValueOnce(dbErr), // fails with 23505 on insert
        release: vi.fn(),
      };
      mockConnect.mockResolvedValueOnce(mockClient);

      const { activateTonSubscription } = await import('../src/services/billing/tonService.js');
      const res = await activateTonSubscription('1001', 'pro', 'monthly', 'racing_tx_hash', 'IT-1001-xyz');

      expect(res).toEqual({ success: true, duplicate: true });
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('pollPendingInvoices', () => {
    it('returns early if TON_WALLET_ADDRESS is unset', async () => {
      delete process.env.TON_WALLET_ADDRESS;
      const { pollPendingInvoices } = await import('../src/services/billing/tonService.js');
      await pollPendingInvoices();
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('polls and fulfills matching invoice', async () => {
      const invoice = {
        invoice_id: 'IT-555-abc123',
        user_id: '555',
        plan_id: 'pro',
        interval: 'monthly',
        amount_ton: 2.0,
      };

      mockQuery.mockResolvedValueOnce({ rows: [invoice] });

      const origFetch = global.fetch;
      global.fetch = vi.fn()
        // getAddressInformation response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ok: true, result: { last_transaction_lt: '100' } }),
        })
        // getTransactions response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            result: [
              {
                transaction_id: { hash: 'hash_tx_match' },
                in_msg: {
                  message: 'IT-555-abc123',
                  value: '2000000000', // 2.0 TON in nanotons
                },
              },
            ],
          }),
        });

      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [] }) // replay check
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [] }) // activeSub
          .mockResolvedValueOnce({ rows: [] }) // INSERT
          .mockResolvedValueOnce({ rows: [] }) // UPDATE users
          .mockResolvedValueOnce({ rows: [] }) // UPDATE pending_ton_invoices
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: vi.fn(),
      };
      mockConnect.mockResolvedValueOnce(mockClient);

      const { pollPendingInvoices } = await import('../src/services/billing/tonService.js');
      await pollPendingInvoices();

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(mockClient.query).toHaveBeenCalled();
      global.fetch = origFetch;
    });
  });
});
