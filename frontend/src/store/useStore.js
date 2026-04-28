import { create } from 'zustand';
import apiClient from '../api/client';

// ─── Offline Cache Helpers ───────────────────────────────────────────
const CACHE_KEY = 'interview_tinder_cache';
function saveToLocal(key, data) {
  try { localStorage.setItem(`${CACHE_KEY}_${key}`, JSON.stringify(data)); } catch (e) {}
}
function loadFromLocal(key) {
  try { return JSON.parse(localStorage.getItem(`${CACHE_KEY}_${key}`)); } catch (e) { return null; }
}

const useStore = create((set, get) => ({
  // Auth state
  user: null,
  isAuthenticated: false,
  isLoading: true,
  language: 'Java',

  // Questions state
  questions: [],
  currentIndex: 0,
  isLoadingQuestions: false,
  _loadingLock: false,      // prevents duplicate loadQuestions
  learningMode: 'swipe',

  // Stats state
  stats: { known: 0, unknown: 0, totalSeen: 0, totalQuestions: 0 },

  // Blitz state
  blitzScore: 0,
  blitzTimeLeft: 60,
  isBlitzActive: false,

  // Interview state
  interviewHistory: [],
  isEvaluatingInterview: false,

  // Resume state
  resumeData: null,
  isAnalyzingResume: false,

  // Explanation modal
  showExplanation: false,
  currentExplanation: null,
  isLoadingExplanation: false,

  // ─── Actions ─────────────────────────────────────────────────────

  setLanguage: (language) => {
    apiClient.setLanguage(language);
    set({ language });
  },

  login: async (initData) => {
    try {
      set({ isLoading: true });
      const response = await apiClient.login(initData);
      const user = response.user;

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        language: user.language || 'Java'
      });

      // Load initial data (small batch)
      await get().loadQuestions();
      get().loadStats();  // non-blocking

      return user;
    } catch (error) {
      console.error('Login error:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  loadQuestions: async (append = false) => {
    // Loading lock — prevent duplicate calls
    if (get()._loadingLock) return;
    set({ _loadingLock: true });

    try {
      if (!append) set({ isLoadingQuestions: true });
      const mode = get().learningMode;
      const response = await apiClient.getQuestionsFeed(5, mode);

      if (append) {
        set(state => ({
          questions: [...state.questions, ...response.questions],
          isLoadingQuestions: false,
          _loadingLock: false
        }));
      } else {
        set({
          questions: response.questions,
          currentIndex: 0,
          isLoadingQuestions: false,
          _loadingLock: false
        });
      }

      // Save to local storage for offline
      saveToLocal(`questions_${mode}`, response.questions);
    } catch (error) {
      console.error('Load questions error:', error);
      // Fallback to offline cache
      if (!append) {
        const cached = loadFromLocal(`questions_${get().learningMode}`);
        if (cached?.length > 0) {
          set({ questions: cached, currentIndex: 0, isLoadingQuestions: false, _loadingLock: false });
          return;
        }
      }
      set({ isLoadingQuestions: false, _loadingLock: false });
    }
  },

  loadStats: async () => {
    try {
      const stats = await apiClient.getStats();
      set({ stats });
      saveToLocal('stats', stats);
    } catch (error) {
      const cached = loadFromLocal('stats');
      if (cached) set({ stats: cached });
    }
  },

  swipeCard: async (questionId, direction) => {
    const status = direction === 'right' ? 'known' : 'unknown';

    // Optimistic UI — advance immediately
    const currentStats = get().stats;
    set({
      stats: { ...currentStats, [status]: currentStats[status] + 1, totalSeen: currentStats.totalSeen + 1 },
      currentIndex: get().currentIndex + 1
    });

    // Fire and forget
    apiClient.recordSwipe(questionId, status).catch(console.error);

    if (direction === 'left') {
      get().loadExplanation(questionId);
    }

    // Load more when running low (lazy)
    if (get().questions.length - get().currentIndex <= 2) {
      get().loadQuestions(true);
    }
  },

  submitTestAnswer: async (questionId, answer) => {
    try {
      const response = await apiClient.submitTestAnswer(questionId, answer);
      const status = response.isCorrect ? 'known' : 'unknown';
      const currentStats = get().stats;
      set({ stats: { ...currentStats, [status]: currentStats[status] + 1, totalSeen: currentStats.totalSeen + 1 } });

      if (!response.isCorrect) {
        get().loadExplanation(questionId);
      } else {
        set({ currentIndex: get().currentIndex + 1 });
      }

      if (get().questions.length - get().currentIndex <= 2) get().loadQuestions(true);
      return response;
    } catch (error) { console.error('Submit answer error:', error); throw error; }
  },

  submitBugHuntAnswer: async (questionId, answer) => {
    try {
      const response = await apiClient.submitBugHuntAnswer(questionId, answer);
      const status = response.isCorrect ? 'known' : 'unknown';
      const currentStats = get().stats;
      set({ stats: { ...currentStats, [status]: currentStats[status] + 1, totalSeen: currentStats.totalSeen + 1 } });
      if (!response.isCorrect) get().loadExplanation(questionId);
      else set({ currentIndex: get().currentIndex + 1 });
      if (get().questions.length - get().currentIndex <= 2) get().loadQuestions(true);
      return response;
    } catch (error) { throw error; }
  },

  submitBlitzAnswer: async (questionId, answer) => {
    try {
      const response = await apiClient.submitBlitzAnswer(questionId, answer);
      if (response.isCorrect) set(s => ({ blitzScore: s.blitzScore + 1 }));
      set(s => ({ currentIndex: s.currentIndex + 1 }));
      if (get().questions.length - get().currentIndex <= 2) get().loadQuestions(true);
      return response;
    } catch (error) { throw error; }
  },

  submitInterviewAnswer: async (question, answer) => {
    try {
      set({ isEvaluatingInterview: true });
      const evaluation = await apiClient.evaluateInterviewAnswer(question, answer);
      set(s => ({
        interviewHistory: [...s.interviewHistory, { role: 'candidate', content: answer, evaluation }],
        isEvaluatingInterview: false
      }));
      return evaluation;
    } catch (error) {
      set({ isEvaluatingInterview: false });
      throw error;
    }
  },

  addInterviewerMessage: (content) => {
    set(s => ({ interviewHistory: [...s.interviewHistory, { role: 'interviewer', content }] }));
  },

  nextInterviewQuestion: () => {
    const nextIndex = get().currentIndex + 1;
    set({ currentIndex: nextIndex });
    const q = get().questions[nextIndex];
    if (q) get().addInterviewerMessage(q.question);
    else get().loadQuestions(true).then(() => {
      const nq = get().questions[get().currentIndex];
      if (nq) get().addInterviewerMessage(nq.question);
    });
  },

  startInterview: () => {
    const q = get().questions[get().currentIndex];
    if (q) set({ interviewHistory: [{ role: 'interviewer', content: q.question }] });
  },

  submitCodeCompletionAnswer: async (questionId, answer) => {
    try {
      const response = await apiClient.submitCodeCompletionAnswer(questionId, answer);
      const status = response.isCorrect ? 'known' : 'unknown';
      const currentStats = get().stats;
      set({ stats: { ...currentStats, [status]: currentStats[status] + 1, totalSeen: currentStats.totalSeen + 1 } });
      if (!response.isCorrect) get().loadExplanation(questionId);
      else set({ currentIndex: get().currentIndex + 1 });
      if (get().questions.length - get().currentIndex <= 2) get().loadQuestions(true);
      return response;
    } catch (error) { throw error; }
  },

  startBlitz: () => {
    set({ blitzScore: 0, blitzTimeLeft: 60, isBlitzActive: true, currentIndex: 0 });
    get().loadQuestions();
  },

  stopBlitz: () => set({ isBlitzActive: false }),

  decrementBlitzTime: () => {
    set(s => {
      const t = s.blitzTimeLeft - 1;
      return t <= 0 ? { blitzTimeLeft: 0, isBlitzActive: false } : { blitzTimeLeft: t };
    });
  },

  setLearningMode: (mode) => {
    const prevMode = get().learningMode;
    set({
      learningMode: mode, currentIndex: 0,
      isBlitzActive: false, blitzTimeLeft: 60, blitzScore: 0, interviewHistory: []
    });

    // Don't reload if switching back to a mode that already has data
    if (mode !== prevMode) {
      get().loadQuestions().then(() => {
        if (mode === 'mock-interview') get().startInterview();
      });
    }
  },

  analyzeResume: async (resumeText) => {
    try {
      set({ isAnalyzingResume: true });
      const response = await apiClient.analyzeResume(resumeText);
      set({ resumeData: response.parsedData, isAnalyzingResume: false });
      return response.parsedData;
    } catch (error) {
      set({ isAnalyzingResume: false });
      throw error;
    }
  },

  clearResumeData: () => set({ resumeData: null }),

  loadExplanation: async (questionId) => {
    try {
      set({ isLoadingExplanation: true, showExplanation: true });
      const response = await apiClient.getExplanation(questionId);
      set({ currentExplanation: response.explanation, isLoadingExplanation: false });
    } catch (error) {
      set({ isLoadingExplanation: false, currentExplanation: 'Ошибка загрузки объяснения. Попробуйте позже.' });
    }
  },

  closeExplanation: () => {
    const { learningMode, currentIndex } = get();
    set({ showExplanation: false, currentExplanation: null });
    if (['test', 'bug-hunting', 'code-completion'].includes(learningMode)) {
      set({ currentIndex: currentIndex + 1 });
    }
  },

  getCurrentQuestion: () => get().questions[get().currentIndex],
  hasMoreQuestions: () => get().currentIndex < get().questions.length
}));

export default useStore;