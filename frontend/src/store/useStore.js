import { create } from 'zustand';
import apiClient from '../api/client';

const CACHE_KEY = 'interview_tinder_cache';
function saveToLocal(key, data) { try { localStorage.setItem(`${CACHE_KEY}_${key}`, JSON.stringify(data)); } catch { } }
function loadFromLocal(key) { try { return JSON.parse(localStorage.getItem(`${CACHE_KEY}_${key}`)); } catch { return null; } }

const useStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  language: 'Java',

  pendingGenerations: {},

  questions: [],
  currentIndex: 0,
  isLoadingQuestions: false,
  _loadingLock: false,
  learningMode: 'swipe',

  stats: { known: 0, unknown: 0, totalSeen: 0, totalQuestions: 0 },

  blitzScore: 0,
  blitzTimeLeft: 60,
  isBlitzActive: false,

  interviewHistory: [],
  isEvaluatingInterview: false,

  resumeData: null,
  isAnalyzingResume: false,

  showExplanation: false,
  currentExplanation: null,
  isLoadingExplanation: false,

  // ─── Auth ──────────────────────────────────────────────────────────
  login: async (initData) => {
    try {
      set({ isLoading: true });

      const response = await apiClient.login(initData);
      const user = response.user;
      const lang = user.language || 'Java';
      apiClient.setLanguage(lang);
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        language: lang
      });

      // ✅ NON-BLOCKING
      get().loadQuestions().catch(console.error);
      get().loadStats().catch(console.error);
      return user;
    } catch (error) {
      set({ isLoading: false, _loadingLock: false });
      throw error;
    }
  },

  // ─── Language switching ────────────────────────────────────────────
  // Calls the new /api/preferences/language endpoint which clears stale
  // category filters, then reloads questions for the new language.
  switchLanguage: async (language) => {
    const { user } = get();
    apiClient.setLanguage(language);
    set({ language, currentIndex: 0, questions: [] });

    if (user?.telegram_id) {
      try {
        await apiClient.switchLanguage(user.telegram_id, language);
      } catch (err) {
        console.error('Language preference save failed:', err);
      }
    }
    // Return to category selection so user picks cats for the new language
    return 'category';
  },

  // ─── Questions ─────────────────────────────────────────────────────
  loadQuestions: async (append = false) => {
    if (get()._loadingLock) return;
    set({ _loadingLock: true, isLoadingQuestions: !append });
    try {
      const mode = get().learningMode;
      const response = await apiClient.getQuestionsFeed(5, mode);
      if (append) {
        set(s => ({ questions: [...s.questions, ...response.questions], isLoadingQuestions: false, _loadingLock: false }));
      } else {
        set({ questions: response.questions, currentIndex: 0, isLoadingQuestions: false, _loadingLock: false });
      }
      saveToLocal(`questions_${mode}`, response.questions);
    } catch (error) {
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
    } catch {
      const cached = loadFromLocal('stats');
      if (cached) set({ stats: cached });
    }
  },

  // ─── Swipe ─────────────────────────────────────────────────────────
  swipeCard: async (questionId, direction) => {
    const status = direction === 'right' ? 'known' : 'unknown';
    set(s => ({
      stats: { ...s.stats, [status]: s.stats[status] + 1, totalSeen: s.stats.totalSeen + 1 },
      currentIndex: s.currentIndex + 1,
    }));
    apiClient.recordSwipe(questionId, status).catch(console.error);
    if (direction === 'left') get().loadExplanation(questionId);
    if (get().questions.length - get().currentIndex <= 2) get().loadQuestions(true);
  },

  submitTestAnswer: async (questionId, answer) => {
    const response = await apiClient.submitTestAnswer(questionId, answer);
    const status = response.isCorrect ? 'known' : 'unknown';
    set(s => ({ stats: { ...s.stats, [status]: s.stats[status] + 1, totalSeen: s.stats.totalSeen + 1 } }));
    if (!response.isCorrect) get().loadExplanation(questionId);
    else set(s => ({ currentIndex: s.currentIndex + 1 }));
    if (get().questions.length - get().currentIndex <= 2) get().loadQuestions(true);
    return response;
  },

  submitBugHuntAnswer: async (questionId, answer) => {
    const response = await apiClient.submitBugHuntAnswer(questionId, answer);
    const status = response.isCorrect ? 'known' : 'unknown';
    set(s => ({ stats: { ...s.stats, [status]: s.stats[status] + 1, totalSeen: s.stats.totalSeen + 1 } }));
    if (!response.isCorrect) get().loadExplanation(questionId);
    else set(s => ({ currentIndex: s.currentIndex + 1 }));
    if (get().questions.length - get().currentIndex <= 2) get().loadQuestions(true);
    return response;
  },

  submitBlitzAnswer: async (questionId, answer) => {
    const response = await apiClient.submitBlitzAnswer(questionId, answer);
    if (response.isCorrect) set(s => ({ blitzScore: s.blitzScore + 1 }));
    set(s => ({ currentIndex: s.currentIndex + 1 }));
    if (get().questions.length - get().currentIndex <= 2) get().loadQuestions(true);
    return response;
  },

  submitInterviewAnswer: async (question, answer) => {
    set({ isEvaluatingInterview: true });
    try {
      const evaluation = await apiClient.evaluateInterviewAnswer(question, answer);
      set(s => ({
        interviewHistory: [...s.interviewHistory, { role: 'candidate', content: answer, evaluation }],
        isEvaluatingInterview: false,
      }));
      return evaluation;
    } catch (err) {
      set({ isEvaluatingInterview: false });
      throw err;
    }
  },

  addInterviewerMessage: (content) =>
    set(s => ({ interviewHistory: [...s.interviewHistory, { role: 'interviewer', content }] })),

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
    const response = await apiClient.submitCodeCompletionAnswer(questionId, answer);
    const status = response.isCorrect ? 'known' : 'unknown';
    set(s => ({ stats: { ...s.stats, [status]: s.stats[status] + 1, totalSeen: s.stats.totalSeen + 1 } }));
    // Incorrect -> open explanation modal; closeExplanation() advances currentIndex.
    // Correct   -> do NOT auto-advance; CodeCompletionMode.handleNext calls advanceQuestion()
    //              so the user sees the green feedback before the question changes.
    if (!response.isCorrect) get().loadExplanation(questionId);
    if (get().questions.length - get().currentIndex <= 2) get().loadQuestions(true);
    return response;
  },

  // Advance used by CodeCompletionMode so the component controls when currentIndex changes.
  advanceQuestion: () => {
    set(s => ({ currentIndex: s.currentIndex + 1 }));
    if (get().questions.length - get().currentIndex <= 2) get().loadQuestions(true);
  },

  // ─── Blitz ─────────────────────────────────────────────────────────
  startBlitz: () => {
    set({ blitzScore: 0, blitzTimeLeft: 60, isBlitzActive: true, currentIndex: 0 });
    get().loadQuestions();
  },
  stopBlitz: () => set({ isBlitzActive: false }),
  decrementBlitzTime: () => set(s => {
    const t = s.blitzTimeLeft - 1;
    return t <= 0 ? { blitzTimeLeft: 0, isBlitzActive: false } : { blitzTimeLeft: t };
  }),

  // ─── Mode switching ────────────────────────────────────────────────
  setLearningMode: (mode) => {
    const prevMode = get().learningMode;
    set({ learningMode: mode, currentIndex: 0, isBlitzActive: false, blitzTimeLeft: 60, blitzScore: 0, interviewHistory: [] });
    if (mode !== prevMode) {
      get().loadQuestions().then(() => {
        if (mode === 'mock-interview') get().startInterview();
      });
    } else if (mode === 'mock-interview') {
      get().startInterview();
    }
  },

  // ─── Resume ────────────────────────────────────────────────────────
  analyzeResume: async (resumeText) => {
    set({ isAnalyzingResume: true });
    try {
      const response = await apiClient.analyzeResume(resumeText);
      set({ resumeData: response.parsedData, isAnalyzingResume: false });
      return response.parsedData;
    } catch (err) {
      set({ isAnalyzingResume: false });
      throw err;
    }
  },
  clearResumeData: () => set({ resumeData: null }),

  fetchGeneration: async (type, questionId) => {
    const question = get().questions.find(q => q.id === questionId);
    if (!question) return;

    const typeMap = {
      test: 'options',
      bug: 'bugHuntingData',
      blitz: 'blitzData',
      code: 'codeCompletionData',
    };
    const dataKey = typeMap[type];
    const key = `${type}:${questionId}:${question.language || get().language}`;

    if (get().pendingGenerations[key]) {
      return get().pendingGenerations[key];
    }

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    const promise = (async () => {
      const startResponse = await apiClient.requestGeneration(
        type,
        question.question,
        question.shortAnswer,
        question.category
      );

      if (startResponse.status === 'ready' && startResponse.data !== undefined) {
        set(state => ({
          questions: state.questions.map(q =>
            q.id === questionId
              ? { ...q, [dataKey]: startResponse.data, options: type === 'test' ? startResponse.data : q.options }
              : q
          ),
        }));
        return startResponse.data;
      }

      const deadline = Date.now() + 60000;

      while (Date.now() < deadline) {
        await sleep(2000);

        const statusResponse = await apiClient.request(
          `/generate/${type}?questionText=${encodeURIComponent(question.question)}&language=${encodeURIComponent(question.language || get().language)}`,
          { method: 'GET' }
        );

        if (statusResponse.status === 'ready' && statusResponse.data !== undefined) {
          set(state => ({
            questions: state.questions.map(q =>
              q.id === questionId
                ? { ...q, [dataKey]: statusResponse.data, options: type === 'test' ? statusResponse.data : q.options }
                : q
            ),
          }));
          return statusResponse.data;
        }

        if (statusResponse.status === 'failed') {
          throw new Error(statusResponse.error || 'Generation failed');
        }
      }

      throw new Error('Generation timeout');
    })();

    set(state => ({
      pendingGenerations: {
        ...state.pendingGenerations,
        [key]: promise,
      },
    }));

    try {
      return await promise;
    } catch (err) {
      console.error(`fetchGeneration(${type}) failed:`, err);
      throw err;
    } finally {
      set(state => {
        const next = { ...state.pendingGenerations };
        delete next[key];
        return { pendingGenerations: next };
      });
    }
  },

  // ─── Explanation ───────────────────────────────────────────────────
  loadExplanation: async (questionId) => {
    set({ isLoadingExplanation: true, showExplanation: true });
    try {
      const response = await apiClient.getExplanation(questionId);
      set({ currentExplanation: response.explanation, isLoadingExplanation: false });
    } catch (err) {
      // Surface the real server error so the user (and you) can see what failed
      const detail = err?.message || 'Неизвестная ошибка';
      set({
        isLoadingExplanation: false,
        currentExplanation: `⚠️ Не удалось загрузить объяснение.\n\n**Причина:** ${detail}\n\nПроверьте OPENROUTER_API_KEY и OPENROUTER_MODEL в .env на сервере.`,
      });
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