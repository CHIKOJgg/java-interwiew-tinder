import { create } from 'zustand';
import apiClient from '../api/client';
import logger from '../utils/logger';

const CACHE_KEY = 'interview_tinder_cache';
function saveToLocal(key, data) { try { localStorage.setItem(`${CACHE_KEY}_${key}`, JSON.stringify(data)); } catch { /* ignore */ } }
function loadFromLocal(key) { try { return JSON.parse(localStorage.getItem(`${CACHE_KEY}_${key}`)); } catch { return null; } }

function saveToSession(key, data) { try { sessionStorage.setItem(`${CACHE_KEY}_${key}`, JSON.stringify(data)); } catch { /* ignore */ } }
function loadFromSession(key) { try { return JSON.parse(sessionStorage.getItem(`${CACHE_KEY}_${key}`)); } catch { return null; } }

// One generation run per question/mode. A global polling token used to cancel
// every other prefetch as soon as the next question started loading.
const generationRuns = new Map();

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
// Smart deck: ids of questions the user already saw this session (across all
// modes), persisted per user per day. Mode switches exclude them so the same
// card never pops up again immediately.
function seenStorageKey(userId) { return `${CACHE_KEY}_seen_${userId || 'guest'}_${todayKey()}`; }
function loadSeenIds(userId) { return loadFromSession(seenStorageKey(userId)) || []; }
function saveSeenIds(userId, ids) { saveToSession(seenStorageKey(userId), ids); }
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

function getTheme() {
  try { return localStorage.getItem(`${CACHE_KEY}_theme`) || 'light'; } catch { return 'light'; }
}
function saveTheme(theme) {
  try { localStorage.setItem(`${CACHE_KEY}_theme`, theme); } catch { /* ignore */ }
}

// Restore persisted token to apiClient on module load
const _savedToken = loadFromSession('token');
if (_savedToken) apiClient.setToken(_savedToken);

