import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import WebLogin from '../components/WebLogin';
import ProfileScreen from '../components/ProfileScreen';
import ProgressScreen from '../components/ProgressScreen';
import useStore from '../store/useStore';
import apiClient from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    verifySyncCode: vi.fn(),
    createSyncCode: vi.fn(),
    sendEmailCode: vi.fn(),
    verifyEmailCode: vi.fn(),
    updateProfile: vi.fn(),
    getStats: vi.fn(),
    getPercentile: vi.fn().mockResolvedValue({ percentile: 85 }),
    getStatsHistory: vi.fn().mockResolvedValue({ history: [] }),
    getTopicStats: vi.fn().mockResolvedValue({ topics: [] }),
    getAnsweredQuestions: vi.fn().mockResolvedValue({
      questions: [{
        id: 42,
        question: 'What is ACID?',
        shortAnswer: 'Atomicity, Consistency, Isolation, Durability',
        status: 'known',
        language: 'Java',
        category: 'Databases',
        difficulty: 'Middle',
        intervalDays: 6,
        repetitionNumber: 2,
        answeredAt: new Date().toISOString(),
      }],
      pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
      summary: { totalAnswered: 1, knownCount: 1, unknownCount: 0, accuracy: 100 }
    }),
    setDailyGoal: vi.fn().mockResolvedValue({ success: true, dailyGoal: 30 }),
    request: vi.fn().mockResolvedValue({}),
  }
}));

describe('Retention, Goals, and PC Sync Frontend Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({
      user: { id: '123', telegram_id: '123', first_name: 'TestUser', plan: 'pro' },
      stats: { known: 15, unknown: 3, totalSeen: 18, totalQuestions: 100, streak: 5, longestStreak: 10 },
      todaySeen: 12,
      dailyGoal: 20,
      dailyDone: false,
      retention: { dueCount: 4, learningCount: 8, masteredCount: 15 },
      language: 'Java',
    });
  });

  describe('WebLogin PC Sync Tab', () => {
    it('allows switching to phone sync tab and entering 6-digit code', async () => {
      const onAuth = vi.fn();
      apiClient.verifySyncCode.mockResolvedValueOnce({
        user: { telegram_id: '123', first_name: 'TestUser', plan: 'pro' },
        token: 'sync-jwt-token-xyz',
      });

      render(<WebLogin onAuthenticated={onAuth} onBack={vi.fn()} />);

      // Switch to sync tab
      const syncTab = screen.getByRole('button', { name: /Код с телефона/i });
      fireEvent.click(syncTab);

      expect(screen.getByPlaceholderText('123456')).toBeInTheDocument();

      const input = screen.getByPlaceholderText('123456');
      fireEvent.change(input, { target: { value: '831492' } });

      const submitBtn = screen.getByRole('button', { name: /Войти/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(apiClient.verifySyncCode).toHaveBeenCalledWith({ code: '831492' });
        expect(onAuth).toHaveBeenCalledWith(
          expect.objectContaining({ telegram_id: '123' }),
          'sync-jwt-token-xyz',
          expect.anything()
        );
      });
    });
  });

  describe('ProfileScreen PC Sync Modal', () => {
    it('generates a 6-digit sync code when clicking PC Sync menu item', async () => {
      apiClient.createSyncCode.mockResolvedValueOnce({
        success: true,
        code: '554433',
        syncToken: 'mock-sync-token',
        expiresInSeconds: 900,
      });

      render(<ProfileScreen onBack={vi.fn()} onSettingsClick={vi.fn()} />);

      const syncMenuItem = screen.getByText(/Синхронизация с ПК/i);
      fireEvent.click(syncMenuItem);

      await waitFor(() => {
        expect(apiClient.createSyncCode).toHaveBeenCalled();
        expect(screen.getByText('554433')).toBeInTheDocument();
        expect(screen.getByText(/Код действует 15 минут/i)).toBeInTheDocument();
      });
    });
  });

  describe('ProgressScreen Retention & Daily Goals', () => {
    it('renders daily goal card and retention SM-2 metrics', async () => {
      apiClient.getStats.mockResolvedValueOnce({
        known: 20,
        unknown: 5,
        totalSeen: 25,
        totalQuestions: 150,
        streak: 7,
        todaySeen: 14,
        dailyGoal: 20,
        dailyDone: false,
        retention: { dueCount: 6, learningCount: 12, masteredCount: 18 }
      });

      render(<ProgressScreen onBack={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/Цель на день/i)).toBeInTheDocument();
        expect(screen.getByText(/14 \/ 20/i)).toBeInTheDocument();
        expect(screen.getByText(/Интервальное повторение \(SM-2\)/i)).toBeInTheDocument();
        expect(screen.getByText(/К повторению/i)).toBeInTheDocument();
        expect(screen.getByText(/Закреплено/i)).toBeInTheDocument();
      });

      // Test question item renders intervalDays badge
      await waitFor(() => {
        expect(screen.getByText(/What is ACID\?/i)).toBeInTheDocument();
        expect(screen.getByText(/(6 дн\.|6d)/i)).toBeInTheDocument();
        expect(screen.getByText(/№2/i)).toBeInTheDocument();
      });
    });

    it('updates daily goal when clicking goal buttons', async () => {
      apiClient.getStats.mockResolvedValueOnce({
        known: 20,
        unknown: 5,
        totalSeen: 25,
        totalQuestions: 150,
        streak: 7,
        todaySeen: 14,
        dailyGoal: 20,
      });

      render(<ProgressScreen onBack={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/14 \/ 20/i)).toBeInTheDocument();
      });

      const goal30Btn = screen.getByRole('button', { name: '30' });
      fireEvent.click(goal30Btn);

      expect(useStore.getState().dailyGoal).toBe(30);
      expect(apiClient.setDailyGoal).toHaveBeenCalledWith(30);
    });
  });
});
