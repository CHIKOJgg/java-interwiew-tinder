import { describe, it, expect, vi, beforeEach } from 'vitest';
import useStore from '../store/useStore';
import apiClient from '../api/client';

describe('Persona 4: Chaos Switcher (Frontend Pipeline)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useStore.setState({
      language: 'Java',
      learningMode: 'swipe',
      questions: [{ id: 1, question: 'Java Question 1' }, { id: 2, question: 'Java Question 2' }],
      currentIndex: 1,
      theme: 'light',
      availableModes: ['swipe', 'test', 'bug-hunting', 'blitz', 'mock-interview', 'system-design'],
      availableLanguages: ['Java', 'Python', 'TypeScript', 'Go', 'Rust'],
      tracksCache: {},
      selectedCategories: [],
      selectedDifficulties: [],
      selectedCompany: null,
      isBlitzActive: false,
      blitzScore: 0,
      interviewHistory: [],
    });
  });

  it('resets card index and loads new questions when rapidly hopping modes', async () => {
    vi.spyOn(useStore.getState(), 'loadQuestions').mockResolvedValue();
    vi.spyOn(apiClient, 'getQuestionsFeed').mockResolvedValue({ questions: [], meta: { hasMore: false } });

    const modes = ['test', 'bug-hunting', 'blitz', 'mock-interview', 'swipe'];
    for (const mode of modes) {
      useStore.getState().setLearningMode(mode);
      expect(useStore.getState().learningMode).toBe(mode);
      expect(useStore.getState().currentIndex).toBe(0);
    }
  });

  it('resets deck and state cleanly when switching programming languages', async () => {
    vi.spyOn(apiClient, 'switchLanguage').mockResolvedValue({ success: true });

    await useStore.getState().switchLanguage('Python');

    const state = useStore.getState();
    expect(state.language).toBe('Python');
    expect(state.questions).toEqual([]);
    expect(state.currentIndex).toBe(0);
    expect(state.feedCursor).toBe(0);
    expect(apiClient.language).toBe('Python');

    await useStore.getState().switchLanguage('TypeScript');
    expect(useStore.getState().language).toBe('TypeScript');
    expect(apiClient.language).toBe('TypeScript');
  });

  it('toggles themes rapidly between light and dark', () => {
    expect(useStore.getState().theme).toBe('light');

    useStore.getState().toggleTheme();
    expect(useStore.getState().theme).toBe('dark');

    useStore.getState().toggleTheme();
    expect(useStore.getState().theme).toBe('light');

    useStore.getState().toggleTheme();
    expect(useStore.getState().theme).toBe('dark');
  });

  it('toggles complex filter combinations without state collision', () => {
    useStore.getState().setSelectedCategories(['Java Core', 'Collections']);
    useStore.getState().setSelectedDifficulties(['Senior']);
    useStore.setState({ selectedCompany: 'Google' });

    const state = useStore.getState();
    expect(state.selectedCategories).toEqual(['Java Core', 'Collections']);
    expect(state.selectedDifficulties).toEqual(['Senior']);
    expect(state.selectedCompany).toBe('Google');

    // Reset filters
    useStore.getState().setSelectedCategories([]);
    useStore.getState().setSelectedDifficulties([]);
    useStore.setState({ selectedCompany: null });

    const resetState = useStore.getState();
    expect(resetState.selectedCategories).toEqual([]);
    expect(resetState.selectedDifficulties).toEqual([]);
    expect(resetState.selectedCompany).toBeNull();
  });
});
