import { describe, it, expect, vi, beforeEach } from 'vitest';
import useStore from '../store/useStore';
import apiClient from '../api/client';

describe('Persona 1: Speed Swiper (Frontend Pipeline)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useStore.setState({
      questions: Array.from({ length: 15 }, (_, i) => ({
        id: 100 + i,
        question: `Question ${i}`,
        shortAnswer: `Answer ${i}`,
        category: 'Java Core',
        difficulty: 'Junior',
      })),
      currentIndex: 0,
      hasMore: true,
      feedCursor: 0,
      _loadingLock: false,
      isLoadingQuestions: false,
      learningMode: 'swipe',
      stats: { known: 0, unknown: 0, totalSeen: 0, totalQuestions: 15, streak: 0, longestStreak: 0 },
      todaySeen: 0,
      dailyDone: false,
      dailyGoal: 20,
      showMissed: false,
      missed: null,
    });
  });

  it('handles rapid right-swipes sequentially updating index, stats, and daily goal', async () => {
    vi.spyOn(apiClient, 'recordSwipe').mockResolvedValue({
      success: true,
      streak: { current: 1, longest: 1, increased: true },
    });

    // Speed swiper swipes 5 cards in immediate succession
    for (let i = 0; i < 5; i++) {
      const q = useStore.getState().questions[useStore.getState().currentIndex];
      await useStore.getState().swipeCard(q.id, 'right');
    }

    const state = useStore.getState();
    expect(state.currentIndex).toBe(5);
    expect(state.stats.known).toBe(5);
    expect(state.stats.totalSeen).toBe(5);
    expect(state.todaySeen).toBe(5);
  });

  it('triggers auto-pagination when remaining cards drop to <= 5', async () => {
    let loadQuestionsCalled = false;
    useStore.setState({
      loadQuestions: (append) => {
        if (append) loadQuestionsCalled = true;
        return Promise.resolve();
      },
    });
    vi.spyOn(apiClient, 'recordSwipe').mockResolvedValue({ success: true });

    // Deck has 15 questions. After 10 swipes, remaining is 5 -> triggers loadQuestions(true)
    for (let i = 0; i < 10; i++) {
      const q = useStore.getState().questions[useStore.getState().currentIndex];
      await useStore.getState().swipeCard(q.id, 'right');
    }

    expect(useStore.getState().currentIndex).toBe(10);
    expect(loadQuestionsCalled).toBe(true);
  });

  it('opens MissedPanel on left-swipe ("Don\'t know")', async () => {
    vi.spyOn(apiClient, 'recordSwipe').mockResolvedValue({ success: true });

    const q = useStore.getState().questions[0];
    await useStore.getState().swipeCard(q.id, 'left');

    const state = useStore.getState();
    expect(state.currentIndex).toBe(1);
    expect(state.stats.unknown).toBe(1);
    expect(state.showMissed).toBe(true);
    expect(state.missed.id).toBe(q.id);
  });

  it('undoSwipe rolls back stats without breaking index bounds', async () => {
    vi.spyOn(apiClient, 'recordSwipe').mockResolvedValue({ success: true });
    vi.spyOn(apiClient, 'request').mockResolvedValue({ success: true });

    const q = useStore.getState().questions[0];
    await useStore.getState().swipeCard(q.id, 'right');
    expect(useStore.getState().stats.known).toBe(1);

    await useStore.getState().undoSwipe(q.id, 'right');
    expect(useStore.getState().stats.known).toBe(0);
    expect(useStore.getState().stats.totalSeen).toBe(0);
  });

  it('recovers gracefully when a swipe API call fails', async () => {
    vi.spyOn(apiClient, 'recordSwipe').mockRejectedValue(new Error('Network disconnected'));

    const q = useStore.getState().questions[0];
    await useStore.getState().swipeCard(q.id, 'right');

    // Optimistic state must rollback to index 0 and 0 known
    expect(useStore.getState().currentIndex).toBe(0);
    expect(useStore.getState().stats.known).toBe(0);
  });
});
