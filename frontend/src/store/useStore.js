import { create } from 'zustand';
import apiClient from '../api/client';

// ─── Offline Cache Helpers ───────────────────────────────────────────
const CACHE_KEY = 'interview_tinder_cache';
function saveToLocal(key, data) {
  try { localStorage.setItem(`${CACHE_KEY}_${key}`, JSON.stringify(data)); } catch {}
}
function loadFromLocal(key) {
  try { return JSON.parse(localStorage.getItem(`${CACHE_KEY}_${key}`)); } catch { return null; }
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
  _loadingLock: false,
  learningMode: 'swipe',

  // Stats
  stats: { known: 0, unknown: 0, totalSeen: 0, totalQuestions: 0 },

  // Blitz
  blitzScore: 0,
  blitzTimeLeft: 60,
  isBlitzActive: false,

  // Interview
  interviewHistory: [],
  isEvaluatingInterview: false,

  // Resume
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
      const lang = user.language || 'Java';
      apiClient.setLanguage(lang);

      set({ user, isAuthenticated: true, isLoading: false, language: lang });

      // Load questions BEFORE returning so screen transition never sees empty state
      await get().loadQuestions();
      get().loadStats(); // non-blocking

      return user;
    } catch (error) {
      console.error('Login error:', error);
      set({ isLoading: false, _loadingLock: false }); // always release lock on error
      throw error;
    }
  },

  loadQuestions: async (append = false) => {
    // Prevent duplicate concurrent calls
    if (get()._loadingLock) return;
    set({ _loadingLock: true });

    try {
      if (!append) set({ isLoadingQuestions: true });

      const mode = get().learningMode;
      const response = await apiClient.getQuestionsFeed(5, mode);

      if (append) {
        set((state) => ({
          questions: [...state.questions, ...response.questions],
          isLoadingQuestions: false,
          _loadingLock: false,
        }));
      } else {
        set({
          questions: response.questions,
          currentIndex: 0,
          isLoadingQuestions: false,
          _loadingLock: false,
        });
      }

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
      // Always release lock — even on error — to prevent app from hanging
      set({ isLoadingQuestions: false, _loadingLock: false });
    }
  },

  loadStats: async () => {
    try {
      const stats = await apiClient.getStats();
      set({ stats });
      saveToLocal('stats', stats);
    } catch {
      const cached = loadFromLocal('stats');
      if (cached) set({ stats: cached });
    }
  },

  swipeCard: async (questionId, direction) => {
    const status = direction === 'right' ? 'known' : 'unknown';
    const currentStats = get().stats;
    set({
      stats: { ...currentStats, [status]: currentStats[status] + 1, totalSeen: currentStats.totalSeen + 1 },
      currentIndex: get().currentIndex + 1,
    });

    apiClient.recordSwipe(questionId, status).catch(console.error);

    if (direction === 'left') {
      get().loadExplanation(questionId);
    }

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
    } catch (error) {
      console.error('Submit answer error:', error);
      throw error;
    }
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
      if (response.isCorrect) set((s) => ({ blitzScore: s.blitzScore + 1 }));
      set((s) => ({ currentIndex: s.currentIndex + 1 }));
      if (get().questions.length - get().currentIndex <= 2) get().loadQuestions(true);
      return response;
    } catch (error) { throw error; }
  },

  submitInterviewAnswer: async (question, answer) => {
    try {
      set({ isEvaluatingInterview: true });
      const evaluation = await apiClient.evaluateInterviewAnswer(question, answer);
      set((s) => ({
        interviewHistory: [...s.interviewHistory, { role: 'candidate', content: answer, evaluation }],
        isEvaluatingInterview: false,
      }));
      return evaluation;
    } catch (error) {
      set({ isEvaluatingInterview: false });
      throw error;
    }
  },

  addInterviewerMessage: (content) => {
    set((s) => ({ interviewHistory: [...s.interviewHistory, { role: 'interviewer', content }] }));
  },

  nextInterviewQuestion: () => {
    const nextIndex = get().currentIndex + 1;
    set({ currentIndex: nextIndex });
    const q = get().questions[nextIndex];
    if (q) {
      get().addInterviewerMessage(q.question);
    } else {
      get().loadQuestions(true).then(() => {
        const nq = get().questions[get().currentIndex];
        if (nq) get().addInterviewerMessage(nq.question);
      });
    }
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
    set((s) => {
      const t = s.blitzTimeLeft - 1;
      return t <= 0 ? { blitzTimeLeft: 0, isBlitzActive: false } : { blitzTimeLeft: t };
    });
  },

  setLearningMode: (mode) => {
    const prevMode = get().learningMode;
    set({
      learningMode: mode,
      currentIndex: 0,
      isBlitzActive: false,
      blitzTimeLeft: 60,
      blitzScore: 0,
      interviewHistory: [],
    });

    if (mode !== prevMode) {
      get().loadQuestions().then(() => {
        if (mode === 'mock-interview') get().startInterview();
      });
    } else if (mode === 'mock-interview') {
      get().startInterview();
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

  fetchGeneration: async (type, questionId) => {
    const question = get().questions.find((q) => q.id === questionId);
    if (!question) return;

    const typeMap = { test: 'options', bug: 'bugHuntingData', blitz: 'blitzData', code: 'codeCompletionData' };
    const dataKey = typeMap[type];

    try {
      const response = await apiClient.requestGeneration(type, question.question, question.shortAnswer, question.category);
      if (response.status === 'ready' && response.data) {
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === questionId
              ? { ...q, [dataKey]: response.data, options: type === 'test' ? response.data : q.options }
              : q
          ),
        }));
        return response.data;
      } else if (response.status === 'pending') {
        await new Promise((r) => setTimeout(r, 2000));
        return get().fetchGeneration(type, questionId);
      }
    } catch (error) {
      console.error(`Fetch generation error (${type}):`, error);
    }
  },

  clearResumeData: () => set({ resumeData: null }),

  loadExplanation: async (questionId) => {
    try {
      set({ isLoadingExplanation: true, showExplanation: true });
      const response = await apiClient.getExplanation(questionId);
      set({ currentExplanation: response.explanation, isLoadingExplanation: false });
    } catch {
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
  hasMoreQuestions: () => get().currentIndex < get().questions.length,
}));

export default useStore;
