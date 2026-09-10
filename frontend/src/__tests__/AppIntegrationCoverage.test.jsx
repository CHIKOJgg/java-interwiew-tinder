import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import useStore from '../store/useStore';

// Setup browser globals
beforeEach(() => {
  localStorage.clear();

  global.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  window.speechSynthesis = {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
  };

  global.fetch = vi.fn().mockImplementation((url) => {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => {
        if (url.includes('/demo/questions')) {
          return { questions: [{ language: 'Java', category: 'Core', question: 'Test Q?', shortAnswer: 'Ans' }] };
        }
        return { success: true, tracks: [], companies: ['Google'] };
      }
    });
  });

  // Mock Telegram WebApp SDK
  window.Telegram = {
    WebApp: {
      initData: 'query_id=123&user=%7B%22id%22%3A101%2C%22first_name%22%3A%22Sam%22%7D',
      initDataUnsafe: { user: { id: 101, first_name: 'Sam' } },
      ready: vi.fn(),
      expand: vi.fn(),
      enableClosingConfirmation: vi.fn(),
      setHeaderColor: vi.fn(),
      setBackgroundColor: vi.fn(),
      HapticFeedback: {
        impactOccurred: vi.fn(),
        notificationOccurred: vi.fn(),
        selectionChanged: vi.fn(),
      },
      BackButton: {
        show: vi.fn(),
        hide: vi.fn(),
        onClick: vi.fn(),
        offClick: vi.fn(),
      },
    },
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

// Mock API Client
vi.mock('../api/client', () => ({
  default: {
    setUserId: vi.fn(),
    setLanguage: vi.fn(),
    setInitData: vi.fn(),
    setToken: vi.fn(),
    clearAuth: vi.fn(),
    getToken: vi.fn().mockReturnValue('jwt-101'),
    login: vi.fn().mockResolvedValue({
      user: { id: 101, first_name: 'Sam', plan: 'pro_max' },
      token: 'jwt-101',
    }),
    loginWithToken: vi.fn().mockResolvedValue({
      user: { id: 101, first_name: 'Sam', plan: 'pro_max' },
      token: 'jwt-101',
    }),
    getQuestionsFeed: vi.fn().mockResolvedValue({
      questions: [
        { id: 1, question: 'What is volatile in Java?', category: 'Concurrency', level: 'middle', language: 'Java', shortAnswer: 'Ensures visibility across threads.' },
        { id: 2, question: 'Explain GIL in Python.', category: 'Core', level: 'middle', language: 'Python', shortAnswer: 'Global Interpreter Lock.' }
      ],
      total: 2,
    }),
    getTracks: vi.fn().mockResolvedValue({
      tracks: [
        { id: 'spring-master', title: 'Spring Framework Master', description: 'Deep dive into Spring ecosystem', steps: [] }
      ]
    }),
    getCompanies: vi.fn().mockResolvedValue({ companies: ['Google', 'Amazon'] }),
    getCurrentChallenge: vi.fn().mockResolvedValue({ challenge: null, leaderboard: [] }),
    getUserStats: vi.fn().mockResolvedValue({ totalQuestions: 10, known: 5, streak: 3 }),
    request: vi.fn().mockResolvedValue({}),
  },
}));

import App from '../App';

describe('App Integration & Navigation', () => {
  it('renders onboarding on first run and allows skipping', async () => {
    localStorage.removeItem('jit_onboarded');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Ready for the interview\?/i)).toBeInTheDocument();
    });

    const skipBtn = screen.getByRole('button', { name: /Skip/i });
    fireEvent.click(skipBtn);
  });

  it('mounts App with onboarded state and handles keyboard shortcuts', async () => {
    localStorage.setItem('jit_onboarded', '1');
    const swipeMock = vi.fn();
    const closeExpMock = vi.fn();

    useStore.setState({
      questions: [
        { id: 1, question: 'What is volatile in Java?', category: 'Concurrency', level: 'middle', language: 'Java', shortAnswer: 'Ensures visibility across threads.' }
      ],
      currentIndex: 0,
      swipeCard: swipeMock,
      closeExplanation: closeExpMock,
      showExplanation: false,
      user: { id: 101, first_name: 'Sam', plan: 'pro_max' },
      stats: { streak: 5, totalQuestions: 20, known: 15 },
    });

    render(<App />);

    // Trigger keyboard navigation: ArrowRight (know)
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    // Trigger keyboard navigation: ArrowLeft (don't know)
    fireEvent.keyDown(window, { key: 'ArrowLeft' });

    // Trigger Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
  });

  it('renders web fallback when Telegram WebApp is absent', async () => {
    delete window.Telegram;

    render(<App />);

    // Landing should be rendered for standard web visitors
    await waitFor(() => {
      const brandElements = screen.getAllByText(/Prep-It/i);
      expect(brandElements.length).toBeGreaterThan(0);
    });
  });
});
