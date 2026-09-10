import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import useStore from '../store/useStore';

// Mock react-tinder-card
vi.mock('react-tinder-card', () => ({
  default: ({ children, onCardLeftScreen }) => (
    <div data-testid="tinder-card" onClick={() => onCardLeftScreen?.('right')}>
      {children}
    </div>
  ),
}));

// Mock API Client
vi.mock('../api/client', () => ({
  default: {
    getCurrentChallenge: vi.fn().mockResolvedValue({
      challenge: {
        id: 1,
        theme: 'Concurrency Master',
        end_date: new Date(Date.now() + 86400000 * 3).toISOString(),
      },
    }),
    getPercentile: vi.fn().mockResolvedValue({ percentile: 85 }),
    getTracks: vi.fn().mockResolvedValue({
      tracks: [
        { id: 't1', title: 'Java Basics', description: 'Core syntax', totalSteps: 5, currentStep: 2, level: 'Junior' },
      ],
    }),
    getTrack: vi.fn().mockResolvedValue({
      id: 't1',
      name: 'Java Basics',
      description: 'Core syntax and concepts',
      totalSteps: 5,
      currentStep: 2,
      level: 'Junior',
      steps: [
        { id: 1, question: 'Variables', difficulty: 'Junior' },
        { id: 2, question: 'Loops', difficulty: 'Junior' },
        { id: 3, question: 'Classes', difficulty: 'Junior' },
      ],
    }),
    getPlans: vi.fn().mockResolvedValue({
      plans: [
        { id: 'free', name: 'Free', price: 0, interval: 'monthly', features: ['10 questions'] },
        { id: 'pro', name: 'Pro', price: 299, interval: 'monthly', features: ['Unlimited'] },
      ],
    }),
    getBillingInfo: vi.fn().mockResolvedValue({ plan: 'free', status: 'active' }),
    getBillingMethods: vi.fn().mockResolvedValue({ stars: true, ton: true, card: true }),
    getBillingHistory: vi.fn().mockResolvedValue({ history: [] }),
    getAdminUsers: vi.fn().mockResolvedValue({ users: [{ telegram_id: '123', username: 'alex' }] }),
    grantPlan: vi.fn().mockResolvedValue({ success: true }),
    createTonInvoice: vi.fn().mockResolvedValue({ address: 'EQD_TON', amountTon: 2.0, comment: 'IT-1' }),
    request: vi.fn().mockResolvedValue({}),
  },
}));

import ChallengeBanner from '../components/ChallengeBanner';
import ShareCard from '../components/ShareCard';
import Header from '../components/Header';
import TracksScreen from '../components/TracksScreen';
import TrackDetail from '../components/TrackDetail';
import Settings from '../components/Settings';
import ExplanationModal from '../components/ExplanationModal';
import QuestionCard from '../components/QuestionCard';
import SubscriptionPlans from '../components/SubscriptionPlans';

