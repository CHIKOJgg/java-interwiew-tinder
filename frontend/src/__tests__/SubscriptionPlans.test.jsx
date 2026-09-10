import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SubscriptionPlans from '../components/SubscriptionPlans';
import apiClient from '../api/client';
import useStore from '../store/useStore';

// Mock dependencies
vi.mock('../api/client', () => ({
  default: {
    getPlans: vi.fn(),
    getBillingInfo: vi.fn(),
    getBillingMethods: vi.fn(),
    getBillingHistory: vi.fn(),
    sendStarsInvoice: vi.fn(),
    createTonInvoice: vi.fn(),
    checkTonPayment: vi.fn(),
    createUkassaPayment: vi.fn(),
    deleteSubscription: vi.fn(),
    getAdminUsers: vi.fn(),
    grantPlan: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => (typeof fallback === 'string' ? fallback : (fallback?.defaultValue || key)),
    i18n: { language: 'en' },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
}));

describe('SubscriptionPlans Component Deep Coverage', () => {
  const mockPlans = [
    {
      id: 'free',
      price_monthly: 0,
      requests_per_day: 15,
      available_languages: ['Java'],
      available_modes: ['swipe'],
      ai_generations_per_month: 0,
      resume_analysis_limit: 0,
      interview_eval_limit: 0,
    },
    {
      id: 'pro',
      price_monthly: 4.99,
      requests_per_day: '∞',
      available_languages: ['Java', 'Python', 'Go'],
      available_modes: ['swipe', 'test', 'blitz'],
      ai_generations_per_month: 100,
      resume_analysis_limit: 5,
      interview_eval_limit: 10,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({
      user: { telegram_id: 12345, plan: 'free' },
      login: vi.fn().mockResolvedValue({}),
      refreshSubscription: vi.fn().mockResolvedValue({}),
    });

    apiClient.getPlans.mockResolvedValue({ plans: mockPlans });
    apiClient.getBillingInfo.mockResolvedValue({
      plan: 'free',
      plan_id: 'free',
      expires_at: null,
      is_cancelled: false,
    });
    apiClient.getBillingMethods.mockResolvedValue({
      stars: true,
      ton: true,
      card: true,
    });
    apiClient.getBillingHistory.mockResolvedValue({
      history: [
        { id: 1, plan: 'pro', amount: '$4.99', date: '2026-08-01', provider: 'stars' },
      ],
    });
  });

  it('renders plans correctly and allows selecting free plan with toast message', async () => {
    apiClient.getBillingInfo.mockResolvedValueOnce({
      plan: 'pro',
      plan_id: 'pro',
      expires_at: '2026-10-01',
      is_cancelled: false,
    });

    render(<SubscriptionPlans onBack={vi.fn()} />);

    const freeEls = await screen.findAllByText('subscription.free');
    expect(freeEls.length).toBeGreaterThan(0);
    expect(screen.getByText('subscription.pro')).toBeInTheDocument();

    const selectFreeBtn = screen.getByText('Select Free');
    fireEvent.click(selectFreeBtn);

    expect(screen.getByText('You are already on a higher plan.')).toBeInTheDocument();
  });

  it('handles Telegram Stars purchase flow and polling', async () => {
    apiClient.sendStarsInvoice.mockResolvedValueOnce({ ok: true });

    render(<SubscriptionPlans onBack={vi.fn()} />);
    await screen.findByText('subscription.pro');

    const starsBtn = document.getElementById('stars-btn-pro');
    expect(starsBtn).toBeInTheDocument();
    fireEvent.click(starsBtn);

    await waitFor(() => {
      expect(apiClient.sendStarsInvoice).toHaveBeenCalledWith('pro', 'monthly');
    });

    expect(screen.getByText(/Waiting for payment confirmation from Telegram/i)).toBeInTheDocument();
  });

  it('handles TON cryptocurrency payment flow and modal interactions', async () => {
    const mockInvoice = {
      amountTon: 1.5,
      address: 'EQD_______________________TON_WALLET_TEST',
      comment: 'USER_12345_PRO',
    };
    apiClient.createTonInvoice.mockResolvedValueOnce(mockInvoice);
    apiClient.checkTonPayment.mockResolvedValueOnce({ fulfilled: true });

    render(<SubscriptionPlans onBack={vi.fn()} />);
    await screen.findByText('subscription.pro');

    const tonBtn = screen.getByText(/Pay via TON/i);
    fireEvent.click(tonBtn);

    await waitFor(() => {
      expect(apiClient.createTonInvoice).toHaveBeenCalledWith('pro', 'monthly');
    });

    expect(await screen.findByText('Payment via TON')).toBeInTheDocument();
    expect(screen.getByText('1.5 TON')).toBeInTheDocument();
    expect(screen.getByText(mockInvoice.address)).toBeInTheDocument();
    expect(screen.getByText(mockInvoice.comment)).toBeInTheDocument();

    // Click check payment
    const checkBtn = screen.getByText('I paid, check now');
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(apiClient.checkTonPayment).toHaveBeenCalled();
    });

    // Verification shows success celebration
    expect(await screen.findByText('Welcome to Pro!')).toBeInTheDocument();
  });

  it('handles Bank Card (YooKassa) redirect checkout', async () => {
    apiClient.createUkassaPayment.mockResolvedValueOnce({
      confirmationUrl: 'https://yookassa.ru/checkout/12345',
    });
    window.open = vi.fn();

    render(<SubscriptionPlans onBack={vi.fn()} />);
    await screen.findByText('subscription.pro');

    const cardBtn = screen.getByText(/Card \/ mo/i);
    fireEvent.click(cardBtn);

    await waitFor(() => {
      expect(apiClient.createUkassaPayment).toHaveBeenCalledWith('pro', 'monthly', expect.any(String));
      expect(window.open).toHaveBeenCalledWith('https://yookassa.ru/checkout/12345', '_blank');
    });
  });

  it('handles cancellation confirmation and API trigger', async () => {
    apiClient.getBillingInfo.mockResolvedValueOnce({
      plan: 'pro',
      plan_id: 'pro',
      expires_at: '2026-10-01',
      is_cancelled: false,
    });
    apiClient.deleteSubscription.mockResolvedValueOnce({ cancelled: true });

    render(<SubscriptionPlans onBack={vi.fn()} />);

    const cancelBtn = await screen.findByText('common.cancel');
    fireEvent.click(cancelBtn);

    // Confirmation prompt appears
    expect(await screen.findByText(/Are you sure\? Access remains until end of period\./i)).toBeInTheDocument();

    const confirmYesBtn = screen.getByText('Yes, cancel');
    fireEvent.click(confirmYesBtn);

    await waitFor(() => {
      expect(apiClient.deleteSubscription).toHaveBeenCalled();
    });
  });

  it('displays and handles Admin grant panel when user is admin', async () => {
    useStore.setState({
      user: { telegram_id: 1, plan: 'admin', is_admin: true },
    });
    apiClient.getBillingInfo.mockResolvedValue({
      plan: 'admin',
      plan_id: 'admin',
      is_admin: true,
    });
    apiClient.getAdminUsers.mockResolvedValue({
      users: [
        { telegram_id: '555', first_name: 'Developer', subscription_plan: 'free', questions_seen: 42 },
      ],
    });
    apiClient.grantPlan.mockResolvedValue({ success: true });

    render(<SubscriptionPlans onBack={vi.fn()} />);

    // In admin mode, the grant panel toggle is present
    expect(await screen.findByText(/Panel/i)).toBeInTheDocument();

    const toggleBtn = screen.getByText(/Panel/i);
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(apiClient.getAdminUsers).toHaveBeenCalled();
    });

    expect(screen.getByPlaceholderText('Telegram User ID')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('Telegram User ID');
    fireEvent.change(input, { target: { value: '555' } });

    const grantBtn = screen.getByRole('button', { name: 'Grant' });
    fireEvent.click(grantBtn);

    await waitFor(() => {
      expect(apiClient.grantPlan).toHaveBeenCalledWith('555', 'pro', 12);
    });
  });

  it('handles load error and retry button click', async () => {
    apiClient.getPlans.mockRejectedValueOnce(new Error('Network failure'));

    render(<SubscriptionPlans onBack={vi.fn()} />);

    expect(await screen.findByText(/Failed to load subscription data\./i)).toBeInTheDocument();

    apiClient.getPlans.mockResolvedValue({ plans: mockPlans });
    apiClient.getBillingInfo.mockResolvedValue({ plan: 'free', plan_id: 'free' });
    apiClient.getBillingMethods.mockResolvedValue({ stars: true, ton: true, card: true });

    const retryBtn = screen.getByText('common.retry');
    fireEvent.click(retryBtn);

    const freeEls = await screen.findAllByText('subscription.free');
    expect(freeEls.length).toBeGreaterThan(0);
  });
});
