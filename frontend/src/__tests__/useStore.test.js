import { describe, it, expect, beforeEach } from 'vitest';
import useStore from '../store/useStore';

describe('useStore — deck / index safety', () => {
  beforeEach(() => {
    // Reset to a known clean state before each test.
    useStore.setState({
      questions: [],
      currentIndex: 0,
      hasMore: true,
      feedCursor: 0,
      _loadingLock: false,
      isLoadingQuestions: false,
    });
  });

  it('getCurrentQuestion returns undefined (not throw) when index out of bounds', () => {
    useStore.setState({ questions: [{ id: 1 }, { id: 2 }], currentIndex: 5 });
    expect(useStore.getState().getCurrentQuestion()).toBeUndefined();
  });

  it('getCurrentQuestion returns the question at currentIndex', () => {
    const q = { id: 42, question_text: 'x' };
    useStore.setState({ questions: [q], currentIndex: 0 });
    expect(useStore.getState().getCurrentQuestion()).toBe(q);
  });

  it('hasMoreQuestions is true while index is within bounds', () => {
    useStore.setState({ questions: [{}, {}], currentIndex: 0, hasMore: true });
    expect(useStore.getState().hasMoreQuestions()).toBe(true);
  });

  it('hasMoreQuestions is false when deck exhausted (index >= length AND !hasMore)', () => {
    useStore.setState({ questions: [{}, {}], currentIndex: 2, hasMore: false });
    expect(useStore.getState().hasMoreQuestions()).toBe(false);
  });

  it('advanceQuestion does not trigger a load when feed is exhausted', () => {
    let loadCalled = false;
    useStore.setState({
      questions: [{}, {}],
      currentIndex: 1,
      hasMore: false,
      loadQuestions: () => { loadCalled = true; },
    });
    useStore.getState().advanceQuestion();
    expect(useStore.getState().currentIndex).toBe(2);
    expect(loadCalled).toBe(false);
  });

  it('advanceQuestion triggers a load when more questions remain', () => {
    let loadCalled = false;
    useStore.setState({
      questions: [{}, {}, {}, {}],
      currentIndex: 2,
      hasMore: true,
      loadQuestions: () => { loadCalled = true; },
    });
    useStore.getState().advanceQuestion();
    expect(useStore.getState().currentIndex).toBe(3);
    expect(loadCalled).toBe(true);
  });
});
