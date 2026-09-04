import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock apiClient
vi.mock('../api/client', () => ({
  default: {
    getStats: vi.fn(),
    getPercentile: vi.fn(),
    getStatsHistory: vi.fn(),
    getTopicStats: vi.fn(),
    getAnsweredQuestions: vi.fn(),
    getExplanation: vi.fn(),
  },
}));

// Mock useStore
vi.mock('../store/useStore', () => ({
  default: () => ({
    stats: { known: 10, unknown: 2, totalSeen: 12, totalQuestions: 100, streak: 3, longestStreak: 7 },
    language: 'Java',
    canAccessMode: vi.fn().mockReturnValue(true),
    savedIds: {},
  }),
  readinessFromStats: vi.fn().mockReturnValue({ readiness: 78, tier: 'confident' }),
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback || key,
    i18n: { language: 'en' },
  }),
}));

import apiClient from '../api/client';
import ProgressScreen from '../components/ProgressScreen';

describe('ProgressScreen User Statistics & Answer History', () => {
  const mockJavaStats = {
    known: 10,
    unknown: 2,
    totalSeen: 12,
    accuracy: 83,
    totalQuestions: 100,
    streak: 3,
    longestStreak: 7,
    byLanguage: {
      Java: { known: 10, unknown: 2, totalSeen: 12, accuracy: 83 },
      Python: { known: 20, unknown: 5, totalSeen: 25, accuracy: 80 },
    },
  };

  const mockPythonStats = {
    known: 20,
    unknown: 5,
    totalSeen: 25,
    accuracy: 80,
    totalQuestions: 80,
    streak: 3,
    longestStreak: 7,
    byLanguage: {
      Java: { known: 10, unknown: 2, totalSeen: 12, accuracy: 83 },
      Python: { known: 20, unknown: 5, totalSeen: 25, accuracy: 80 },
    },
  };

  const mockTopics = [
    { name: 'Concurrency', known: 8, unknown: 1, answered: 9, total: 15, accuracy: 89, coverage: 53 },
    { name: 'Collections', known: 2, unknown: 4, answered: 6, total: 20, accuracy: 33, coverage: 10 },
  ];

  const mockAnswersResponse = {
    questions: [
      {
        id: 1,
        question: 'What is a Java Virtual Thread?',
        shortAnswer: 'A lightweight thread managed by the JVM rather than OS.',
        category: 'Concurrency',
        difficulty: 'Senior',
        language: 'Java',
        framework: null,
        topic: 'Virtual Threads',
        status: 'known',
        answeredAt: new Date().toISOString(),
      },
      {
        id: 2,
        question: 'Explain Python GIL impact on multithreading',
        shortAnswer: 'GIL allows only one native thread to execute Python bytecode at once.',
        category: 'Concurrency',
        difficulty: 'Middle',
        language: 'Python',
        framework: null,
        topic: 'GIL',
        status: 'unknown',
        answeredAt: new Date().toISOString(),
      },
    ],
    pagination: { total: 2, limit: 20, offset: 0, hasMore: false },
    summary: { totalAnswered: 2, knownCount: 1, unknownCount: 1, accuracy: 50 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.getStats.mockResolvedValue(mockJavaStats);
    apiClient.getPercentile.mockResolvedValue({ percentile: 85 });
    apiClient.getStatsHistory.mockResolvedValue({ history: [] });
    apiClient.getTopicStats.mockResolvedValue({ topics: mockTopics });
    apiClient.getAnsweredQuestions.mockResolvedValue(mockAnswersResponse);
  });

  it('renders language switcher tabs for Java, Python, and All Stacks', async () => {
    render(<ProgressScreen onBack={vi.fn()} onReview={vi.fn()} onUpgrade={vi.fn()} onSavedClick={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Java/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Python/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All Stacks/i })).toBeInTheDocument();
  });

  it('displays stack comparison between Java and Python with accuracy rates', async () => {
    render(<ProgressScreen onBack={vi.fn()} onReview={vi.fn()} onUpgrade={vi.fn()} onSavedClick={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByText(/83%/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/80%/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('switches to Python when Python tab is clicked', async () => {
    apiClient.getStats.mockResolvedValueOnce(mockPythonStats);
    render(<ProgressScreen onBack={vi.fn()} onReview={vi.fn()} onUpgrade={vi.fn()} onSavedClick={vi.fn()} />);

    const pythonTab = screen.getByRole('button', { name: /Python/i });
    fireEvent.click(pythonTab);

    await waitFor(() => {
      expect(apiClient.getStats).toHaveBeenCalledWith('Python');
      expect(apiClient.getTopicStats).toHaveBeenCalledWith('Python');
      expect(apiClient.getAnsweredQuestions).toHaveBeenCalledWith(expect.objectContaining({
        language: 'Python',
      }));
    });
  });

  it('displays topics with strong (≥75%) and weak (<50%) tags', async () => {
    render(<ProgressScreen onBack={vi.fn()} onReview={vi.fn()} onUpgrade={vi.fn()} onSavedClick={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByText('Concurrency').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Collections')).toBeInTheDocument();
      // Concurrency is 89% (strong)
      expect(screen.getByText(/Strong topic/i)).toBeInTheDocument();
      // Collections is 33% (weak)
      expect(screen.getByText(/Needs practice/i)).toBeInTheDocument();
    });
  });

  it('renders answered questions history with status pills and allows expanding short answer', async () => {
    render(<ProgressScreen onBack={vi.fn()} onReview={vi.fn()} onUpgrade={vi.fn()} onSavedClick={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('What is a Java Virtual Thread?')).toBeInTheDocument();
      expect(screen.getByText('Explain Python GIL impact on multithreading')).toBeInTheDocument();
    });

    // Expand the first question card
    const firstQuestion = screen.getByText('What is a Java Virtual Thread?');
    fireEvent.click(firstQuestion);

    await waitFor(() => {
      expect(screen.getByText('A lightweight thread managed by the JVM rather than OS.')).toBeInTheDocument();
      expect(screen.getByText(/Explain with AI/i)).toBeInTheDocument();
    });
  });

  it('filters answer history by status (Known vs Mistakes)', async () => {
    render(<ProgressScreen onBack={vi.fn()} onReview={vi.fn()} onUpgrade={vi.fn()} onSavedClick={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Mistakes/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Mistakes/i }));

    await waitFor(() => {
      expect(apiClient.getAnsweredQuestions).toHaveBeenCalledWith(expect.objectContaining({
        status: 'unknown',
      }));
    });
  });
});
