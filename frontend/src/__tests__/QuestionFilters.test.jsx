import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuickFilterBar from '../components/QuickFilterBar';
import { buildTestOptions } from '../utils/fallbackOptions';
import useStore from '../store/useStore';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => (typeof fallback === 'string' ? fallback : key),
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

describe('Question Filters & Anti-Bias Options', () => {
  beforeEach(() => {
    useStore.setState({
      selectedDifficulties: [],
      selectedCategories: [],
      selectedFrameworks: [],
      selectedTopics: [],
      filterOnlyTop: false,
      questions: [],
    });
  });

  it('renders QuickFilterBar with difficulty chips and filter button', () => {
    const onOpenFilters = vi.fn();
    render(<QuickFilterBar onOpenFilters={onOpenFilters} />);

    expect(screen.getByText('All')).toBeDefined();
    expect(screen.getByText('Junior')).toBeDefined();
    expect(screen.getByText('Middle')).toBeDefined();
    expect(screen.getByText('Senior')).toBeDefined();
    expect(screen.getByText('Filters')).toBeDefined();
    expect(screen.getByText(/top 100/i)).toBeDefined();

    fireEvent.click(screen.getByText('Filters'));
    expect(onOpenFilters).toHaveBeenCalledTimes(1);
  });

  it('toggles TOP 100 questions on chip click', () => {
    render(<QuickFilterBar onOpenFilters={vi.fn()} />);

    expect(useStore.getState().filterOnlyTop).toBe(false);

    const topBtn = screen.getByText(/top 100/i);
    fireEvent.click(topBtn);

    expect(useStore.getState().filterOnlyTop).toBe(true);

    fireEvent.click(topBtn);
    expect(useStore.getState().filterOnlyTop).toBe(false);
  });

  it('updates selected difficulties on chip click', () => {
    render(<QuickFilterBar onOpenFilters={vi.fn()} />);

    const juniorBtn = screen.getByText('Junior');
    fireEvent.click(juniorBtn);

    expect(useStore.getState().selectedDifficulties).toEqual(['Junior']);

    const allBtn = screen.getByText('All');
    fireEvent.click(allBtn);

    expect(useStore.getState().selectedDifficulties).toEqual([]);
  });

  it('displays active filter pills and allows dismiss', () => {
    useStore.setState({
      selectedFrameworks: ['Spring Boot 3'],
      selectedTopics: ['Virtual Threads'],
      filterOnlyTop: true,
    });

    render(<QuickFilterBar onOpenFilters={vi.fn()} />);

    expect(screen.getByText('⚡ Spring Boot 3')).toBeDefined();
    expect(screen.getByText('💡 Virtual Threads')).toBeDefined();
    expect(screen.getByText('Top')).toBeDefined();

    // Dismiss Top
    const removeTopBtn = screen.getByLabelText('Remove Top filter');
    fireEvent.click(removeTopBtn);

    expect(useStore.getState().filterOnlyTop).toBe(false);
  });

  it('buildTestOptions avoids length bias by matching candidate lengths closely', () => {
    const question = {
      id: 101,
      shortAnswer: 'Java 21 virtual threads are mounted onto carrier threads and unmount during non-pinning blocking IO operations.',
      options: [],
    };

    // Distractor pool with items of varied lengths
    const distractorPool = [
      { id: 1, text: 'Short' }, // 5 chars — obvious giveaway if picked
      { id: 2, text: 'A completely unrelated brief phrase' }, // 35 chars
      { id: 3, text: 'Platform threads are directly scheduled by the operating system kernel with preemption.' }, // 88 chars (good match)
      { id: 4, text: 'Asynchronous event loops multiplex single-threaded callbacks across non-blocking sockets.' }, // 90 chars (good match)
      { id: 5, text: 'Carrier threads maintain pinned execution context for low-latency hardware interrupts.' }, // 86 chars (good match)
    ];

    const options = buildTestOptions(question, distractorPool);
    expect(options.length).toBe(4);
    expect(options).toContain(question.shortAnswer);

    // The distractors chosen should be substantively matched in length, not the 5-char stub
    expect(options).not.toContain('Short');
  });
});
