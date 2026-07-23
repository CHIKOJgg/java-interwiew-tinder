import { create } from 'zustand';
import apiClient from '../api/client';
import logger from '../utils/logger';

const CACHE_KEY = 'interview_tinder_cache';
function saveToLocal(key, data) { try { localStorage.setItem(`${CACHE_KEY}_${key}`, JSON.stringify(data)); } catch { /* ignore */ } }
function loadFromLocal(key) { try { return JSON.parse(localStorage.getItem(`${CACHE_KEY}_${key}`)); } catch { return null; } }

function saveToSession(key, data) { try { sessionStorage.setItem(`${CACHE_KEY}_${key}`, JSON.stringify(data)); } catch { /* ignore */ } }
function loadFromSession(key) { try { return JSON.parse(sessionStorage.getItem(`${CACHE_KEY}_${key}`)); } catch { return null; } }

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function loadDaily() {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}_daily`);
    if (!raw) return { date: todayKey(), count: 0 };
    const parsed = JSON.parse(raw);
    if (parsed.date !== todayKey()) return { date: todayKey(), count: 0 };
    return parsed;
  } catch { return { date: todayKey(), count: 0 }; }
}
function saveDaily(count) {
  try { localStorage.setItem(`${CACHE_KEY}_daily`, JSON.stringify({ date: todayKey(), count })); } catch { /* ignore */ }
}

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
  hasMore: true,
  feedCursor: 0,
  feedSeed: '',
  // True when the feed ran out of new/due questions and topped up with already
  // known cards for review — lets the UI show a "you've covered everything" note.
  feedRefresher: false,
  learningMode: 'swipe',

  // ─── Paywall ───────────────────────────────────────────────────────
  // Populated from the server's `user.available_modes` on login.
  paywall: { open: false, mode: null },
  // Set of dismissed subtle nudges so we don't nag the same user repeatedly.
  dismissedNudges: [],

  stats: { known: 0, unknown: 0, totalSeen: 0, totalQuestions: 0, streak: 0, longestStreak: 0 },
  // Selected categories and per-category progress (§3)
  selectedCategories: [],
  categoryStats: { known: 0, total: 0 },
  // Difficulty filter (Junior / Middle / Senior) — empty = all difficulties.
  selectedDifficulties: [],
  // Company filter — null = all companies.
  selectedCompany: null,

  // ─── Saved / bookmarked questions ────────────────────────────────
  savedIds: {},          // { [questionId]: true }
  savedQuestions: [],

  // ─── Daily goal ────────────────────────────────────────────────────
  // A reason to come back every day. Counts questions answered today
  // (resets at local midnight) and compares against a small daily goal.
  dailyGoal: 20,
  todaySeen: 0,
  dailyDone: false,

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
  // Set when a free user hits the daily AI-explanation cap — the modal shows
  // a Pro upsell instead of an explanation.
  aiLimitReached: null,
  // Once the user dismisses the AI-limit upsell, keep it from re-popping on
  // every subsequent tap within the same session (reduce upsell fatigue).
  aiLimitDismissed: false,

  // ─── Missed ("don't know") sheet ──────────────────────────────────
  // Populated when the user swipes left in swipe mode so we can show the
  // short answer + a one-tap AI explanation instead of silently advancing.
  missed: null,
  showMissed: false,
  openMissed: (question) => set({ missed: question, showMissed: true }),
  closeMissed: () => set({ showMissed: false, missed: null }),

  // ─── Auth ──────────────────────────────────────────────────────────
  login: async (initData, referralId) => {
    try {
      logger.info('Store: login start', referralId ? `referral=${referralId}` : '');
      set({ isLoading: true });
      const response = await apiClient.login(initData, referralId);
      const { user, token } = response;
      const lang = user.language || 'Java';
      apiClient.setLanguage(lang);

      saveToSession('token', token);
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        language: lang,
        availableModes: user.available_modes || ['swipe', 'test'],
        availableLanguages: user.available_languages || ['Java', 'Python', 'TypeScript'],
      });
       logger.info('Store: login ok', `plan=${user.plan || 'free'}`, `modes=${(user.available_modes || []).join(',')}`);

       await get().loadQuestions();
       get().loadStats();
       get().initDaily();
       get().loadSaved();

       // Migrate zero-login demo answers (if any) into the new account.
       import('../utils/guestProgress').then(({ takeGuestProgress }) => {
         const items = takeGuestProgress(lang);
         if (items.length) {
           apiClient.importProgress(items).catch(() => { /* non-fatal */ });
         }
       });
       return user;
    } catch (error) {
      set({ isLoading: false, _loadingLock: false });
      logger.error('Store: login failed', error.message);
      throw error;
    }
  },

  // Web providers (Google / email): the API already returned user+token.
  loginWithToken: (user, token) => {
    const lang = user.language || 'Java';
    apiClient.setLanguage(lang);
    apiClient.setUserId(user.telegram_id);
    saveToSession('token', token);
    set({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
      language: lang,
      availableModes: user.available_modes || ['swipe', 'test'],
      availableLanguages: user.available_languages || ['Java', 'Python', 'TypeScript'],
    });
    get().loadQuestions().catch(console.error);
    get().loadStats();
    get().initDaily();
    get().loadSaved();

    // Migrate zero-login demo answers into the new account so the funnel
    // doesn't discard the visitor's work. Fire-and-forget: never blocks login.
    import('../utils/guestProgress').then(({ takeGuestProgress }) => {
      const items = takeGuestProgress(lang);
      if (items.length) {
        import('../api/client').then(({ default: client }) =>
          client.importProgress(items).catch(() => { /* non-fatal */ })
        );
      }
    });
    return user;
  },

  logout: () => {
    sessionStorage.removeItem(`${CACHE_KEY}_token`);
    // Only clear our own keys from localStorage to avoid nuking other app data
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_KEY)) {
        localStorage.removeItem(key);
      }
    });
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

  // Set difficulty filter (Junior / Middle / Senior); empty = all.
  setSelectedDifficulties: (diffs) => {
    set({ selectedDifficulties: diffs });
  },

  // Set company filter — null = all companies.
  setSelectedCompany: (company) => {
    set({ selectedCompany: company });
  },

  // ─── Saved / bookmarked questions ─────────────────────────────────
  loadSaved: async () => {
    try {
      const { questions } = await apiClient.getSavedQuestions();
      set({
        savedQuestions: questions,
        savedIds: Object.fromEntries(questions.map(q => [q.id, true])),
      });
    } catch {
      // Non-critical — bookmarks just won't show as saved.
    }
  },
  toggleSave: async (questionId, question) => {
    const saved = !!get().savedIds[questionId];
    // Optimistic toggle so the heart flips instantly.
    set(s => ({
      savedIds: { ...s.savedIds, [questionId]: !saved },
      savedQuestions: saved
        ? s.savedQuestions.filter(q => q.id !== questionId)
        : (s.savedQuestions.some(q => q.id === questionId) ? s.savedQuestions : [...s.savedQuestions, question || { id: questionId }]),
    }));
    try {
      if (saved) await apiClient.unsaveQuestion(questionId);
      else await apiClient.saveQuestion(questionId);
    } catch {
      // Revert on failure
      set(s => ({
        savedIds: { ...s.savedIds, [questionId]: saved },
        savedQuestions: saved
          ? (s.savedQuestions.some(q => q.id === questionId) ? s.savedQuestions : [...s.savedQuestions, question || { id: questionId }])
          : s.savedQuestions.filter(q => q.id !== questionId),
      }));
    }
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
    // No point fetching more once the backend reported the end of the feed.
    if (append && !get().hasMore) return;
    const mode = get().learningMode;
    let { feedCursor, feedSeed } = get();
    if (!append) {
      feedCursor = 0;
      feedSeed = Math.random().toString(36).slice(2);
    }
    logger.debug(`Store: loadQuestions start (append=${append}, mode=${mode}, cursor=${feedCursor})`);
    set({ _loadingLock: true, isLoadingQuestions: !append });
    try {
      const response = await apiClient.getQuestionsFeed(5, mode, { cursor: feedCursor, seed: feedSeed, difficulties: get().selectedDifficulties, company: get().selectedCompany });
      const newQs = response.questions || [];
      // An empty page means the feed is exhausted — never treat an empty
      // page as "has more", otherwise loadQuestions(true) loops forever
      // appending zero questions (infinite deck / stuck UI).
      const hasMore = newQs.length > 0 && (response.meta?.hasMore ?? (newQs.length === 5));
       if (append) {
          set(s => ({
            questions: [...s.questions, ...newQs],
            feedCursor: s.feedCursor + newQs.length,
            hasMore,
            feedRefresher: response.meta?.refresher ?? false,
            isLoadingQuestions: false,
            _loadingLock: false,
          }));
        } else {
          set({
            questions: newQs,
            currentIndex: 0,
            feedCursor: newQs.length,
            hasMore,
            feedRefresher: response.meta?.refresher ?? false,
            isLoadingQuestions: false,
            _loadingLock: false,
          });
        }
       logger.info(`Store: loadQuestions ok (append=${append})`, `count=${newQs.length}`, `hasMore=${hasMore}`, `refresher=${response.meta?.refresher ?? false}`);
       saveToLocal(`questions_${mode}`, newQs);
    } catch (error) {
      if (error?.feature === 'mode') {
        // Server rejected this mode (shouldn't happen — UI guards first, but
        // this is the safety net). Bounce the user back to a free mode.
        if (get().learningMode !== 'swipe') {
          get().requestPaywall(get().learningMode);
          set({ learningMode: 'swipe', currentIndex: 0, questions: [], isLoadingQuestions: false, _loadingLock: false });
          return;
        }
      }
      if (!append) {
        const cached = loadFromLocal(`questions_${get().learningMode}`);
        if (cached?.length > 0) {
          logger.warn('Store: feed failed, using local cache', `count=${cached.length}`);
          set({ questions: cached, currentIndex: 0, feedCursor: cached.length, hasMore: false, isLoadingQuestions: false, _loadingLock: false });
          return;
        }
      }
      logger.error('Store: loadQuestions failed', error.message);
      set({ isLoadingQuestions: false, _loadingLock: false });
    }
  },

  // ─── Daily goal ─────────────────────────────────────────────────────
  initDaily: () => {
    const { count } = loadDaily();
    set({ todaySeen: count, dailyDone: count >= get().dailyGoal });
  },
  // Count one (or n) answered questions toward today's goal.
  bumpDaily: (n = 1) => {
    const next = get().todaySeen + n;
    saveDaily(next);
    set({ todaySeen: next, dailyDone: next >= get().dailyGoal });
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
    const q = get().questions[get().currentIndex];
    logger.debug(`Store: swipe ${direction} (${status}) q=${questionId}`);
    set(s => ({
      stats: { ...s.stats, [status]: s.stats[status] + 1, totalSeen: s.stats.totalSeen + 1 },
      currentIndex: s.currentIndex + 1,
    }));

    try {
      const response = await apiClient.recordSwipe(questionId, status);
      if (response.streak) {
        get().applyStreak(response.streak);
      }
    } catch (err) {
      logger.error('Store: swipe recording failed', err.message);
    }

    // Swipe left ("don't know") in swipe mode now opens the learning sheet
    // with the short answer + a one-tap AI explanation — instead of silently
    // advancing and leaving the user with nothing.
    if (direction === 'left' && get().learningMode === 'swipe' && q) {
      get().openMissed(q);
    }
    get().bumpDaily();
    if (get().questions.length - get().currentIndex <= 2) get().loadQuestions(true);
  },

  reportQuestion: async (questionId, reason, comment) => {
    try {
      await apiClient.reportQuestion(questionId, reason, comment);
    } catch (err) {
      console.error('Failed to report question:', err);
      throw err;
    }
  },

  submitTestAnswer: async (questionId, answer) => {
    const response = await apiClient.submitTestAnswer(questionId, answer);
    const status = response.isCorrect ? 'known' : 'unknown';
    set(s => ({ stats: { ...s.stats, [status]: s.stats[status] + 1, totalSeen: s.stats.totalSeen + 1 } }));
    if (response.streak) get().applyStreak(response.streak);
    get().bumpDaily();
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
    if (response.streak) get().applyStreak(response.streak);
    get().bumpDaily();
    if (!response.isCorrect) get().loadExplanation(questionId);
    // Do NOT auto-advance — BugHuntingMode shows feedback + "Следующая задача" button
    if (get().questions.length - get().currentIndex <= 2) get().loadQuestions(true);
    return response;
  },

  submitBlitzAnswer: async (questionId, answer, clientIsCorrect) => {
    // Increment score locally immediately — don't wait for server round-trip.
    // The server validates against AI data when available, otherwise trusts clientIsCorrect.
    if (clientIsCorrect) set(s => ({ blitzScore: s.blitzScore + 1 }));
    get().bumpDaily();
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
    if (response.streak) get().applyStreak(response.streak);
    get().bumpDaily();
    // Do NOT auto-advance here — the component's "Next" handler calls
    // advanceQuestion() exactly once, mirroring TestMode/BugHunting. Advancing
    // here too would skip a question (and show the wrong card during feedback).
    if (!response.isCorrect) get().loadExplanation(questionId);
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
  // True when the current user is allowed to use the given learning mode.
  canAccessMode: (mode) => {
    const { user } = get();
    if (!user) return true; // not loaded yet — don't block the default flow
    if (user.plan === 'admin' || user.plan === 'pro') return true;
    const modes = get().availableModes || user.available_modes || ['swipe', 'test'];
    return modes.includes(mode);
  },

  isPro: () => {
    const { user } = get();
    return !!user && (user.plan === 'pro' || user.plan === 'admin');
  },

  // Open the paywall for a locked feature instead of switching to it.
  requestPaywall: (mode) => set({ paywall: { open: true, mode } }),
  closePaywall: () => set({ paywall: { open: false, mode: null } }),

  // Persistent (per-session) dismissal of a subtle nudge.
  dismissNudge: (id) => set(s => ({ dismissedNudges: [...new Set([...s.dismissedNudges, id])] })),

  setLearningMode: (mode) => {
    // Block locked modes for free users and surface the upgrade prompt.
    if (!get().canAccessMode(mode)) {
      get().requestPaywall(mode);
      return;
    }
    const prevMode = get().learningMode;
    set({ learningMode: mode, currentIndex: 0, isBlitzActive: false, blitzTimeLeft: 60, blitzScore: 0, blitzIdle: true, interviewHistory: [] });
    if (mode === 'system-design') {
      set({
        learningMode: 'system-design',
        sdScreen: 'list',
        sdCurrentTopic: null,
        sdEvaluation: null,
        sdTopics: [],
        sdProgress: null,
        sdError: null,
        sdLimitReached: null,
      });
      get().loadSDTopics();
      return;
    }
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

    // Reset error state when starting a fresh attempt so the UI shows loading again
    if (_attempt === 0) {
      set(state => ({
        questions: state.questions.map(q =>
          q.id === questionId ? { ...q, [dataKey]: null } : q
        ),
      }));
    }

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
                // For test mode the AI returns { options: [...] }, so pull the
                // array out. Some cached payloads may already be a bare array.
                options: type === 'test'
                  ? (Array.isArray(response.data) ? response.data : (response.data?.options || q.options))
                  : q.options,
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
  loadExplanation: async (questionId, _attempt = 0) => {
    set({ isLoadingExplanation: true, showExplanation: true });
    try {
      const response = await apiClient.getExplanation(questionId);
      // Backend generates explanations asynchronously via the worker; when
      // it is not ready yet it returns { status: 'pending' }. Poll a few
      // times before giving up.
      if (response.status === 'pending' && _attempt < 8) {
        await new Promise(r => setTimeout(r, 1500));
        return get().loadExplanation(questionId, _attempt + 1);
      }
      set({
        currentExplanation: response.explanation ||
          '⚠️ Объяснение всё ещё генерируется. Попробуйте открыть его ещё раз через несколько секунд.',
        isLoadingExplanation: false,
      });
    } catch (err) {
      // Free users who hit the daily AI cap get a Pro upsell instead of an error.
      // After the first dismissal we show a lighter note so it stops nagging.
      if (err?.code === 'DAILY_AI_LIMIT') {
        const alreadyDismissed = get().aiLimitDismissed;
        set({
          isLoadingExplanation: false,
          currentExplanation: null,
          aiLimitReached: { used: err.used ?? null, limit: err.limit ?? null, light: alreadyDismissed },
        });
        return;
      }
      // Surface the real server error so the user (and you) can see what failed
      const detail = err?.message || 'Неизвестная ошибка';
      set({
        isLoadingExplanation: false,
        currentExplanation: `⚠️ Не удалось загрузить объяснение.\n\n**Причина:** ${detail}\n\nПроверьте OPENROUTER_API_KEY и OPENROUTER_MODEL в .env на сервере.`,
      });
    }
  },

  // Record a batch of correctly matched questions (Concept Linker). Each
  // correct term→definition match counts as "known" so the mode isn't silent
  // in the stats.
  recordLinkerMatches: async (questionIds) => {
    if (!questionIds?.length) return;
    set(s => ({
      stats: {
        ...s.stats,
        known: s.stats.known + questionIds.length,
        totalSeen: s.stats.totalSeen + questionIds.length,
      },
    }));
    get().bumpDaily(questionIds.length);
    await Promise.all(
      questionIds.map(id => apiClient.recordSwipe(id, 'known').catch(() => { })),
    );
  },

  advanceQuestion: () => {
    set(s => ({ currentIndex: s.currentIndex + 1 }));
    if (get().questions.length - get().currentIndex <= 2 && get().hasMore) get().loadQuestions(true);
  },

  closeExplanation: () => {
    set(s => ({ showExplanation: false, currentExplanation: null, aiLimitDismissed: s.aiLimitReached ? true : s.aiLimitDismissed, aiLimitReached: null }));
  },

  // Apply a streak payload returned by any answer endpoint so the Header flame
  // updates live (not just after a manual stats reload).
  applyStreak: (streak) => {
    if (!streak) return;
    set(s => ({
      stats: {
        ...s.stats,
        streak: streak.current,
        longestStreak: streak.longest,
        streakIncreased: streak.increased,
      },
    }));
  },

  dismissRefresher: () => set({ feedRefresher: false }),

  // ─── Review (mistakes) mode ────────────────────────────────────────
  reviewQuestions: [],
  currentReviewIndex: 0,
  isLoadingReview: false,
  reviewDone: false,

  // ─── Learning Tracks ─────────────────────────────────────────────
  tracks: [],
  currentTrack: null,
  trackComplete: false,

  // ─── System Design ──────────────────────────────────────────────
  sdTopics: [],
  sdCurrentTopic: null,
  sdEvaluation: null,
  sdIsEvaluating: false,
  sdProgress: null,
  sdScreen: 'list',
  sdError: null,
  sdLimitReached: null,

  loadSDTopics: async (difficulty) => {
    try {
      const data = await apiClient.getSDTopics(get().language, difficulty);
      set({ sdTopics: data.topics || [], sdError: null });
    } catch (err) {
      set({ sdError: err.message });
    }
  },

  loadSDTopicDetail: async (topicId) => {
    try {
      const data = await apiClient.getSDTopicDetail(topicId);
      set({ sdCurrentTopic: data, sdEvaluation: null, sdError: null, sdScreen: 'detail' });
    } catch (err) {
      set({ sdError: err.message });
    }
  },

  submitSDEvaluation: async (topicId, answer) => {
    set({ sdIsEvaluating: true, sdEvaluation: null, sdLimitReached: null });
    try {
      const data = await apiClient.evaluateSDAnswer(topicId, answer);
      set({ sdEvaluation: data.evaluation, sdIsEvaluating: false, sdScreen: 'result' });
      return data.evaluation;
    } catch (err) {
      set({ sdIsEvaluating: false });
      if (err.code === 'SD_DAILY_LIMIT') {
        set({ sdLimitReached: { used: err.used, limit: err.limit } });
      } else {
        set({ sdError: err.message });
      }
      throw err;
    }
  },

  loadSDProgress: async () => {
    try {
      const data = await apiClient.getSDProgress();
      set({ sdProgress: data, sdError: null });
    } catch (err) {
      set({ sdError: err.message });
    }
  },

  setSDScreen: (screen) => set({ sdScreen: screen, sdEvaluation: null }),

  setSDMode: () => {
    set({
      learningMode: 'system-design',
      sdScreen: 'list',
      sdCurrentTopic: null,
      sdEvaluation: null,
      sdTopics: [],
      sdProgress: null,
      sdError: null,
      sdLimitReached: null,
    });
    get().loadSDTopics();
  },

  // ─── Playground ──────────────────────────────────────────────────
  playgroundQuestion: null,
  setPlaygroundQuestion: (q) => set({ playgroundQuestion: q }),

  loadTracks: async () => {
    const { language } = get();
    try {
      const data = await apiClient.getTracks(language);
      set({ tracks: data.tracks || [] });
    } catch (err) {
      logger.error('Failed to load tracks:', err.message);
    }
  },

  startTrack: async (trackId) => {
    set({ currentTrack: trackId, learningMode: 'track', trackComplete: false, currentIndex: 0, questions: [] });
    try {
      const { question } = await apiClient.getNextTrackQuestion(trackId);
      if (question) set({ questions: [question] });
    } catch (err) {
      logger.error('Failed to start track:', err.message);
    }
  },

  advanceTrack: async () => {
    const { currentTrack } = get();
    if (!currentTrack) return;
    try {
      const result = await apiClient.advanceTrack(currentTrack);
      if (result.completed) {
        set({ trackComplete: true });
      } else {
        const { question } = await apiClient.getNextTrackQuestion(currentTrack);
        if (question) {
          set(s => ({ questions: [...s.questions, question], currentIndex: s.currentIndex + 1 }));
        }
      }
    } catch (err) {
      logger.error('Failed to advance track:', err.message);
    }
  },

  loadReviewQuestions: async () => {
    set({ isLoadingReview: true, reviewDone: false, currentReviewIndex: 0, reviewQuestions: [] });
    try {
      const { questions } = await apiClient.getWeakQuestions(50);
      set({ reviewQuestions: questions, isLoadingReview: false, reviewDone: questions.length === 0 });
    } catch (err) {
      console.error('Failed to load review questions:', err);
      set({ isLoadingReview: false, reviewDone: true });
    }
  },

  // direction 'right' => user now knows it (status: known),
  // 'left' => still weak (status: unknown, snoozed for later).
  reviewSwipe: async (questionId, direction) => {
    const status = direction === 'right' ? 'known' : 'unknown';
    try {
      await apiClient.recordSwipe(questionId, status);
      get().bumpDaily();
    } catch (err) {
      console.error('Review swipe failed:', err);
    }
    const nextIndex = get().currentReviewIndex + 1;
    if (nextIndex >= get().reviewQuestions.length) {
      set({ currentReviewIndex: nextIndex, reviewDone: true });
      get().loadStats();
    } else {
      set({ currentReviewIndex: nextIndex });
    }
  },

  resetReview: () => set({ reviewQuestions: [], currentReviewIndex: 0, reviewDone: false }),

  getCurrentQuestion: () => {
    const { questions, currentIndex } = get();
    if (currentIndex < 0 || currentIndex >= questions.length) return undefined;
    return questions[currentIndex];
  },
  hasMoreQuestions: () => get().currentIndex < get().questions.length || get().hasMore,
}));

// ─── Readiness (shared by Header + ProgressScreen) ──────────────────
// Blend of accuracy (known / answered) and coverage (known questions out of a
// sensible ~150-q "first milestone"). Weighted toward accuracy so the number
// feels earned rather than jumping to 60% after a handful of cards.
export function readinessFromStats(stats) {
  const known = stats.known || 0;
  const unknown = stats.unknown || 0;
  const answered = known + unknown;
  if (answered === 0) return { readiness: 0, tier: 'novice' };
  const accuracy = known / answered;                       // 0..1
  const coverage = Math.min(known / 150, 1);               // caps at 150 known
  const readiness = Math.round(100 * (0.6 * accuracy + 0.4 * coverage));
  const tier = readiness >= 80 ? 'ready' : readiness >= 50 ? 'confident' : readiness >= 25 ? 'building' : 'novice';
  return { readiness, tier };
}

// Global safety net: capture uncaught errors / unhandled promise rejections
// into the in-app logger so nothing is invisible inside Telegram WebApp.
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    logger.error('window.onerror:', e.message, e.filename ? `${e.filename}:${e.lineno}` : '');
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    logger.error('unhandledrejection:', r instanceof Error ? r.message : String(r));
  });
}

export default useStore;