describe('ChallengeBanner Component', () => {
  it('renders active challenge banner and handles click', async () => {
    const onStart = vi.fn();
    render(<ChallengeBanner onStartChallenge={onStart} />);

    await waitFor(() => {
      expect(screen.getByText('Concurrency Master')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Concurrency Master'));
    expect(onStart).toHaveBeenCalled();
  });
});

describe('ShareCard Component', () => {
  it('renders user stats and handles close', async () => {
    const onBack = vi.fn();
    useStore.setState({
      user: { id: 'user_1', telegram_id: 'user_1' },
      language: 'Java',
    });

    const { container } = render(
      <ShareCard
        stats={{ streak: 5, known: 42, total: 50 }}
        onBack={onBack}
      />
    );

    expect(screen.getByText('42')).toBeInTheDocument();

    const closeBtn = container.querySelector('.close-btn');
    expect(closeBtn).toBeTruthy();
    fireEvent.click(closeBtn);
    expect(onBack).toHaveBeenCalled();
  });
});

describe('Header Component', () => {
  it('renders header and triggers filter/settings callbacks', () => {
    const onFilterClick = vi.fn();
    const onSettingsClick = vi.fn();
    useStore.setState({
      stats: { known: 10, total: 20 },
      dailyGoal: 10,
      todaySeen: 5,
    });

    render(
      <Header
        onFilterClick={onFilterClick}
        onSettingsClick={onSettingsClick}
      />
    );

    expect(screen.getByText('Prep-It')).toBeInTheDocument();

    const filterBtn = screen.getByLabelText(/Filters/i);
    fireEvent.click(filterBtn);
    expect(onFilterClick).toHaveBeenCalled();
  });
});

describe('TracksScreen & TrackDetail Components', () => {
  it('renders tracks list and navigates to start track or quick start', async () => {
    const onStartTrack = vi.fn();
    const onSkipToCategories = vi.fn();
    useStore.setState({
      language: 'Java',
      tracks: [
        { id: 't1', name: 'Java Basics', description: 'Core syntax', totalSteps: 5, currentStep: 2, level: 'Junior' },
      ],
      loadTracks: vi.fn().mockResolvedValue([]),
    });

    render(
      <TracksScreen
        onStartTrack={onStartTrack}
        onBack={vi.fn()}
        onSkipToCategories={onSkipToCategories}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Java Basics')).toBeInTheDocument();
    });

    const quickStartBtn = screen.getByRole('button', { name: /Перейти к обучению сразу/i });
    fireEvent.click(quickStartBtn);
    expect(onSkipToCategories).toHaveBeenCalled();
  });

  it('renders track details with step progression', async () => {
    const onBack = vi.fn();
    render(<TrackDetail trackId="t1" onBack={onBack} onStart={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Java Basics')).toBeInTheDocument();
      expect(screen.getByText('Variables')).toBeInTheDocument();
      expect(screen.getByText('Loops')).toBeInTheDocument();
      expect(screen.getByText('Classes')).toBeInTheDocument();
    });
  });
});

describe('Settings Component', () => {
  it('renders settings options and navigates', () => {
    const onBack = vi.fn();
    const onNavigate = vi.fn();
    useStore.setState({
      language: 'Java',
      user: { plan: 'free' },
    });

    const { container } = render(
      <Settings
        onBack={onBack}
        onNavigate={onNavigate}
        onExport={vi.fn()}
        onHelp={vi.fn()}
      />
    );

    const backBtn = container.querySelector('.settings-back-btn');
    expect(backBtn).toBeTruthy();
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalled();
  });
});

describe('ExplanationModal Component', () => {
  it('renders structured JSON explanation with code block and key points', () => {
    const onClose = vi.fn();
    const sampleExplanation = JSON.stringify({
      title: 'Polymorphism in Java',
      theory: 'Polymorphism allows objects to take multiple forms.',
      where_used: ['Method overriding', 'Interface implementations'],
      code_example: 'Animal a = new Dog(); a.makeSound();',
      key_points: ['Dynamic binding', 'Virtual method dispatch'],
    });

    render(
      <ExplanationModal
        explanation={sampleExplanation}
        isOpen={true}
        onClose={onClose}
        category="OOP"
        topic="Inheritance"
        isPending={false}
      />
    );

    expect(screen.getByText('Polymorphism in Java')).toBeInTheDocument();
    expect(screen.getByText('Polymorphism allows objects to take multiple forms.')).toBeInTheDocument();
    expect(screen.getByText('Dynamic binding')).toBeInTheDocument();
  });

  it('renders fallback plain text when explanation is not JSON', () => {
    render(
      <ExplanationModal
        explanation="Simple plain text explanation without JSON markup"
        isOpen={true}
        onClose={vi.fn()}
        category="Java Core"
        topic="Basics"
        isPending={false}
      />
    );

    expect(screen.getByText('Simple plain text explanation without JSON markup')).toBeInTheDocument();
  });
});

describe('QuestionCard Component', () => {
  it('renders question, flips card to answer, and allows saving', () => {
    const dummyQuestion = {
      id: 9001,
      question: 'What is the contract between equals() and hashCode()?',
      shortAnswer: 'If two objects are equal, their hashCodes must be equal.',
      category: 'Java Core',
      difficulty: 'Junior',
    };

    useStore.setState({
      savedIds: {},
      toggleSave: vi.fn(),
      loadQuestions: vi.fn(),
      loadExplanation: vi.fn(),
    });

    const { container } = render(
      <QuestionCard
        question={dummyQuestion}
        onSwipe={vi.fn()}
      />
    );

    expect(screen.getByText(dummyQuestion.question)).toBeInTheDocument();

    // Click card-inner to flip
    const cardInner = container.querySelector('.card-inner');
    expect(cardInner).toBeTruthy();
    fireEvent.click(cardInner);
    expect(screen.getByText(dummyQuestion.shortAnswer)).toBeInTheDocument();
  });
});

describe('SubscriptionPlans Component', () => {
  it('renders subscription options for free user', async () => {
    useStore.setState({
      user: { plan: 'free', telegram_id: '123' },
    });

    render(
      <SubscriptionPlans
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/subscription\.free/i)).toBeInTheDocument();
      expect(screen.getByText(/subscription\.pro/i)).toBeInTheDocument();
    });
  });
});
