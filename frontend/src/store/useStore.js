import { create } from 'zustand';
import apiClient from '../api/client';

const CACHE_KEY = 'interview_tinder_cache';
function saveToLocal(key, data) { try { localStorage.setItem(`${CACHE_KEY}_${key}`, JSON.stringify(data)); } catch { } }
function loadFromLocal(key) { try { return JSON.parse(localStorage.getItem(`${CACHE_KEY}_${key}`)); } catch { return null; } }

function saveToSession(key, data) { try { sessionStorage.setItem(`${CACHE_KEY}_${key}`, JSON.stringify(data)); } catch { } }
function loadFromSession(key) { try { return JSON.parse(sessionStorage.getItem(`${CACHE_KEY}_${key}`)); } catch { return null; } }

const useStore = create((set, get) => ({
  user: null,
  token: loadFromSession('token'),
  isAuthenticated: !!loadFromSession('token'),
  isLoading: true,
  language: 'Java',

  questions: [],
  currentIndex: 0,
  isLoadingQuestions: false,
  _loadingLock: false,
  learningMode: 'swipe',

  stats: { known: 0, unknown: 0, totalSeen: 0, totalQuestions: 0, streak: 0, longestStreak: 0 },
  // Selected categories and per-category progress (§3)
  selectedCategories: [],
  categoryStats: { known: 0, total: 0 },

  blitzScore: 0,
  blitzTimeLeft: 60,
  isBlitzActive: false,
  blitzIdle: true,

  interviewHistory: [],
  isEvaluatingInterview: false,

  resumeData: null,
  isAnalyzingResume: false,

  showExplanation: false,
  currentExplanation: null,
  isLoadingExplanation: false,

  // ─── Auth ──────────────────────────────────────────────────────────
  login: async (initData, referralId) => {
    try {
      set({ isLoading: true });
      const response = await apiClient.login(initData, referralId);
      const { user, token } = response;
      const lang = user.language || 'Java';
      apiClient.setLanguage(lang);
      
      saveToSession('token', token);
      set({ user, token, isAuthenticated: true, isLoading: false, language: lang });
      
      await get().loadQuestions();
      get().loadStats();
      return user;
    } catch (error) {
      set({ isLoading: false, _loadingLock: false });
      throw error;
    }
  },

  logout: () => {
    sessionStorage.removeItem(`${CACHE_KEY}_token`);
    localStorage.clear(); // Clear all other caches
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      questions: [],
      stats: { known: 0, unknown: 0, totalSeen: 0, totalQuestions: 0 },
      categoryStats: { known: 0, total: 0 }
    });
  },

  // Set selected categories (called from CategorySelection on save)
  setSelectedCategories: (cats) => {
    set({ selectedCategories: cats });
    // Immediately refresh category-scoped stats
    get().loadStats();
  },
  // Calls the new /api/preferences/language endpoint which clears stale
  // category filters, then reloads questions for the new language.
  switchLanguage: async (language) => {
    const { user } = get();
    apiClient.setLanguage(language);
    set({ language, currentIndex: 0, questions: [] });

    if (user?.telegram_id) {
      try {
        await apiClient.switchLanguage(language);
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
      const { selectedCategories, language } = get();
      const stats = await apiClient.getStats();
      set({ stats });
      saveToLocal('stats', stats);

      // Category-scoped stats for the topic counter (§3)
      if (selectedCategories.length > 0) {
        const catStats = await apiClient.getCategoryStats(selectedCategories);
        set({ categoryStats: catStats });
      } else {
        // No filter — topic counter mirrors global stats
        set({ categoryStats: { known: stats.known, total: stats.totalQuestions } });
      }
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
    
    try {
      const response = await apiClient.recordSwipe(questionId, status);
      if (response.streak) {
        set(s => ({
          stats: { 
            ...s.stats, 
            streak: response.streak.current, 
            longestStreak: response.streak.longest,
            streakIncreased: response.streak.increased
          }
        }));
      }
    } catch (err) {
      console.error('Swipe recording failed:', err);
    }

    if (direction === 'left') get().loadExplanation(questionId);
    if (get().questions.length - get().currentIndex <= 2) get().loadQuestions(true);
  },

  submitTestAnswer: async (questionId, answer) => {
    const response = await apiClient.submitTestAnswer(questionId, answer);
    const status = response.isCorrect ? 'known' : 'unknown';
    set(s => ({ stats: { ...s.stats, [status]: s.stats[status] + 1, totalSeen: s.stats.totalSeen + 1 } }));
    if (!response.isCorrect) get().loadExplanation(questionId);
    // Do NOT auto-advance — TestMode.handleNext() calls advanceQuestion() after
    // showing the green feedback, so the user actually sees it.
    if (get().questions.length - get().currentIndex <= 2) get().loadQuestions(true);
    return response;
  },

  submitBugHuntAnswer: async (questionId, answer) => {
    const response = await apiClient.submitBugHuntAnswer(questionId, answer);
    const status = response.isCorrect ? 'known' : 'unknown';
    set(s => ({ stats: { ...s.stats, [status]: s.stats[status] + 1, totalSeen: s.stats.totalSeen + 1 } }));
    if (!response.isCorrect) get().loadExplanation(questionId);
    // Do NOT auto-advance — BugHuntingMode shows feedback + "Следующая задача" button
    if (get().questions.length - get().currentIndex <= 2) get().loadQuestions(true);
    return response;
  },

  submitBlitzAnswer: async (questionId, answer, clientIsCorrect) => {
    // Increment score locally immediately — don't wait for server round-trip.
    // The server validates against AI data when available, otherwise trusts clientIsCorrect.
    if (clientIsCorrect) set(s => ({ blitzScore: s.blitzScore + 1 }));
    // Fire-and-forget to server for stats recording (don't await for UX)
    apiClient.submitBlitzAnswer(questionId, answer, clientIsCorrect).catch(() => { });
    if (get().questions.length - get().currentIndex <= 2) get().loadQuestions(true);
    return { isCorrect: clientIsCorrect };
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
    if (!response.isCorrect) get().loadExplanation(questionId);
    else set(s => ({ currentIndex: s.currentIndex + 1 }));
    if (get().questions.length - get().currentIndex <= 2) get().loadQuestions(true);
    return response;
  },

  // ─── Blitz ─────────────────────────────────────────────────────────
  startBlitz: () => {
    set({ blitzScore: 0, blitzTimeLeft: 60, isBlitzActive: true, blitzIdle: false, currentIndex: 0 });
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
    set({ learningMode: mode, currentIndex: 0, isBlitzActive: false, blitzTimeLeft: 60, blitzScore: 0, blitzIdle: true, interviewHistory: [] });
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

  // ─── AI generation ─────────────────────────────────────────────────
  fetchGeneration: async (type, questionId, _attempt = 0) => {
    const MAX_ATTEMPTS = 10;       // ~20s total at 2s intervals
    const POLL_INTERVAL_MS = 2000;

    const question = get().questions.find(q => q.id === questionId);
    if (!question) return;

    const typeMap = { test: 'options', bug: 'bugHuntingData', blitz: 'blitzData', code: 'codeCompletionData' };
    const dataKey = typeMap[type];

    // Bug 5 fix: terminal failure after MAX_ATTEMPTS — set a sentinel so the
    // component can show an error instead of spinning forever
    if (_attempt >= MAX_ATTEMPTS) {
      console.error(`fetchGeneration(${type}) exceeded ${MAX_ATTEMPTS} attempts for q=${questionId}`);
      set(state => ({
        questions: state.questions.map(q =>
          q.id === questionId
            ? { ...q, [dataKey]: { __error: true, message: 'AI generation timed out. Try switching to a different mode.' } }
            : q
        ),
      }));
      return;
    }

    try {
      // Pass questionId so the server includes it in the job payload for worker backfill
      const response = await apiClient.requestGeneration(
        type, question.question, question.shortAnswer, question.category, questionId
      );

      if (response.status === 'ready' && response.data) {
        set(state => ({
          questions: state.questions.map(q =>
            q.id === questionId
              ? {
                ...q,
                [dataKey]: response.data,
                // For test mode, also populate options array
                options: type === 'test' ? (Array.isArray(response.data) ? response.data : q.options) : q.options,
              }
              : q
          ),
        }));
        return response.data;
      }

      // Still pending — wait and retry
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      return get().fetchGeneration(type, questionId, _attempt + 1);
    } catch (err) {
      console.error(`fetchGeneration(${type}) attempt ${_attempt} failed:`, err.message);
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      return get().fetchGeneration(type, questionId, _attempt + 1);
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

  advanceQuestion: () => {
    set(s => ({ currentIndex: s.currentIndex + 1 }));
    if (get().questions.length - get().currentIndex <= 2) get().loadQuestions(true);
  },

  closeExplanation: () => {
    const { learningMode, currentIndex } = get();
    set({ showExplanation: false, currentExplanation: null });
    // bug-hunting: advance after wrong answer (component shows feedback then user taps next,
    // but we still advance here so the next question loads after modal closes)
    // test + code-completion: component calls advanceQuestion() itself — don't double-advance
    if (learningMode === 'bug-hunting') {
      set({ currentIndex: currentIndex + 1 });
    }
  },

  getCurrentQuestion: () => get().questions[get().currentIndex],
  hasMoreQuestions: () => get().currentIndex < get().questions.length,
}));

export default useStore;