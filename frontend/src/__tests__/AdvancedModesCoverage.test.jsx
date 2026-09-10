import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import useStore from '../store/useStore';

// Mock monaco editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

// Mock react-tinder-card
vi.mock('react-tinder-card', () => ({
  default: ({ children }) => <div data-testid="tinder-card">{children}</div>,
}));

// Mock API Client
vi.mock('../api/client', () => ({
  default: {
    executeCode: vi.fn().mockResolvedValue({
      output: 'Hello, Test Output!',
      exitCode: 0,
    }),
    getTrack: vi.fn().mockResolvedValue({
      id: 'track1',
      totalSteps: 10,
      currentStep: 3,
    }),
    getCurrentChallenge: vi.fn().mockResolvedValue({
      challenge: { id: 1, theme: 'Weekly Sprint' },
    }),
    fetchMarketTrends: vi.fn().mockResolvedValue({
      topSkills: ['Spring Boot', 'PostgreSQL', 'Docker'],
      averageSalary: '$3500',
      vacanciesCount: 1200,
    }),
    request: vi.fn().mockResolvedValue({}),
  },
}));

import PlaygroundMode from '../components/LearningModes/PlaygroundMode';
import TrackMode from '../components/LearningModes/TrackMode';
import ChallengeMode from '../components/LearningModes/ChallengeMode';
import MarketTrends from '../components/MarketTrends';
import VacancyPrep from '../components/VacancyPrep';
import ReviewMode from '../components/ReviewMode';

describe('PlaygroundMode Component', () => {
  it('renders editor and executes code with output display', async () => {
    useStore.setState({ language: 'Java' });
    const onBack = vi.fn();

    const { container } = render(<PlaygroundMode onBack={onBack} />);

    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();

    const runBtn = container.querySelector('.run-btn');
    expect(runBtn).toBeTruthy();
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getByText('Hello, Test Output!')).toBeInTheDocument();
      expect(screen.getByText('Exit: 0')).toBeInTheDocument();
    });

    const resetBtn = container.querySelector('.reset-btn');
    fireEvent.click(resetBtn);

    const backBtn = container.querySelector('.playground-back');
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalled();
  });
});

describe('TrackMode Component', () => {
  it('renders active track progression and questions', async () => {
    const onBack = vi.fn();
    const swipeCardMock = vi.fn().mockResolvedValue(true);
    const advanceTrackMock = vi.fn().mockResolvedValue(true);

    useStore.setState({
      currentTrack: 'track1',
      questions: [
        {
          id: 701,
          question: 'Track question 1: What is Dependency Injection?',
          shortAnswer: 'Inversion of control pattern passing dependencies.',
          category: 'Spring',
          difficulty: 'Junior',
        },
      ],
      currentIndex: 0,
      swipeCard: swipeCardMock,
      advanceTrack: advanceTrackMock,
    });

    render(<TrackMode onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText(/What is Dependency Injection/i)).toBeInTheDocument();
      expect(screen.getByText('4 / 10')).toBeInTheDocument();
    });
  });
});

describe('ChallengeMode Component', () => {
  it('renders challenge timer and questions', async () => {
    useStore.setState({
      language: 'Java',
      distractorPool: ['Wrong A', 'Wrong B'],
      loadDistractors: vi.fn().mockResolvedValue([]),
      loadQuestions: vi.fn(),
      questions: [
        {
          id: 801,
          question: 'What is the contract between equals() and hashCode()?',
          shortAnswer: 'Equal objects must have equal hashCodes.',
          options: ['Equal objects must have equal hashCodes.', 'Wrong A', 'Wrong B'],
        },
      ],
      currentIndex: 0,
    });

    render(<ChallengeMode onBack={vi.fn()} onLeaderboard={vi.fn()} />);

    expect(screen.getByText(/What is the contract between equals/i)).toBeInTheDocument();
  });
});

describe('MarketTrends Component', () => {
  it('loads and renders market trends data', async () => {
    const onBack = vi.fn();
    useStore.setState({ language: 'Java' });

    vi.mocked((await import('../api/client')).default.fetchMarketTrends).mockResolvedValueOnce({
      totalVacancies: 1200,
      avgSalary: 350000,
      language: 'Java',
      topSkills: ['Spring Boot', 'PostgreSQL', 'Docker'],
    });

    render(<MarketTrends onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText('Spring Boot')).toBeInTheDocument();
      expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
      expect(screen.getByText('Docker')).toBeInTheDocument();
    });
  });
});

describe('VacancyPrep Component', () => {
  it('analyzes vacancy and renders questions and skills', async () => {
    const prepareVacancyMock = vi.fn().mockResolvedValue({
      suggestedTopTopics: ['Kafka', 'Microservices'],
      questions: [
        { question: 'How does Kafka handle partition rebalancing?' },
      ],
    });

    useStore.setState({
      prepareVacancy: prepareVacancyMock,
      setLearningMode: vi.fn(),
    });

    const { container } = render(<VacancyPrep onBack={vi.fn()} />);

    const textarea = container.querySelector('#vacancy-input');
    expect(textarea).toBeTruthy();
    fireEvent.change(textarea, { target: { value: 'Senior Java Backend Engineer with Kafka' } });

    const analyzeBtn = container.querySelector('.analyze-btn');
    expect(analyzeBtn).toBeTruthy();
    fireEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(prepareVacancyMock).toHaveBeenCalledWith('Senior Java Backend Engineer with Kafka');
      expect(screen.getByText('Kafka')).toBeInTheDocument();
      expect(screen.getByText('How does Kafka handle partition rebalancing?')).toBeInTheDocument();
    });
  });
});

describe('ReviewMode Component', () => {
  it('renders paywall when user cannot access review mode', () => {
    const onUpgrade = vi.fn();
    useStore.setState({
      canAccessMode: () => false,
      reviewQuestions: [],
    });

    render(<ReviewMode onBack={vi.fn()} onUpgrade={onUpgrade} />);

    expect(screen.getByText(/Repeat your weak spots/i)).toBeInTheDocument();
    const upgradeBtn = screen.getByRole('button', { name: /PRO/i });
    fireEvent.click(upgradeBtn);
    expect(onUpgrade).toHaveBeenCalled();
  });

  it('renders review card and handles answer when access is granted', () => {
    const reviewSwipeMock = vi.fn();
    useStore.setState({
      canAccessMode: () => true,
      reviewQuestions: [
        {
          id: 991,
          question: 'What is volatile keyword in Java?',
          shortAnswer: 'Ensures visibility across threads.',
          category: 'Multithreading',
          difficulty: 'Middle',
        },
      ],
      currentReviewIndex: 0,
      isLoadingReview: false,
      reviewDone: false,
      loadReviewQuestions: vi.fn(),
      reviewSwipe: reviewSwipeMock,
    });

    const { container } = render(<ReviewMode onBack={vi.fn()} onUpgrade={vi.fn()} />);

    expect(screen.getByText('What is volatile keyword in Java?')).toBeInTheDocument();

    // Flip card
    const card = container.querySelector('.review-card');
    expect(card).toBeTruthy();
    fireEvent.click(card);

    expect(screen.getByText('Ensures visibility across threads.')).toBeInTheDocument();
  });
});
