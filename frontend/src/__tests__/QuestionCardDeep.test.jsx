import React, { createRef } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import QuestionCard from '../components/QuestionCard';
import useStore from '../store/useStore';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => (typeof fallback === 'string' ? fallback : (fallback?.defaultValue || key)),
    i18n: { language: 'en' },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
}));

// Mock react-tinder-card
vi.mock('react-tinder-card', () => {
  const TinderCardMock = React.forwardRef(({ children, onSwipe, preventSwipe }, ref) => {
    React.useImperativeHandle(ref, () => ({
      swipe: (dir) => {
        if (onSwipe) onSwipe(dir);
      },
    }));
    return (
      <div data-testid="tinder-card" data-prevent-swipe={JSON.stringify(preventSwipe)}>
        {children}
      </div>
    );
  });
  TinderCardMock.displayName = 'TinderCardMock';
  return { default: TinderCardMock };
});

describe('QuestionCard Deep Coverage Suite', () => {
  const mockQuestion = {
    id: 101,
    question: 'How does ConcurrentHashMap achieve thread safety?',
    shortAnswer: 'Through segment locking / CAS operations and node-level synchronized blocks.',
    category: 'Multithreading',
    difficulty: 'Middle',
    prevStatus: 'unknown', // triggers repeat badge
  };

  let mockToggleSave;
  let mockLoadQuestions;
  let mockLoadExplanation;
  let mockSetSelectedCategories;
  let mockSetSelectedDifficulties;

  beforeEach(() => {
    vi.clearAllMocks();
    mockToggleSave = vi.fn().mockResolvedValue();
    mockLoadQuestions = vi.fn();
    mockLoadExplanation = vi.fn();
    mockSetSelectedCategories = vi.fn();
    mockSetSelectedDifficulties = vi.fn();

    useStore.setState({
      learningMode: 'swipe',
      savedIds: {},
      toggleSave: mockToggleSave,
      loadQuestions: mockLoadQuestions,
      loadExplanation: mockLoadExplanation,
      selectedCategories: [],
      setSelectedCategories: mockSetSelectedCategories,
      selectedDifficulties: [],
      setSelectedDifficulties: mockSetSelectedDifficulties,
      currentIndex: 5,
    });
  });

  it('renders card badges, repeat status, index badge and question text', () => {
    render(<QuestionCard question={mockQuestion} />);

    expect(screen.getByText('#6')).toBeInTheDocument();
    expect(screen.getAllByText('Multithreading').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Middle').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Repeat').length).toBeGreaterThan(0);
    expect(screen.getByText(mockQuestion.question)).toBeInTheDocument();
  });

  it('filters by category on category badge click', () => {
    render(<QuestionCard question={mockQuestion} />);

    const catBadges = screen.getAllByText('Multithreading');
    fireEvent.click(catBadges[0]);

    expect(mockSetSelectedCategories).toHaveBeenCalledWith(['Multithreading']);
    expect(mockLoadQuestions).toHaveBeenCalledWith(false);
  });

  it('filters by difficulty on difficulty badge click', () => {
    render(<QuestionCard question={mockQuestion} />);

    const diffBadges = screen.getAllByText('Middle');
    fireEvent.click(diffBadges[0]);

    expect(mockSetSelectedDifficulties).toHaveBeenCalledWith(['Middle']);
    expect(mockLoadQuestions).toHaveBeenCalledWith(false);
  });

  it('saves and unsaves question with bookmark button', async () => {
    render(<QuestionCard question={mockQuestion} />);

    const bookmarkBtns = screen.getAllByTitle(/Save to review later/i);
    expect(bookmarkBtns.length).toBeGreaterThan(0);

    fireEvent.click(bookmarkBtns[0]);
    expect(mockToggleSave).toHaveBeenCalledWith(101, mockQuestion);
  });

  it('dispatches report-question event on flag icon click', () => {
    const reportListener = vi.fn();
    window.addEventListener('report-question', reportListener);

    render(<QuestionCard question={mockQuestion} />);

    const flagBtn = screen.getByTitle('Report error');
    fireEvent.click(flagBtn);

    expect(reportListener).toHaveBeenCalled();
    const event = reportListener.mock.calls[0][0];
    expect(event.detail).toBe(101);

    window.removeEventListener('report-question', reportListener);
  });

  it('triggers onSwipeLeft and onSwipeRight when embedded swipe buttons are clicked', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();

    render(
      <QuestionCard
        question={mockQuestion}
        onSwipeLeft={onSwipeLeft}
        onSwipeRight={onSwipeRight}
      />
    );

    const dontKnowBtns = screen.getAllByText('swipe.dont_know');
    const knowBtns = screen.getAllByText('swipe.know');

    fireEvent.click(dontKnowBtns[0]);
    expect(onSwipeLeft).toHaveBeenCalledTimes(1);

    fireEvent.click(knowBtns[0]);
    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it('flips to back face on tap/click and triggers AI explanation', async () => {
    const { container } = render(<QuestionCard question={mockQuestion} />);

    const card = container.querySelector('.card');
    expect(card).toBeInTheDocument();

    // Simulate click to flip
    fireEvent.click(card);

    await waitFor(() => {
      expect(container.querySelector('.card')).toHaveClass('flipped');
    });

    // Short answer is present
    expect(screen.getByText(mockQuestion.shortAnswer)).toBeInTheDocument();

    // Click explain with AI button
    const explainAiBtn = screen.getByText(/Разобрать ИИ/i);
    fireEvent.click(explainAiBtn);

    expect(mockLoadExplanation).toHaveBeenCalledWith(101);
  });

  it('simulates mobile touch tap to flip card without scrolling', async () => {
    const { container } = render(<QuestionCard question={mockQuestion} />);
    const card = container.querySelector('.card');

    // Simulate touchstart
    fireEvent.touchStart(card, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    // Simulate touchend at almost same position (tap)
    fireEvent.touchEnd(card, {
      changedTouches: [{ clientX: 102, clientY: 103 }],
    });

    await waitFor(() => {
      expect(container.querySelector('.card')).toHaveClass('flipped');
    });
  });

  it('exposes swipe imperative method via forwarded ref', () => {
    const ref = createRef();
    const onSwipe = vi.fn();

    render(<QuestionCard ref={ref} question={mockQuestion} onSwipe={onSwipe} canSwipe={true} />);

    expect(ref.current).toBeDefined();
    ref.current.swipe('left');
    expect(onSwipe).toHaveBeenCalledWith('left');
  });
});
