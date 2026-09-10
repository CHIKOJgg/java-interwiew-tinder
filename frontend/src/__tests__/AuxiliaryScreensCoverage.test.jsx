import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import useStore from '../store/useStore';

// Mock API Client
vi.mock('../api/client', () => ({
  default: {
    getCurrentChallenge: vi.fn().mockResolvedValue({
      challenge: { id: 1, theme: 'Weekly Spring Challenge' },
      leaderboard: [
        { user_id: 'u1', first_name: 'Alice', questions_answered: 50, accuracy: 96, score: 480 },
        { user_id: 'u2', first_name: 'Bob', questions_answered: 40, accuracy: 90, score: 360 },
      ],
    }),
    getCompanies: vi.fn().mockResolvedValue({
      companies: ['Google', 'Yandex', 'Tinkoff'],
    }),
    request: vi.fn().mockResolvedValue({}),
  },
}));

import ThemeToggle from '../components/ThemeToggle';
import DeckComplete from '../components/DeckComplete';
import SwipeButtons from '../components/SwipeButtons';
import PaywallModal from '../components/PaywallModal';
import LanguageSelection from '../components/LanguageSelection';
import SavedQuestions from '../components/SavedQuestions';
import CertificateModal from '../components/CertificateModal';
import Leaderboard from '../components/Leaderboard';
import ProNudge from '../components/ProNudge';
import CompaniesScreen from '../components/CompaniesScreen';
import AchievementScreen from '../components/AchievementScreen';

describe('ThemeToggle Component', () => {
  it('renders theme toggle and toggles theme on click', () => {
    const toggleThemeMock = vi.fn();
    useStore.setState({ theme: 'light', toggleTheme: toggleThemeMock });

    render(<ThemeToggle />);
    const btn = screen.getByLabelText(/Toggle theme/i);
    fireEvent.click(btn);
    expect(toggleThemeMock).toHaveBeenCalled();
  });
});

describe('DeckComplete Component', () => {
  it('renders completion screen and handles actions', () => {
    const onChooseOther = vi.fn();
    const onShare = vi.fn();

    const { container } = render(
      <DeckComplete onChooseOther={onChooseOther} onShare={onShare} />
    );

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    fireEvent.click(buttons[0]);
    expect(onChooseOther).toHaveBeenCalled();
    fireEvent.click(buttons[1]);
    expect(onShare).toHaveBeenCalled();
  });
});

describe('SwipeButtons Component', () => {
  it('triggers left and right swipe handlers', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();

    const { container } = render(
      <SwipeButtons onSwipeLeft={onSwipeLeft} onSwipeRight={onSwipeRight} />
    );

    const leftBtn = container.querySelector('.swipe-button-left');
    const rightBtn = container.querySelector('.swipe-button-right');

    expect(leftBtn).toBeTruthy();
    expect(rightBtn).toBeTruthy();

    fireEvent.click(leftBtn);
    expect(onSwipeLeft).toHaveBeenCalled();

    fireEvent.click(rightBtn);
    expect(onSwipeRight).toHaveBeenCalled();
  });
});

describe('PaywallModal Component', () => {
  it('renders paywall when open and triggers upgrade or close', () => {
    const closePaywallMock = vi.fn();
    const onUpgradeMock = vi.fn();

    useStore.setState({
      paywall: { open: true, mode: 'blitz' },
      closePaywall: closePaywallMock,
    });

    const { container } = render(<PaywallModal onUpgrade={onUpgradeMock} />);

    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();

    const ctaBtn = container.querySelector('.paywall-cta');
    expect(ctaBtn).toBeTruthy();
    fireEvent.click(ctaBtn);
    expect(onUpgradeMock).toHaveBeenCalled();

    const closeBtn = container.querySelector('.paywall-close');
    expect(closeBtn).toBeTruthy();
    fireEvent.click(closeBtn);
    expect(closePaywallMock).toHaveBeenCalled();
  });
});

describe('LanguageSelection Component', () => {
  it('renders languages and handles language selection', async () => {
    const switchLanguageMock = vi.fn().mockResolvedValue();
    const onSelect = vi.fn();

    useStore.setState({
      language: 'Java',
      switchLanguage: switchLanguageMock,
    });

    render(<LanguageSelection onSelect={onSelect} />);

    expect(screen.getByText('Java')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Python'));

    await waitFor(() => {
      expect(switchLanguageMock).toHaveBeenCalledWith('Python');
      expect(onSelect).toHaveBeenCalledWith('Python');
    });
  });
});

describe('SavedQuestions Component', () => {
  it('renders saved questions and triggers removal and explanation', () => {
    const toggleSaveMock = vi.fn();
    const loadExplanationMock = vi.fn();
    const onBack = vi.fn();

    useStore.setState({
      savedQuestions: [
        { id: 99, question: 'What is JVM?', shortAnswer: 'Java Virtual Machine', category: 'JVM', difficulty: 'Junior' },
      ],
      savedIds: { 99: true },
      toggleSave: toggleSaveMock,
      loadExplanation: loadExplanationMock,
    });

    const { container } = render(<SavedQuestions onBack={onBack} />);

    expect(screen.getByText('What is JVM?')).toBeInTheDocument();
    expect(screen.getByText('Java Virtual Machine')).toBeInTheDocument();

    const removeBtn = container.querySelector('.saved-remove');
    expect(removeBtn).toBeTruthy();
    fireEvent.click(removeBtn);
    expect(toggleSaveMock).toHaveBeenCalledWith(99);

    const backBtn = container.querySelector('.saved-back');
    expect(backBtn).toBeTruthy();
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalled();
  });
});

describe('CertificateModal Component', () => {
  it('renders certificate modal when open', () => {
    const onClose = vi.fn();
    const cert = {
      title: 'Spring Framework Specialist',
      score: 95,
      issuedAt: new Date().toISOString(),
    };

    render(
      <CertificateModal isOpen={true} onClose={onClose} certificate={cert} />
    );

    expect(screen.getByText('Spring Framework Specialist')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Leaderboard Component', () => {
  it('loads and displays leaderboard challenge theme and users', async () => {
    const onBack = vi.fn();
    useStore.setState({ language: 'Java', user: { telegram_id: 'u1' } });

    render(<Leaderboard onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText('Weekly Spring Challenge')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('480')).toBeInTheDocument();
    });

    const backBtn = screen.getByRole('button');
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalled();
  });
});

describe('CompaniesScreen Component', () => {
  it('renders companies list and selects company', async () => {
    const setSelectedCompanyMock = vi.fn();
    const onBack = vi.fn();
    useStore.setState({ setSelectedCompany: setSelectedCompanyMock });

    render(<CompaniesScreen onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByText('Google')).toBeInTheDocument();
      expect(screen.getByText('Yandex')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Google'));
    expect(setSelectedCompanyMock).toHaveBeenCalledWith('Google');
    expect(onBack).toHaveBeenCalled();
  });
});

describe('AchievementScreen Component', () => {
  it('renders badges and progress', () => {
    const onBack = vi.fn();
    useStore.setState({
      badges: [
        { key: 'first_question', name: 'First Step', unlocked: true },
        { key: 'known_10', name: '10 Concepts', unlocked: false },
      ],
      isLoadingBadges: false,
    });

    render(<AchievementScreen onBack={onBack} />);

    expect(screen.getByText('1 / 12')).toBeInTheDocument();
    const backBtn = screen.getByRole('button');
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalled();
  });
});