const useStore = create((set, get) => ({
  user: null,
  token: _savedToken,
  isAuthenticated: !!_savedToken,
  isLoading: true,
  language: 'Java',
  theme: getTheme(),

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
  // Smart deck: ids of questions shown this session (across modes).
  sessionSeen: [],
  // Local fallback distractors for Test mode (other questions' short answers)
  // so tests render instantly while real AI options are still generating.
  distractorPool: [],

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

  // ─── Achievements ─────────────────────────────────────────────────
  // Fetched from GET /api/badges; array of { key, name, icon, description, unlocked }.
  badges: null,
  isLoadingBadges: false,

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
  isGeneratingQuestions: false,

  showExplanation: false,
  currentExplanation: null,
  isLoadingExplanation: false,
  // Set when a free user hits the daily AI-explanation cap — the modal shows
  // a Pro upsell instead of an explanation.
  aiLimitReached: null,
  // Once the user dismisses the AI-limit upsell, keep it from re-popping on
  // every subsequent tap within the same session (reduce upsell fatigue).
  aiLimitDismissed: false,

  // ─── Polling cancellation ──────────────────────────────────
  // Each poll is tagged with a request ID. When a new poll starts
  // for the same key, the old one is cancelled so stale responses
  // never update state after the user has moved on.
  _pollRequestId: 0,

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
      const { user, token, tracks: initTracks, stats: initStats } = response;
      const lang = user.language || 'Java';
      apiClient.setToken(token);
      apiClient.setLanguage(lang);
      if (initData) apiClient.setInitData(initData);

        saveToSession('token', token);
        const tracksCacheKey = `tracks_${lang}`;
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          language: lang,
          availableModes: user.available_modes || ['swipe', 'test'],
          availableLanguages: user.available_languages || ['Java', 'Python', 'TypeScript'],
          tracks: initTracks || [],
          tracksCache: { [tracksCacheKey]: { tracks: initTracks || [], timestamp: Date.now() } },
          stats: initStats || { known: 0, unknown: 0, totalSeen: 0, totalQuestions: 0, streak: 0, longestStreak: 0 },
        });
         logger.info('Store: login ok', `plan=${user.plan || 'free'}`, `modes=${(user.available_modes || []).join(',')}`);

        // Background: load questions + saved + daily — stats + tracks already bundled in login
        get().loadQuestions().catch(() => {});
        get().initDaily();
        get().loadSaved().catch(() => {});

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
  // Also accepts optional full response with tracks/stats bundled.
  loginWithToken: (user, token, extras) => {
    const lang = user.language || 'Java';
    apiClient.setToken(token);
    apiClient.setLanguage(lang);
    apiClient.setUserId(user.telegram_id);
    saveToSession('token', token);
    const initTracks = extras?.tracks || [];
    const initStats = extras?.stats || null;
    const tracksCacheKey = `tracks_${lang}`;
    set({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
      language: lang,
      availableModes: user.available_modes || ['swipe', 'test'],
      availableLanguages: user.available_languages || ['Java', 'Python', 'TypeScript'],
      tracks: initTracks,
      tracksCache: { [tracksCacheKey]: { tracks: initTracks, timestamp: Date.now() } },
      ...(initStats ? { stats: initStats } : {}),
    });
    get().loadQuestions().catch(console.error);
    if (!initStats) get().loadStats();
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
    apiClient.clearAuth();
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
      sessionSeen: [],
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

  // ─── Achievements / badges ────────────────────────────────────────
  loadBadges: async () => {
    set({ isLoadingBadges: true });
    try {
      const data = await apiClient.getBadges();
      set({ badges: data?.badges || [], isLoadingBadges: false });
    } catch {
      set({ badges: [], isLoadingBadges: false });
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
    const cacheKey = `tracks_${language}`;
    const cachedTracks = get().tracksCache[cacheKey]?.tracks || [];
    set(state => ({
      language,
      currentIndex: 0,
      questions: [],
      hasMore: true,
      feedCursor: 0,
      feedSeed: '',
      selectedCategories: [],
      selectedDifficulties: [],
      selectedCompany: null,
      _loadingLock: false,
      isLoadingQuestions: false,
      tracks: cachedTracks,
      tracksCache: { ...state.tracksCache, [cacheKey]: state.tracksCache[cacheKey] || null },
    }));

    if (user?.telegram_id) {
      apiClient.switchLanguage(language).catch((err) => {
        console.error('Language preference save failed:', err);
      });
    }

    // Eagerly load tracks for the new language if not already cached
    if (!cachedTracks.length) {
      get().loadTracks().catch(() => {});
    }
    return 'category';
  },

  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    saveTheme(next);
    set({ theme: next });
  },

  // ─── Interface language (ru/en) ────────────────────────────────────
  // Switching the UI language also switches the question pool language:
  // the feed is filtered server-side by `lng`, so stale cards must go.
  setInterfaceLanguage: async (lng) => {
    const { default: i18n } = await import('../i18n/config');
    if (i18n.language === lng) return;
    await i18n.changeLanguage(lng);
    set({
      questions: [],
      currentIndex: 0,
      hasMore: true,
      feedCursor: 0,
      feedSeed: '',
      feedRefresher: false,
      _loadingLock: false,
      isLoadingQuestions: false,
    });
    get().loadQuestions().catch(() => {});
    get().loadDistractors(true).catch(() => {});
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
      // Smart deck: don't re-serve questions already shown this session
      // (across modes). Cap the exclude list so the URL stays small — the
      // server caps it too, and the refresher fills with known cards after
      // the fresh pool is exhausted.
      const userId = get().user?.telegram_id;
      const seen = loadSeenIds(userId);
      const response = await apiClient.getQuestionsFeed(10, mode, {
        cursor: feedCursor,
        seed: feedSeed,
        difficulties: get().selectedDifficulties,
        company: get().selectedCompany,
        exclude: seen.slice(-300),
      });
      const newQs = response.questions || [];
      // Remember this page so the next load (any mode) skips it.
      if (newQs.length > 0) {
        const merged = [...new Set([...seen, ...newQs.map(q => q.id)])].slice(-500);
        saveSeenIds(userId, merged);
        set({ sessionSeen: merged });
      }
      // An empty page means the feed is exhausted — never treat an empty
      // page as "has more", otherwise loadQuestions(true) loops forever
      // appending zero questions (infinite deck / stuck UI).
      const hasMore = newQs.length > 0 && (response.meta?.hasMore ?? (newQs.length === 10));
       if (append) {
          set(s => ({
            questions: [...s.questions, ...newQs],
             feedCursor: response.meta?.nextCursor ?? (s.feedCursor + newQs.length),
            hasMore,
            feedRefresher: response.meta?.refresher ?? false,
            isLoadingQuestions: false,
            _loadingLock: false,
          }));
        } else {
          set({
            questions: newQs,
            currentIndex: 0,
             feedCursor: response.meta?.nextCursor ?? newQs.length,
            hasMore,
            feedRefresher: response.meta?.refresher ?? false,
            isLoadingQuestions: false,
            _loadingLock: false,
          });
        }
        logger.info(`Store: loadQuestions ok (append=${append})`, `count=${newQs.length}`, `hasMore=${hasMore}`, `refresher=${response.meta?.refresher ?? false}`);
        saveToLocal(`questions_${get().language}_${mode}`, newQs);
        if (['test', 'bug-hunting', 'blitz', 'code-completion'].includes(mode)) {
          get().primeModeData().catch(() => {});
        }
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
        const cached = loadFromLocal(`questions_${get().language}_${get().learningMode}`);
        if (cached?.length > 0) {
          logger.warn('Store: feed failed, using local cache', `count=${cached.length}`);
          set({ questions: cached, currentIndex: 0, feedCursor: cached.length, hasMore: false, isLoadingQuestions: false, _loadingLock: false });
          return;
        }
      }
      logger.error('Store: loadQuestions failed', error.message);
      set({ isLoadingQuestions: false, _loadingLock: false, hasMore: false });
    }
  },

  // ─── Test distractors (instant fallback options) ────────────────────
  // Top up the local pool of other questions' short answers so Test mode can
  // render options instantly while real AI options generate in background.
  loadDistractors: async (force = false) => {
    const { distractorPool, language } = get();
    if (!force && distractorPool.length >= 30) return;
    try {
      const data = await apiClient.getDistractors(language);
      const fresh = data.distractors || [];
      const known = new Set(distractorPool.map(d => d.id));
      const merged = [...distractorPool, ...fresh.filter(d => d?.id && !known.has(d.id))].slice(-120);
      set({ distractorPool: merged });
    } catch (err) {
      logger.warn('Store: loadDistractors failed', err.message);
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
     if (!q) return;
     logger.debug(`Store: swipe ${direction} (${status}) q=${questionId}`);
     const prevIndex = get().currentIndex;
     const prevStats = { ...get().stats };
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
       set({ currentIndex: prevIndex, stats: prevStats });
       return;
     }

     if (direction === 'left' && get().learningMode === 'swipe' && q) {
        get().openMissed(q);
      }
      get().bumpDaily();
      if (get().learningMode === 'swipe' && get().questions.length - get().currentIndex <= 5) get().loadQuestions(true);
   },

  undoSwipe: async (questionId, direction) => {
    const status = direction === 'right' ? 'known' : 'unknown';
    set(s => ({
      stats: {
        ...s.stats,
        [status]: Math.max(0, s.stats[status] - 1),
        totalSeen: Math.max(0, s.stats.totalSeen - 1),
      },
      currentIndex: Math.max(0, s.currentIndex - 1),
    }));
    try {
      await apiClient.request(`/questions/swipe/${questionId}`, { method: 'DELETE' });
    } catch (err) {
      logger.error('Store: undo swipe failed', err.message);
    }
    if (direction === 'left') {
      get().closeMissed();
    }
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
    if (get().questions.length - get().currentIndex <= 5) get().loadQuestions(true);
    get().ensureGenerationQueue(3).catch(() => {});
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
    if (get().questions.length - get().currentIndex <= 5) get().loadQuestions(true);
    get().ensureGenerationQueue(3).catch(() => {});
    return response;
  },

  submitBlitzAnswer: async (questionId, answer, clientIsCorrect) => {
    // Increment score locally immediately — don't wait for server round-trip.
    // The server validates against AI data when available, otherwise trusts clientIsCorrect.
    if (clientIsCorrect) set(s => ({ blitzScore: s.blitzScore + 1 }));
    get().bumpDaily();
    // Fire-and-forget to server for stats recording (don't await for UX)
    apiClient.submitBlitzAnswer(questionId, answer, clientIsCorrect).catch(() => { });
    if (get().questions.length - get().currentIndex <= 5) get().loadQuestions(true);
    get().ensureGenerationQueue(3).catch(() => {});
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
    if (get().questions.length - get().currentIndex <= 5) get().loadQuestions(true);
    get().ensureGenerationQueue(3).catch(() => {});
    return response;
  },

  // ─── Blitz ─────────────────────────────────────────────────────────
  startBlitz: () => {
    set({ blitzScore: 0, blitzTimeLeft: 60, isBlitzActive: true, blitzIdle: false, currentIndex: 0 });
    get().loadQuestions();
  },
  stopBlitz: () => set({ isBlitzActive: false }),
  endBlitzEarly: () => set({ isBlitzActive: false, blitzTimeLeft: 0 }),
  decrementBlitzTime: () => set(s => {
    const t = s.blitzTimeLeft - 1;
    return t <= 0 ? { blitzTimeLeft: 0, isBlitzActive: false } : { blitzTimeLeft: t };
  }),

  // ─── Mode switching ────────────────────────────────────────────────
  // True when the current user is allowed to use the given learning mode.
  canAccessMode: (mode) => {
    const { user } = get();
    if (!user) return true; // not loaded yet — don't block the default flow
    if (user.plan === 'admin' || user.plan === 'pro' || user.plan === 'annual_pro' || user.plan === 'pro_max') return true;
    const modes = get().availableModes || user.available_modes || ['swipe', 'test'];
    return modes.includes(mode);
  },

  isPro: () => {
    const { user } = get();
    return !!user && (user.plan === 'pro' || user.plan === 'annual_pro' || user.plan === 'pro_max' || user.plan === 'admin');
  },

  // Re-read billing state after a payment or cancellation and sync the store
  // in-session (works for Telegram AND web auth — no initData required).
  refreshSubscription: async () => {
    try {
      const info = await apiClient.getBillingInfo();
      const plan = info?.plan || 'free';
      const { user } = get();
      if (!user) return info;
      const isPaid = plan === 'pro' || plan === 'annual_pro' || plan === 'pro_max' || plan === 'admin';
      const current = user?.plan;
      const normalized = plan === 'annual_pro' ? 'pro' : plan;
      if (current === normalized) return info;
      if (isPaid) {
        const proModes = ['swipe', 'test', 'bug-hunting', 'blitz', 'mock-interview', 'concept-linker', 'code-completion', 'system-design', 'review', 'peer-interview'];
        const proLangs = ['Java', 'Python', 'TypeScript', 'Go', 'Rust', 'React', 'Kotlin'];
        set({
          user: { ...user, plan: normalized },
          availableModes: proModes,
          availableLanguages: proLangs,
        });
      } else {
        const freeModes = ['swipe', 'test', 'system-design'];
        // Free plan: 3 core languages (matches the subscription_plans row).
        const freeLangs = ['Java', 'Python', 'TypeScript'];
        set({
          user: { ...user, plan: 'free' },
          availableModes: freeModes,
          availableLanguages: freeLangs,
        });
      }
      logger.info('Store: subscription refreshed', `plan=${plan}`);
      return info;
    } catch (err) {
      logger.error('Store: refreshSubscription failed', err.message);
      return null;
    }
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
  generateResumeQuestions: async (resumeData) => {
    set({ isGeneratingQuestions: true });
    try {
      const response = await apiClient.generateResumeQuestions(resumeData);
      set({ isGeneratingQuestions: false });
      return response.questions;
    } catch (err) {
      set({ isGeneratingQuestions: false });
      throw err;
    }
  },

  prepareVacancy: async (vacancyText) => {
    set({ isAnalyzingResume: true });
    try {
      const response = await apiClient.prepareVacancy(vacancyText);
      set({ isAnalyzingResume: false });
      return response;
    } catch (err) {
      set({ isAnalyzingResume: false });
      throw err;
    }
  },

  // ─── AI generation ─────────────────────────────────────────────────
  // True when the question already has usable per-mode data (options for
  // test, bugHuntingData / blitzData / codeCompletionData for the rest).
  hasModeData: (question, type) => {
    if (!question) return false;
    if (type === 'test') {
      const opts = question.options;
      return Array.isArray(opts) && opts.length > 0 && !opts.__error;
    }
    const data = question[
      type === 'bug' ? 'bugHuntingData'
        : type === 'blitz' ? 'blitzData'
          : 'codeCompletionData'
    ];
    return Boolean(data) && !data.__error;
  },

  applyGenerationData: (type, questionId, data) => {
    const dataKey = { test: 'options', bug: 'bugHuntingData', blitz: 'blitzData', code: 'codeCompletionData' }[type];
    if (!dataKey) return;
    set(state => ({
      questions: state.questions.map(q => q.id === questionId
        ? {
          ...q,
          [dataKey]: type === 'test'
            ? (Array.isArray(data) ? data : data?.options || q.options)
            : data,
        }
        : q),
    }));
  },

  primeModeData: async () => {
    await get().ensureGenerationQueue(3);
  },

  // Generation pipeline keeps the deck topped up: whenever the user answers
  // or advances, make sure the next `keep` questions (including the current
  // one if it's still missing data) already have their mode data ready or are
  // being generated — the user never has to stare at a "generating" card.
  ensureGenerationQueue: async (keep = 3) => {
    const { learningMode, questions, currentIndex } = get();
    const typeMap = {
      test: 'test',
      'bug-hunting': 'bug',
      blitz: 'blitz',
      'code-completion': 'code',
    };
    const type = typeMap[learningMode];
    if (!type) return;

    const missing = questions
      .slice(currentIndex, currentIndex + keep + 2)
      .filter(q => q?.id && !get().hasModeData(q, type))
      .slice(0, keep);
    if (!missing.length) return;

    try {
      const batch = await apiClient.requestGenerationBatch(type, missing.map(q => q.id));
      for (const item of batch.items || []) {
        if (!item) continue;
        if (item.status === 'ready' && item.data) {
          get().applyGenerationData(type, item.questionId, item.data);
        } else if (item.status !== 'not_found') {
          get().fetchGeneration(type, item.questionId).catch(() => {});
        }
      }
    } catch (error) {
      logger.warn('Store: generation queue prefetch failed', error.message);
    }
  },

  fetchGeneration: async (type, questionId, _attempt = 0) => {
    // Generous budget: OpenRouter free tier + queue can take minutes per job.
    // Even after the active budget expires we keep a slow background watcher,
    // so a slow provider finishing late still lands the data (the __error
    // sentinel only shows once the watcher gives up too).
    const MAX_ATTEMPTS = 80;         // 80 × 3s ≈ 4 min of active polling
    const POLL_INTERVAL_MS = 3000;
    const TAIL_ATTEMPTS = 40;        // 40 × 15s ≈ 10 more min in background
    const TAIL_INTERVAL_MS = 15000;
    const key = `${type}:${questionId}`;
    if (_attempt === 0 && generationRuns.has(key)) return generationRuns.get(key);

    const typeMap = { test: 'options', bug: 'bugHuntingData', blitz: 'blitzData', code: 'codeCompletionData' };
    const dataKey = typeMap[type];
    const question = get().questions.find(q => q.id === questionId);
    if (!question || !dataKey) return null;

    if (_attempt === 0) {
      set(state => ({
        questions: state.questions.map(q => q.id === questionId ? { ...q, [dataKey]: null } : q),
      }));
    }

    const applyData = (data) => {
      get().applyGenerationData(type, questionId, data);
    };

    const run = (async () => {
      for (let attempt = _attempt; attempt < MAX_ATTEMPTS; attempt += 1) {
        try {
          const response = await apiClient.requestGeneration(
            type, question.question, question.shortAnswer, question.category, questionId,
          );
          if (response.status === 'ready' && response.data) {
            applyData(response.data);
            return response.data;
          }
        } catch (err) {
          logger.warn(`fetchGeneration(${type}) attempt ${attempt} failed`, err.message);
        }
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      // Active budget spent — surface a retriable error, but keep watching in
      // the background so late answers still replace the error instead of
      // being lost (the UI shows "Retry / Skip" while this runs). Release the
      // dedup lock first so a manual Retry starts a fresh active poll.
      set(state => ({
        questions: state.questions.map(q => q.id === questionId
          ? { ...q, [dataKey]: { __error: true, message: 'AI generation is taking longer than usual. It may still be in progress — retry in a moment.' } }
          : q),
      }));
      generationRuns.delete(key);

      for (let attempt = 0; attempt < TAIL_ATTEMPTS; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, TAIL_INTERVAL_MS));
        try {
          const response = await apiClient.requestGeneration(
            type, question.question, question.shortAnswer, question.category, questionId,
          );
          if (response.status === 'ready' && response.data) {
            applyData(response.data);
            return response.data;
          }
        } catch (err) {
          logger.warn(`fetchGeneration(${type}) tail attempt ${attempt} failed`, err.message);
        }
      }

      set(state => ({
        questions: state.questions.map(q => q.id === questionId
          ? { ...q, [dataKey]: { __error: true, message: 'AI generation timed out. Try again.' } }
          : q),
      }));
      return null;
    })();

    generationRuns.set(key, run);
    run.finally(() => generationRuns.delete(key));
    return run;
  },

  // ─── Explanation ───────────────────────────────────────────────────
  loadExplanation: async (questionId, _attempt = 0) => {
    const pollId = ++get()._pollRequestId;
    set({ isLoadingExplanation: true, showExplanation: true });
    try {
      const response = await apiClient.getExplanation(questionId);
      if (pollId !== get()._pollRequestId) return;
      if (response.status === 'pending' && _attempt < 8) {
        await new Promise(r => setTimeout(r, 1500));
        if (pollId !== get()._pollRequestId) return;
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
    if (get().questions.length - get().currentIndex <= 5 && get().hasMore) get().loadQuestions(true);
    get().ensureGenerationQueue(3).catch(() => {});
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
  tracksCache: {},
  currentTrack: null,
  trackComplete: false,
  currentCertificate: null,
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

  loadTracks: async (force = false) => {
    const { language, tracksCache } = get();
    const cacheKey = `tracks_${language}`;
    const cached = tracksCache[cacheKey];
    if (!force && cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      set({ tracks: cached.tracks });
      return;
    }
    try {
      const data = await apiClient.getTracks(language);
      const tracks = data.tracks || [];
      set(s => ({
        tracks,
        tracksCache: { ...s.tracksCache, [cacheKey]: { tracks, timestamp: Date.now() } },
      }));
    } catch (err) {
      logger.error('Failed to load tracks:', err.message);
    }
  },

  startTrack: async (trackId) => {
    set({ currentTrack: trackId, learningMode: 'track', trackComplete: false, currentIndex: 0, questions: [] });
    try {
      const { question } = await apiClient.getNextTrackQuestion(trackId);
      if (question) {
        set({ questions: [question] });
        return;
      }
      // No question: either the track is already completed or it has no steps
      // (questions for this language not seeded yet). A 0-step track would be
      // a dead end — mark it complete so it's never stuck.
      const track = await apiClient.getTrack(trackId);
      if (track?.completed) return;
      if (track && (track.totalSteps || 0) === 0) {
        await get().advanceTrack();
      }
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
        let certificate = null;
        try {
          const certResult = await apiClient.generateCertificate(currentTrack, `Track ${currentTrack}`, result.score || 100);
          certificate = certResult;
        } catch { /* certificate generation failed, show modal without cert data */ }
        set({ trackComplete: true, currentCertificate: certificate });
      } else {
        const { question } = await apiClient.getNextTrackQuestion(currentTrack);
        if (question) {
          set(s => ({ questions: [...s.questions, question], currentIndex: s.currentIndex + 1 }));
        }
      }
      return result;
    } catch (err) {
      logger.error('Failed to advance track:', err.message);
      throw err;
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

// Register 401 handler on apiClient (clean, no circular dynamic imports)
apiClient.onUnauthorized = () => { useStore.getState().logout(); };

export default useStore;
