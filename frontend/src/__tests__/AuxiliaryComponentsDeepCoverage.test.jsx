import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminPanel from '../components/AdminPanel';
import ReportSheet from '../components/ReportSheet';
import ProNudge from '../components/ProNudge';
import MissedPanel from '../components/MissedPanel';
import PwaInstallPrompt from '../components/PwaInstallPrompt';
import DebugOverlay from '../components/DebugOverlay';
import DebugScreen from '../components/DebugScreen';
import apiClient from '../api/client';
import useStore from '../store/useStore';
import logger from '../utils/logger';

vi.mock('../api/client', () => ({
  default: {
    getAdminMetrics: vi.fn(),
    getAdminReports: vi.fn(),
    approveReport: vi.fn(),
    updateQuestion: vi.fn(),
    deleteQuestion: vi.fn(),
    getQuestionsFeed: vi.fn(),
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

describe('Auxiliary & Admin Components Deep Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    apiClient.getAdminReports.mockResolvedValue({ reports: [] });
    apiClient.getAdminMetrics.mockResolvedValue({
      overview: { monthlyRevenue: 0, activeSubscribers: 0 },
      activity: {},
      topFailedQuestions: [],
      jobs: {},
    });

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(),
        readText: vi.fn().mockResolvedValue(''),
      },
      writable: true,
      configurable: true,
    });
  });

  describe('AdminPanel Component', () => {
    it('fetches metrics and displays overview, reports, top failed and queue status', async () => {
      apiClient.getAdminMetrics.mockResolvedValue({
        overview: { monthlyRevenue: 1250, activeSubscribers: 250 },
        activity: { dau: 120, wau: 600, mau: 2400, aiCallsThisMonth: 15400 },
        topFailedQuestions: [
          { question_text: 'What is volatile?', fail_count: 85 },
        ],
        jobs: { pending: 2, completed: 150, failed: 1 },
      });
      apiClient.getAdminReports.mockResolvedValue({
        reports: [
          {
            id: 42,
            question_text: 'Explain ThreadLocal memory leaks',
            short_answer: 'Remove after use',
            report_count: 3,
            reports: [{ reason: 'Unclear', comment: 'Needs code example' }],
          },
        ],
      });
      apiClient.approveReport.mockResolvedValue({ success: true });
      apiClient.deleteQuestion.mockResolvedValue({ success: true });

      const onBack = vi.fn();
      render(<AdminPanel onBack={onBack} />);

      // Metrics displayed
      expect(await screen.findByText('$1250')).toBeInTheDocument();
      expect(screen.getByText('250')).toBeInTheDocument();
      expect(screen.getByText('15400')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
      expect(screen.getByText('Explain ThreadLocal memory leaks')).toBeInTheDocument();
      expect(screen.getByText('What is volatile?')).toBeInTheDocument();

      // Test report approve button
      const approveBtn = screen.getByText('admin.approve');
      fireEvent.click(approveBtn);
      await waitFor(() => {
        expect(apiClient.approveReport).toHaveBeenCalledWith(42);
      });

      // Wait for re-render after metrics refresh
      expect(await screen.findByText('Explain ThreadLocal memory leaks')).toBeInTheDocument();

      // Test report hide button
      const hideBtn = await screen.findByText('admin.hide');
      fireEvent.click(hideBtn);
      await waitFor(() => {
        expect(apiClient.deleteQuestion).toHaveBeenCalledWith(42);
      });

      // Test back button
      const backBtn = screen.getByText(/admin\.back/i);
      fireEvent.click(backBtn);
      expect(onBack).toHaveBeenCalled();
    });

    it('renders error state and handles retry', async () => {
      apiClient.getAdminMetrics.mockRejectedValueOnce(new Error('Admin unauthorized'));

      render(<AdminPanel onBack={vi.fn()} />);

      expect(await screen.findByText('Admin unauthorized')).toBeInTheDocument();

      apiClient.getAdminMetrics.mockResolvedValue({
        overview: { monthlyRevenue: 0, activeSubscribers: 0 },
        activity: {},
        topFailedQuestions: [],
        jobs: {},
      });
      apiClient.getAdminReports.mockResolvedValue({ reports: [] });

      const retryBtn = screen.getByText('admin.retry');
      fireEvent.click(retryBtn);

      expect(await screen.findByText('admin.title')).toBeInTheDocument();
    });
  });

  describe('ReportSheet Component', () => {
    it('submits a question report and displays success feedback', async () => {
      const mockReportQuestion = vi.fn().mockResolvedValue();
      useStore.setState({ reportQuestion: mockReportQuestion });
      const onClose = vi.fn();

      render(<ReportSheet questionId={777} onClose={onClose} />);

      expect(screen.getByText('Report Question')).toBeInTheDocument();

      // Select another reason
      const outdatedRadio = screen.getByLabelText('Outdated');
      fireEvent.click(outdatedRadio);

      // Fill in details
      const commentInput = screen.getByPlaceholderText('Provide more details...');
      fireEvent.change(commentInput, { target: { value: 'This was deprecated in Java 21' } });

      // Submit
      const submitBtn = screen.getByText('Submit Report');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockReportQuestion).toHaveBeenCalledWith(777, 'Outdated', 'This was deprecated in Java 21');
      });

      expect(await screen.findByText(/Report submitted successfully/i)).toBeInTheDocument();
    });
  });

  describe('ProNudge Component', () => {
    it('renders nudge for free users and allows dismissing', async () => {
      vi.useFakeTimers();
      const mockDismissNudge = vi.fn();
      useStore.setState({
        isPro: () => false,
        dismissedNudges: [],
        dismissNudge: mockDismissNudge,
      });

      const onOpenSub = vi.fn();
      render(<ProNudge onOpenSubscription={onOpenSub} />);

      // Advance timers in act
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      const proBtn = screen.getByText('Pro');
      expect(proBtn).toBeInTheDocument();

      fireEvent.click(proBtn);
      expect(onOpenSub).toHaveBeenCalled();

      const dismissBtn = screen.getByLabelText('dismiss');
      fireEvent.click(dismissBtn);

      expect(mockDismissNudge).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('does not render nudge when user is Pro', () => {
      useStore.setState({
        isPro: () => true,
        dismissedNudges: [],
      });

      const { container } = render(<ProNudge onOpenSubscription={vi.fn()} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('MissedPanel Component', () => {
    it('renders missed question details and links to AI breakdown', () => {
      const mockCloseMissed = vi.fn();
      const mockLoadExplanation = vi.fn();

      useStore.setState({
        showMissed: true,
        missed: {
          id: 303,
          question: 'What is a memory barrier (fence)?',
          shortAnswer: 'A CPU instruction that enforces order constraints on memory operations.',
        },
        closeMissed: mockCloseMissed,
        loadExplanation: mockLoadExplanation,
        isPro: () => false,
      });

      render(<MissedPanel />);

      expect(screen.getByText('What is a memory barrier (fence)?')).toBeInTheDocument();
      expect(screen.getByText(/A CPU instruction that enforces order constraints/i)).toBeInTheDocument();

      // Click AI explanation
      const explainBtn = screen.getByText('missed.explain');
      fireEvent.click(explainBtn);

      expect(mockCloseMissed).toHaveBeenCalled();
      expect(mockLoadExplanation).toHaveBeenCalledWith(303);

      // Click next
      const nextBtn = screen.getByText(/missed\.next/i);
      fireEvent.click(nextBtn);
      expect(mockCloseMissed).toHaveBeenCalledTimes(2);
    });
  });

  describe('PwaInstallPrompt Component', () => {
    it('captures beforeinstallprompt and handles installation trigger', async () => {
      render(<PwaInstallPrompt show={true} />);

      const promptMock = vi.fn();
      const userChoicePromise = Promise.resolve({ outcome: 'accepted' });
      const event = new Event('beforeinstallprompt');
      event.prompt = promptMock;
      event.userChoice = userChoicePromise;

      act(() => {
        window.dispatchEvent(event);
      });

      expect(await screen.findByText('Install Interview Tinder')).toBeInTheDocument();

      const installBtn = screen.getByText('Install');
      fireEvent.click(installBtn);

      await waitFor(() => {
        expect(promptMock).toHaveBeenCalled();
      });
    });
  });

  describe('DebugOverlay & DebugScreen Components', () => {
    it('displays DebugOverlay with log levels and clear functionality', () => {
      logger.info('Test Info Log');
      logger.warn('Test Warn Log');

      const onClose = vi.fn();
      render(<DebugOverlay visible={true} onClose={onClose} />);

      expect(screen.getByText('Debug log')).toBeInTheDocument();
      expect(screen.getByText('Test Info Log')).toBeInTheDocument();
      expect(screen.getByText('Test Warn Log')).toBeInTheDocument();

      // Test level filter
      const warnFilter = screen.getByText('warn');
      fireEvent.click(warnFilter);

      // Test clear
      const clearBtn = screen.getByTitle('Clear');
      fireEvent.click(clearBtn);

      // Close
      const closeBtn = screen.getByTitle('Close');
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    });

    it('renders DebugScreen, runs test feed, and copies debug dump', async () => {
      apiClient.getQuestionsFeed.mockResolvedValue({
        questions: [{ id: 1 }, { id: 2 }],
        meta: { cursor: 2 },
      });

      render(<DebugScreen onClose={vi.fn()} />);

      // Switch to Store tab by clicking the 'store' filter tab
      const storeTab = screen.getByText('store');
      expect(storeTab).toBeInTheDocument();
      fireEvent.click(storeTab);

      // In store tab, click the Run Test button
      const runTestBtn = await screen.findByText(/Test \/api\/questions\/feed/i);
      fireEvent.click(runTestBtn);

      await waitFor(() => {
        expect(apiClient.getQuestionsFeed).toHaveBeenCalled();
      });

      // Copy dump
      const copyBtn = screen.getByTitle('Copy all');
      fireEvent.click(copyBtn);
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });
});
