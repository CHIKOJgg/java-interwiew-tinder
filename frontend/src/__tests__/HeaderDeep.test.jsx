import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Header from '../components/Header';
import useStore from '../store/useStore';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => (typeof fallback === 'string' ? fallback : (fallback?.defaultValue || key)),
    i18n: { language: 'en' },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

describe('Header Component Deep Coverage', () => {
  const defaultProps = {
    onSettingsClick: vi.fn(),
    onProgressClick: vi.fn(),
    onTrackClick: vi.fn(),
    onTopClick: vi.fn(),
    onFilterClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({
      stats: { known: 20, unknown: 5, streak: 3, longestStreak: 7 },
      learningMode: 'swipe',
      setLearningMode: vi.fn(),
      canAccessMode: vi.fn().mockReturnValue(true),
      requestPaywall: vi.fn(),
      todaySeen: 5,
      dailyGoal: 10,
      dailyDone: false,
      selectedCategories: ['Java Core'],
      selectedFrameworks: ['Spring Boot'],
      selectedTopics: ['Multithreading'],
      selectedDifficulties: ['Junior'],
      filterOnlyTop: true,
    });
  });

  it('renders brand logo, active filter count, readiness and daily progress', () => {
    render(<Header {...defaultProps} />);

    expect(screen.getByText('Prep-It')).toBeTruthy();
    // activeFiltersCount = 1 (cat) + 1 (fw) + 1 (topic) + 1 (diff) + 1 (top) = 5
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('triggers onFilterClick, onSettingsClick, and onProgressClick', () => {
    render(<Header {...defaultProps} />);

    // Filter button
    const filterBtn = screen.getByRole('button', { name: /Filters/i });
    fireEvent.click(filterBtn);
    expect(defaultProps.onFilterClick).toHaveBeenCalledTimes(1);

    // Settings button
    const settingsBtn = screen.getByRole('button', { name: /header\.settings/i });
    fireEvent.click(settingsBtn);
    expect(defaultProps.onSettingsClick).toHaveBeenCalledTimes(1);

    // Progress container click
    const statsContainer = screen.getByTitle(/Open progress/i);
    fireEvent.click(statsContainer);
    expect(defaultProps.onProgressClick).toHaveBeenCalledTimes(1);
  });

  it('switches modes from bottom navigation', () => {
    const setLearningMode = vi.fn();
    useStore.setState({ setLearningMode });

    render(<Header {...defaultProps} />);

    // Bottom nav has visible modes: swipe, test, system-design, bug-hunting
    const testModeBtn = screen.getByTitle('modes.test');
    fireEvent.click(testModeBtn);
    expect(setLearningMode).toHaveBeenCalledWith('test');
  });

  it('requests paywall if mode is locked in bottom nav', () => {
    const requestPaywall = vi.fn();
    useStore.setState({
      canAccessMode: (mode) => mode !== 'system-design',
      requestPaywall,
    });

    render(<Header {...defaultProps} />);

    const sdBtn = screen.getByTitle('modes.system_design');
    fireEvent.click(sdBtn);
    expect(requestPaywall).toHaveBeenCalledWith('system-design');
  });

  it('opens More drawer, selects Top Questions and extra modes', () => {
    const setLearningMode = vi.fn();
    useStore.setState({ setLearningMode });

    render(<Header {...defaultProps} />);

    // Click More button
    const moreBtn = screen.getByTitle('header.more');
    fireEvent.click(moreBtn);

    // Click Top Questions hot button
    const topHotBtn = screen.getByText('Top Questions');
    fireEvent.click(topHotBtn);
    expect(defaultProps.onTopClick).toHaveBeenCalledTimes(1);

    // Reopen drawer and click track mode
    fireEvent.click(moreBtn);
    const trackBtn = screen.getByText('modes.track_mode');
    fireEvent.click(trackBtn);
    expect(defaultProps.onTrackClick).toHaveBeenCalledTimes(1);

    // Reopen drawer and click blitz mode
    fireEvent.click(moreBtn);
    const blitzBtn = screen.getByText('modes.blitz');
    fireEvent.click(blitzBtn);
    expect(setLearningMode).toHaveBeenCalledWith('blitz');
  });

  it('handles locked mode in drawer by opening paywall', () => {
    const requestPaywall = vi.fn();
    useStore.setState({
      canAccessMode: (mode) => mode !== 'blitz',
      requestPaywall,
    });

    render(<Header {...defaultProps} />);

    const moreBtn = screen.getByTitle('header.more');
    fireEvent.click(moreBtn);

    const blitzBtn = screen.getByText('modes.blitz');
    fireEvent.click(blitzBtn);
    expect(requestPaywall).toHaveBeenCalledWith('blitz');
  });
});
