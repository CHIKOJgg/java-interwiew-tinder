import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import QuickFilterBar from '../components/QuickFilterBar';
import useStore from '../store/useStore';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => (typeof fallback === 'string' ? fallback : (fallback?.defaultValue || key)),
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

describe('QuickFilterBar Deep Coverage', () => {
  const defaultProps = {
    onOpenFilters: vi.fn(),
    onOpenNavigator: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({
      selectedDifficulties: ['Junior'],
      setSelectedDifficulties: vi.fn(),
      difficultyCounts: { Junior: 20, Middle: 30, Senior: 10, total: 60 },
      selectedCategories: ['Java Core'],
      setSelectedCategories: vi.fn(),
      selectedFrameworks: ['Spring Boot'],
      setSelectedFrameworks: vi.fn(),
      selectedTopics: ['Streams'],
      setSelectedTopics: vi.fn(),
      filterOnlyTop: true,
      setFilterOnlyTop: vi.fn(),
      loadQuestions: vi.fn(),
      questions: [{ id: 1 }, { id: 2 }, { id: 3 }],
      currentIndex: 1,
      jumpToPrevQuestion: vi.fn(),
      jumpToNextQuestion: vi.fn(),
    });
  });

  it('renders all filter chips, navigator button, and question stepper', () => {
    render(<QuickFilterBar {...defaultProps} />);

    expect(screen.getByTitle('Навигатор по вопросам')).toBeTruthy();
    expect(screen.getByTitle('Top 100 Questions')).toBeTruthy();
    expect(screen.getByText('2/3')).toBeTruthy(); // stepper currentIndex: 1 out of 3
  });

  it('handles question stepper prev and next navigation', () => {
    const jumpToPrev = vi.fn();
    const jumpToNext = vi.fn();
    useStore.setState({
      jumpToPrevQuestion: jumpToPrev,
      jumpToNextQuestion: jumpToNext,
    });

    render(<QuickFilterBar {...defaultProps} />);

    const prevBtn = screen.getByLabelText('Предыдущий вопрос');
    const nextBtn = screen.getByLabelText('Следующий вопрос');

    fireEvent.click(prevBtn);
    expect(jumpToPrev).toHaveBeenCalledTimes(1);

    fireEvent.click(nextBtn);
    expect(jumpToNext).toHaveBeenCalledTimes(1);
  });

  it('toggles difficulties and handles clicking All', () => {
    const setSelectedDifficulties = vi.fn();
    const loadQuestions = vi.fn();
    useStore.setState({ setSelectedDifficulties, loadQuestions, selectedDifficulties: ['Junior'] });

    render(<QuickFilterBar {...defaultProps} />);

    // Click All chip
    const allChip = screen.getByText('All');
    fireEvent.click(allChip);
    expect(setSelectedDifficulties).toHaveBeenCalledWith([]);
    expect(loadQuestions).toHaveBeenCalledWith(false);

    // Click Middle chip
    const middleChip = screen.getByText('Middle');
    fireEvent.click(middleChip);
    expect(setSelectedDifficulties).toHaveBeenCalledWith(['Middle']);

    // Toggle same difficulty off
    useStore.setState({ selectedDifficulties: ['Middle'] });
    fireEvent.click(middleChip);
    expect(setSelectedDifficulties).toHaveBeenCalledWith([]);
  });

  it('toggles Top 100 filter', () => {
    const setFilterOnlyTop = vi.fn();
    const loadQuestions = vi.fn();
    useStore.setState({ setFilterOnlyTop, loadQuestions, filterOnlyTop: true });

    render(<QuickFilterBar {...defaultProps} />);

    const topChip = screen.getByTitle('Top 100 Questions');
    fireEvent.click(topChip);
    expect(setFilterOnlyTop).toHaveBeenCalledWith(false);
  });

  it('removes individual filter pills: Top, Framework, Topic, and Category', () => {
    const setFilterOnlyTop = vi.fn();
    const setSelectedFrameworks = vi.fn();
    const setSelectedTopics = vi.fn();
    const setSelectedCategories = vi.fn();
    const loadQuestions = vi.fn();

    useStore.setState({
      filterOnlyTop: true,
      setFilterOnlyTop,
      selectedFrameworks: ['Spring Boot'],
      setSelectedFrameworks,
      selectedTopics: ['Streams'],
      setSelectedTopics,
      selectedCategories: ['Java Core'],
      setSelectedCategories,
      loadQuestions,
    });

    render(<QuickFilterBar {...defaultProps} />);

    // Remove Top pill
    const removeTop = screen.getByLabelText('Remove Top filter');
    fireEvent.click(removeTop);
    expect(setFilterOnlyTop).toHaveBeenCalledWith(false);

    // Remove Framework pill
    const removeFw = screen.getByLabelText('Remove Spring Boot');
    fireEvent.click(removeFw);
    expect(setSelectedFrameworks).toHaveBeenCalledWith([]);

    // Remove Topic pill
    const removeTopPill = screen.getByLabelText('Remove Streams');
    fireEvent.click(removeTopPill);
    expect(setSelectedTopics).toHaveBeenCalledWith([]);

    // Remove Category pill
    const removeCat = screen.getByLabelText('Remove Java Core');
    fireEvent.click(removeCat);
    expect(setSelectedCategories).toHaveBeenCalledWith([]);
  });

  it('clears all filters and opens full filters modal or navigator', () => {
    const setSelectedDifficulties = vi.fn();
    const setSelectedCategories = vi.fn();
    const setSelectedFrameworks = vi.fn();
    const setSelectedTopics = vi.fn();
    const setFilterOnlyTop = vi.fn();
    const loadQuestions = vi.fn();

    useStore.setState({
      setSelectedDifficulties,
      setSelectedCategories,
      setSelectedFrameworks,
      setSelectedTopics,
      setFilterOnlyTop,
      loadQuestions,
    });

    render(<QuickFilterBar {...defaultProps} />);

    // Reset button
    const clearBtn = screen.getByTitle('Clear all filters');
    fireEvent.click(clearBtn);

    expect(setSelectedDifficulties).toHaveBeenCalledWith([]);
    expect(setSelectedCategories).toHaveBeenCalledWith([]);
    expect(setSelectedFrameworks).toHaveBeenCalledWith([]);
    expect(setSelectedTopics).toHaveBeenCalledWith([]);
    expect(setFilterOnlyTop).toHaveBeenCalledWith(false);

    // Full Filters trigger
    const fullFiltersBtn = screen.getByTitle('Filter by category, framework, topic');
    fireEvent.click(fullFiltersBtn);
    expect(defaultProps.onOpenFilters).toHaveBeenCalledTimes(1);

    // Navigator trigger
    const navBtn = screen.getByTitle('Навигатор по вопросам');
    fireEvent.click(navBtn);
    expect(defaultProps.onOpenNavigator).toHaveBeenCalledTimes(1);
  });
});
