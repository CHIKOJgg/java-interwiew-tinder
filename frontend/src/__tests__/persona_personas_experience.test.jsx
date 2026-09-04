import { describe, it, expect, vi, beforeEach } from 'vitest';
import useStore, { readinessFromStats } from '../store/useStore';
import apiClient from '../api/client';

describe('User Personas Deep Pipeline Audit (Frontend Pipelines)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useStore.setState({
      language: 'Java',
      learningMode: 'swipe',
      questions: [
        { id: 101, question: 'Java OOP Basics', shortAnswer: 'Polymorphism, Inheritance, Encapsulation, Abstraction', category: 'Core', difficulty: 'Junior' },
        { id: 102, question: 'Java Memory Model', shortAnswer: 'Heap vs Stack vs Metaspace', category: 'JVM', difficulty: 'Middle' },
        { id: 103, question: 'Virtual Threads Pinning', shortAnswer: 'Pinning occurs on synchronized blocks', category: 'Concurrency', difficulty: 'Senior' },
      ],
      currentIndex: 0,
      hasMore: true,
      stats: { known: 0, unknown: 0, totalSeen: 0, totalQuestions: 30, streak: 0, longestStreak: 0 },
      todaySeen: 0,
      dailyDone: false,
      dailyGoal: 20,
      showMissed: false,
      missed: null,
      savedIds: {},
      savedQuestions: [],
      selectedDifficulties: [],
      selectedCategories: [],
      selectedFrameworks: [],
      selectedTopics: [],
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 1. Студент / Новичок (Student Pipeline)
  // ─────────────────────────────────────────────────────────────────
  describe('Persona: Студент / Новичок (Student Beginner)', () => {
    it('applies Junior filter, answers correctly and incorrectly, inspects missed sheet, saves card, and marks as known in review', async () => {
      // 1. Student selects Junior filter
      useStore.getState().setSelectedDifficulties(['Junior']);
      expect(useStore.getState().selectedDifficulties).toEqual(['Junior']);

      // 2. Student knows Question 101 (swipes right)
      vi.spyOn(apiClient, 'recordSwipe').mockResolvedValue({
        success: true,
        streak: { current: 1, longest: 1, increased: true },
      });
      await useStore.getState().swipeCard(101, 'right');

      let state = useStore.getState();
      expect(state.stats.known).toBe(1);
      expect(state.stats.unknown).toBe(0);
      expect(state.stats.totalSeen).toBe(1);
      expect(state.stats.streakIncreased).toBe(true);
      expect(state.stats.streak).toBe(1);

      // 3. Student does NOT know Question 102 (swipes left)
      await useStore.getState().swipeCard(102, 'left');

      state = useStore.getState();
      expect(state.stats.known).toBe(1);
      expect(state.stats.unknown).toBe(1);
      expect(state.stats.totalSeen).toBe(2);
      expect(state.showMissed).toBe(true);
      expect(state.missed.id).toBe(102);
      expect(state.missed.shortAnswer).toBe('Heap vs Stack vs Metaspace');

      // 4. Student bookmarks Question 102 to saved questions
      vi.spyOn(apiClient, 'saveQuestion').mockResolvedValue({ success: true });
      await useStore.getState().toggleSave(102, state.missed);

      expect(useStore.getState().savedIds[102]).toBe(true);

      // 5. Student closes missed sheet
      useStore.getState().closeMissed();
      expect(useStore.getState().showMissed).toBe(false);

      // 6. Student enters Review Mode and rehearses Question 102 -> marks as known!
      useStore.setState({
        reviewQuestions: [{ id: 102, question: 'Java Memory Model', shortAnswer: 'Heap vs Stack' }],
        currentReviewIndex: 0,
      });

      await useStore.getState().reviewSwipe(102, 'right');
      expect(apiClient.recordSwipe).toHaveBeenCalledWith(102, 'known');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 2. Тот, кто учится и что-то уже знает (Mid Learner Pipeline)
  // ─────────────────────────────────────────────────────────────────
  describe('Persona: Тот, кто учится и что-то уже знает (Mid Learner)', () => {
    it('switches to Test mode, answers question, checks readiness and topic accuracy calculation', async () => {
      // 1. Mid learner switches to test mode
      useStore.getState().setLearningMode('test');
      expect(useStore.getState().learningMode).toBe('test');

      // 2. Submits answer to test question
      vi.spyOn(apiClient, 'submitTestAnswer').mockResolvedValue({
        isCorrect: true,
        correctAnswer: 'Heap vs Stack vs Metaspace',
        streak: { current: 3, longest: 5 },
      });

      const response = await useStore.getState().submitTestAnswer(102, 'Heap vs Stack vs Metaspace');
      expect(response.isCorrect).toBe(true);
      expect(useStore.getState().stats.known).toBe(1);

      // 3. Tests readiness calculation: 10 known, 5 unknown
      const statsSample = { known: 10, unknown: 5, totalSeen: 15 };
      const { readiness, tier } = readinessFromStats(statsSample);
      // Accuracy = 10/15 = 66.7%, coverage = 10/150 = 6.7%
      // 100 * (0.6 * 0.667 + 0.4 * 0.067) = 100 * (0.4 + 0.0268) ≈ 43% (building tier)
      expect(readiness).toBeGreaterThanOrEqual(40);
      expect(tier).toBe('building');
    });

    it('submits blitz answer and increments blitz score in real time', async () => {
      vi.spyOn(apiClient, 'submitBlitzAnswer').mockResolvedValue({ isCorrect: true });

      useStore.setState({ blitzScore: 0 });
      const res = await useStore.getState().submitBlitzAnswer(101, true, true);

      expect(res.isCorrect).toBe(true);
      expect(useStore.getState().blitzScore).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 3. Тот, кто прямо много знает (Senior Expert Pipeline)
  // ─────────────────────────────────────────────────────────────────
  describe('Persona: Тот, кто прямо много знает (Senior Expert)', () => {
    it('solves Bug Hunting and Code Completion, reaches high readiness tier, switches stack cleanly', async () => {
      // 1. Senior solves Bug Hunting mode question
      useStore.getState().setLearningMode('bug-hunting');
      vi.spyOn(apiClient, 'submitBugHuntAnswer').mockResolvedValue({
        isCorrect: true,
        feedback: 'Excellent! Identified carrier thread pinning.',
        streak: { current: 15, longest: 20 },
      });

      const bugRes = await useStore.getState().submitBugHuntAnswer(103, 'pinning');
      expect(bugRes.isCorrect).toBe(true);
      expect(useStore.getState().stats.known).toBe(1);

      // 2. Senior solves Code Completion
      useStore.getState().setLearningMode('code-completion');
      vi.spyOn(apiClient, 'submitCodeCompletionAnswer').mockResolvedValue({
        isCorrect: true,
        streak: { current: 16, longest: 20 },
      });

      const codeRes = await useStore.getState().submitCodeCompletionAnswer(103, 'synchronized');
      expect(codeRes.isCorrect).toBe(true);
      expect(useStore.getState().stats.known).toBe(2);

      // 3. Senior has high stats -> reaches 'ready' tier
      const seniorStats = { known: 140, unknown: 10, totalSeen: 150 };
      const { readiness, tier } = readinessFromStats(seniorStats);
      // Accuracy = 140/150 = 93.3%, coverage = 140/150 = 93.3% -> readiness ~93%
      expect(readiness).toBeGreaterThanOrEqual(80);
      expect(tier).toBe('ready');

      // 4. Senior switches stack to Python
      vi.spyOn(apiClient, 'switchLanguage').mockResolvedValue({ success: true });
      vi.spyOn(apiClient, 'setLanguage').mockImplementation(() => {});

      useStore.setState({ user: { telegram_id: '12345' } });
      await useStore.getState().switchLanguage('Python');

      expect(useStore.getState().language).toBe('Python');
      expect(useStore.getState().currentIndex).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 4. Edge Cases: Rapid Swiping, Filter Reset, Quick Filters
  // ─────────────────────────────────────────────────────────────────
  describe('Edge Cases & Stress Handling', () => {
    it('handles quick filter clearing cleanly', () => {
      useStore.setState({
        selectedDifficulties: ['Senior'],
        selectedFrameworks: ['Spring Boot 3'],
        selectedTopics: ['Virtual Threads'],
        selectedCategories: ['Concurrency'],
      });

      // Clear all filters
      useStore.setState({
        selectedDifficulties: [],
        selectedFrameworks: [],
        selectedTopics: [],
        selectedCategories: [],
      });

      const state = useStore.getState();
      expect(state.selectedDifficulties).toHaveLength(0);
      expect(state.selectedFrameworks).toHaveLength(0);
      expect(state.selectedTopics).toHaveLength(0);
      expect(state.selectedCategories).toHaveLength(0);
    });

    it('readinessFromStats handles 0 answered questions without NaN', () => {
      const emptyStats = { known: 0, unknown: 0, totalSeen: 0 };
      const { readiness, tier } = readinessFromStats(emptyStats);

      expect(readiness).toBe(0);
      expect(tier).toBe('novice');
      expect(Number.isNaN(readiness)).toBe(false);
    });
  });
});
