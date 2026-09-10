import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QuestionNavigatorModal from '../components/QuestionNavigatorModal';
import QuickFilterBar from '../components/QuickFilterBar';
import useStore from '../store/useStore';
import apiClient from '../api/client';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => {
      if (typeof fallback === 'object' && fallback?.defaultValue) return fallback.defaultValue;
      return typeof fallback === 'string' ? fallback : key;
    },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

describe('QuestionNavigatorModal and Enhanced QuickFilterBar', () => {
  const sampleQuestions = [
    {
      id: 1,
      question: 'Что такое Virtual Threads в Java 21?',
      shortAnswer: 'Легковесные потоки времени выполнения, монтируемые на carrier threads.',
      category: 'Java Core',
      difficulty: 'Middle',
    },
    {
      id: 2,
      question: 'Как работает Model Context Protocol (MCP) в Spring AI 2.0?',
      shortAnswer: 'Клиент-серверный открытый протокол контекста для LLM и инструментов.',
      category: 'Spring AI',
      difficulty: 'Senior',
    },
    {
      id: 3,
      question: 'Что такое ООП?',
      shortAnswer: 'Объектно-ориентированное программирование с классами и объектами.',
      category: 'OOP',
      difficulty: 'Junior',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    useStore.setState({
      language: 'Java',
      questions: sampleQuestions,
      currentIndex: 0,
      selectedDifficulties: [],
      difficultyCounts: { Junior: 280, Middle: 210, Senior: 147, total: 637 },
      selectedCategories: [],
      selectedFrameworks: [],
      selectedTopics: [],
      filterOnlyTop: false,
    });

    vi.spyOn(apiClient, 'getFilters').mockResolvedValue({
      language: 'Java',
      difficulties: [
        { name: 'Junior', count: 280 },
        { name: 'Middle', count: 210 },
        { name: 'Senior', count: 147 },
      ],
      categories: [
        { name: 'Java Core', count: 120 },
      ],
    });

    vi.spyOn(apiClient, 'getCategories').mockResolvedValue({
      categories: [
        { name: 'Java Core', count: 120 },
        { name: 'Spring AI', count: 70 },
        { name: 'OOP', count: 50 },
      ],
    });

    vi.spyOn(apiClient, 'getQuestionsFeed').mockResolvedValue({
      questions: sampleQuestions,
      meta: { hasMore: false },
    });
  });

  it('renders QuestionNavigatorModal when open', async () => {
    const onClose = vi.fn();
    const { container } = render(<QuestionNavigatorModal isOpen={true} onClose={onClose} />);

    expect(screen.getByPlaceholderText(/Поиск по вопросам/i)).toBeInTheDocument();
    expect(container.querySelector('.nav-diff-tab.diff-junior')).toBeInTheDocument();
    expect(container.querySelector('.nav-diff-tab.diff-middle')).toBeInTheDocument();
    expect(container.querySelector('.nav-diff-tab.diff-senior')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Что такое Virtual Threads в Java 21/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Model Context Protocol/i)).toBeInTheDocument();
    expect(screen.getByText(/Что такое ООП/i)).toBeInTheDocument();
  });

  it('filters questions by difficulty tab click', async () => {
    const { container } = render(<QuestionNavigatorModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Model Context Protocol/i)).toBeInTheDocument();
    });

    // Click Senior tab
    const seniorBtn = container.querySelector('.nav-diff-tab.diff-senior');
    fireEvent.click(seniorBtn);

    await waitFor(() => {
      expect(seniorBtn).toHaveClass('active');
    });
  });

  it('filters questions by live search input', async () => {
    render(<QuestionNavigatorModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Virtual Threads/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Поиск по вопросам/i);
    fireEvent.change(searchInput, { target: { value: 'MCP' } });

    await waitFor(() => {
      expect(screen.getByText(/Model Context Protocol/i)).toBeInTheDocument();
      expect(screen.queryByText(/Что такое ООП/i)).not.toBeInTheDocument();
    }, { timeout: 1500 });
  });

  it('calls jumpToQuestion and onClose when a question is clicked', async () => {
    const onClose = vi.fn();
    render(<QuestionNavigatorModal isOpen={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText(/Model Context Protocol/i)).toBeInTheDocument();
    });

    const questionCard = screen.getByText(/Model Context Protocol/i).closest('.nav-question-card');
    const openBtn = questionCard.querySelector('.nav-open-btn');
    fireEvent.click(openBtn || questionCard);

    await waitFor(() => {
      expect(useStore.getState().currentIndex).toBe(1); // sampleQuestions[1] is MCP
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('starts drill for a specific level from footer button', async () => {
    const onClose = vi.fn();
    const { container } = render(<QuestionNavigatorModal isOpen={true} onClose={onClose} />);

    // Click Senior tab
    const seniorBtn = container.querySelector('.nav-diff-tab.diff-senior');
    fireEvent.click(seniorBtn);

    const drillBtn = container.querySelector('.nav-drill-btn');
    fireEvent.click(drillBtn);

    expect(useStore.getState().selectedDifficulties).toEqual(['Senior']);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders QuickFilterBar with Question Navigator button and stepper', () => {
    const onOpenFilters = vi.fn();
    const onOpenNavigator = vi.fn();
    render(<QuickFilterBar onOpenFilters={onOpenFilters} onOpenNavigator={onOpenNavigator} />);

    const navBtn = screen.getByRole('button', { name: /Вопросы/i });
    expect(navBtn).toBeInTheDocument();

    fireEvent.click(navBtn);
    expect(onOpenNavigator).toHaveBeenCalledTimes(1);

    // Stepper checks
    expect(screen.getByText('1/3')).toBeInTheDocument();

    const nextBtn = screen.getByRole('button', { name: /Следующий вопрос/i });
    fireEvent.click(nextBtn);
    expect(useStore.getState().currentIndex).toBe(1);
  });
});
