// Lazy load heavy/optional components
import { lazy, Suspense, useState, useRef, useEffect } from 'react';
const MockInterviewMode = lazy(() => import('./components/MockInterviewMode'));
const ResumeAnalyzer = lazy(() => import('./components/ResumeAnalyzer'));
const VacancyPrep = lazy(() => import('./components/VacancyPrep'));
const MarketTrends = lazy(() => import('./components/MarketTrends'));
const SubscriptionPlans = lazy(() => import('./components/SubscriptionPlans'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const ReviewMode = lazy(() => import('./components/ReviewMode'));
const ProgressScreen = lazy(() => import('./components/ProgressScreen'));
const SavedQuestions = lazy(() => import('./components/SavedQuestions'));
const AchievementScreen = lazy(() => import('./components/AchievementScreen'));
const TracksScreen = lazy(() => import('./components/TracksScreen'));
const TrackDetail = lazy(() => import('./components/TrackDetail'));
const CompaniesScreen = lazy(() => import('./components/CompaniesScreen'));
const PeerInterviewScreen = lazy(() => import('./components/PeerInterviewScreen'));
const ProfileScreen = lazy(() => import('./components/ProfileScreen'));
const TopQuestionsScreen = lazy(() => import('./components/TopQuestionsScreen'));
import CategorySelection from './components/CategorySelection';
import QuickFilterBar from './components/QuickFilterBar';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import LanguageSelection from './components/LanguageSelection';
import ReportSheet from './components/ReportSheet';
import Header from './components/Header';
import { SkeletonCard } from './components/Skeleton';
import QuestionCard from './components/QuestionCard';
import ExplanationModal from './components/ExplanationModal';
import ShareCard from './components/ShareCard';
import TestMode from './components/TestMode';
import BugHuntingMode from './components/BugHuntingMode';
import BlitzMode from './components/BlitzMode';
import ConceptLinker from './components/ConceptLinker';
import CodeCompletionMode from './components/CodeCompletionMode';
import SystemDesignMode from './components/SystemDesignMode';
const TrackMode = lazy(() => import('./components/LearningModes/TrackMode'));
const PlaygroundMode = lazy(() => import('./components/LearningModes/PlaygroundMode'));
const CertificateModal = lazy(() => import('./components/CertificateModal'));
import DeckComplete from './components/DeckComplete';
import PaywallModal from './components/PaywallModal';
import ProNudge from './components/ProNudge';
import Onboarding, { ONBOARD_KEY } from './components/Onboarding';
import MissedPanel from './components/MissedPanel';
import useStore from './store/useStore';
import apiClient from './api/client';
import { useTranslation } from 'react-i18next';
import i18n from './i18n/config';
import logger from './utils/logger';

const TracksScreenWrapper = ({ onStartTrack, onBack, onSkipToCategories }) => {
  const { tracks, loadTracks, language, setSelectedCategories, loadQuestions, setLearningMode, user } = useStore();
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadTracks(true).then(() => setReady(true)).catch(() => setReady(true));
  }, [language]);

  useEffect(() => {
    if (ready && tracks.length === 0) {
      setSelectedCategories([]);
      if (typeof setLearningMode === 'function') {
        setLearningMode('swipe');
      }
      onSkipToCategories();
    }
  }, [ready, tracks]);
  if (!ready) return <div className="app-loading"><SkeletonCard /></div>;
  if (tracks.length === 0) return <div className="app-loading"><div className="empty-deck"><p style={{ fontSize: 18, fontWeight: 600 }}>{t('tracks.empty_title', 'Треков пока нет')}</p><p style={{ textAlign: 'center', opacity: 0.6, maxWidth: 320, marginTop: 8 }}>{t('tracks.empty_desc', 'Выберите другой язык или попробуйте позже.')}</p><button className="start-button" onClick={onBack} style={{ marginTop: 16 }}>{t('tracks.choose_lang', 'Выбрать язык')}</button></div></div>;

  return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}>
    <TracksScreen onStartTrack={onStartTrack} onBack={onBack} onSkipToCategories={onSkipToCategories} />
  </Suspense>;
};

import DebugScreen from './components/DebugScreen';
import WebLogin from './components/WebLogin';
const Landing = lazy(() => import('./components/Landing'));
import DemoMode from './components/DemoMode';
import Settings from './components/Settings';
import './App.css';

// Detect Telegram Mini App context.
// Check 1: initData from the Telegram SDK (most reliable)
// Check 2: URL params Telegram injects
function detectContext() {
  const tg = window.Telegram?.WebApp;
  if (tg?.initData || tg?.initDataUnsafe?.user) return 'telegram';
  const params = new URLSearchParams(window.location.search);
  if (params.has('tgWebAppData') || params.has('tgWebAppPlatform') || params.has('tgWebAppVersion')) return 'telegram';
  if (window.location.hash.includes('tgWebAppData')) return 'telegram';
  return 'web';
}

function getTelegramInitData() {
  const raw = window.Telegram?.WebApp?.initData;
  if (raw) return raw;
  const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (user) return `user=${JSON.stringify(user)}`;
  throw new Error(i18n.t('app.initdata_empty'));
}

// Wait for Telegram initData (max 1s). The SDK script is loaded in index.html,
// but initData may take a brief moment to populate in some Telegram clients.
async function waitForTelegramSdk() {
  const tg = window.Telegram?.WebApp;
  if (tg?.initData) return tg.initData;
  if (tg?.initDataUnsafe?.user) return `user=${JSON.stringify(tg.initDataUnsafe.user)}`;
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 100));
    const t = window.Telegram?.WebApp;
    if (t?.initData) return t.initData;
    if (t?.initDataUnsafe?.user) return `user=${JSON.stringify(t.initDataUnsafe.user)}`;
  }
  throw new Error(i18n.t('app.initdata_empty'));
}

function App() {
  const {
    questions, currentIndex,
    showExplanation, currentExplanation, isLoadingExplanation,
    isLoadingQuestions,
    login, loginWithToken, swipeCard, undoSwipe, closeExplanation, hasMoreQuestions, loadQuestions,
    learningMode,
    switchLanguage,
    stats,
    closePaywall,
    feedRefresher, dismissRefresher,
    playgroundQuestion, setPlaygroundQuestion,
    trackComplete, currentCertificate,
  } = useStore();
  const { t } = useTranslation();

  const context = detectContext();
  const [isWeb, setIsWeb] = useState(context === 'web');
  const [initState, setInitState] = useState(context === 'telegram' ? 'starting' : 'landing');
  const [screen, setScreen] = useState('language');
  const [authError, setAuthError] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [reportingQuestionId, setReportingQuestionId] = useState(null);
  const [currentTrackId, setCurrentTrackId] = useState(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [undoInfo, setUndoInfo] = useState(null);
  const undoTimerRef = useRef(null);
  // When the user re-opens the onboarding from the help button, "done" should
  // return them to the app (not back to language selection).
  const onboardingReopen = useRef(false);

  const cardRefs = useRef([]);

  // Expose Sentry to the logger so errors/warnings can be reported from
  // anywhere (logger mirrors to console + Sentry). Set in main.jsx.
  useEffect(() => {
    try {
      const Sentry = window.__JIT_SENTRY__;
      if (Sentry) {
        Sentry.getCurrentScope && Sentry.getCurrentScope().setTag && Sentry.getCurrentScope().setTag('debug_overlay', 'available');
      }
    } catch { /* noop */ }
  }, []);

  // Toggle the on-screen debug overlay. In Telegram WebApp there is no F12, so
  // we open it via a long-press (Telegram fires `contextmenu` on long-press) or
  // 5 quick taps anywhere on the app shell (ignoring interactive controls).
  // Dev-only: the debug UI exposes auth internals and must never ship to prod.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let pressTimer = null;
    const taps = [];

    const shouldIgnore = (el) => {
      if (!el) return false;
      return !!el.closest('button, a, input, textarea, .debug-overlay, [data-no-debug-toggle]');
    };

    const open = () => {
      setDebugOpen((o) => {
        logger.info(`DebugOverlay: ${o ? 'closed' : 'opened'}`);
        return !o;
      });
    };

    const onContextMenu = (e) => {
      if (shouldIgnore(e.target)) return;
      e.preventDefault();
      open();
    };

    const onPointerDown = (e) => {
      if (shouldIgnore(e.target)) return;
      pressTimer = setTimeout(() => {
        pressTimer = null;
        open();
      }, 600);
    };

    const onPointerUp = (e) => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      if (shouldIgnore(e.target)) return;
      const now = Date.now();
      taps.push(now);
      while (taps.length && now - taps[0] > 1200) taps.shift();
      if (taps.length >= 5) {
        taps.length = 0;
        open();
      }
    };

    window.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      if (pressTimer) clearTimeout(pressTimer);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
    };
   }, []);

  // Open the report sheet when a card's report flag is tapped. The flag
  // dispatches a CustomEvent because the card is deep in the component tree.
  useEffect(() => {
    const onReport = (e) => setReportingQuestionId(e.detail);
    window.addEventListener('report-question', onReport);
    return () => window.removeEventListener('report-question', onReport);
  }, []);

  // ─── Initialization ────────────────────────────────────────────────
  // Runs once on mount. In Telegram context: wait for SDK + login, then go
  // to tracks/onboarding.  In web context: stay on landing — never touch
  // Telegram auth.  The context never changes after mount, so this effect
  // has no dependencies.
  useEffect(() => {
    if (context === 'web') return;
    let cancelled = false;

    const startApp = async () => {
      try {
        const initData = await waitForTelegramSdk();
        if (cancelled) return;
        const tg = window.Telegram?.WebApp;
        let referralId = null;
        if (tg?.initDataUnsafe?.start_param) {
          referralId = tg.initDataUnsafe.start_param;
        }
        await login(initData, referralId);
        if (cancelled) return;
        setInitState('ready');
        setScreen(localStorage.getItem(ONBOARD_KEY) ? 'tracks' : 'onboarding');
      } catch (err) {
        if (cancelled) return;
        setAuthError(err.message);
        setInitState('error');
      }
    };

    startApp();
    return () => { cancelled = true; };
  }, []);

  // Safety net: if in swipe/card-based mode and questions buffer is empty while hasMore is true, fetch them!
  useEffect(() => {
    if (initState !== 'ready') return;
    if (['swipe', 'test', 'bug-hunting', 'blitz', 'code-completion'].includes(learningMode)) {
      if (questions.length === 0 && !isLoadingQuestions && hasMoreQuestions()) {
        loadQuestions().catch(() => {});
      }
    }
  }, [initState, learningMode, questions.length, isLoadingQuestions]);

  const handleCategoryDone = () => {
    useStore.getState().setLearningMode('swipe');
    loadQuestions();
    setScreen('main');
  };

   const handleLanguageChange = async (newLang) => {
     await switchLanguage(newLang);
     setScreen('category');
   };

  // Re-open the first-run explainer from the Header help button.
  const handleHelp = () => {
    onboardingReopen.current = true;
    setScreen('onboarding');
  };
  // Achievements screen
  const handleAchievements = () => {
    onboardingReopen.current = true;
    setScreen('achievements');
  };
  // Export progress as JSON/CSV. window.open cannot carry the Authorization
  // header, so download via an authenticated fetch + blob instead.
  const exportProgress = async () => {
    try {
      const language = useStore.getState().language;
      const format = 'json';
      const res = await fetch(
        `${apiClient.baseUrl}/progress/export?language=${encodeURIComponent(language)}&format=${format}`,
        { headers: apiClient.getAuthHeaders() }
      );
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `progress-${language}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };
  // After onboarding: return to the app if it was a re-open, else continue to
  // language selection (first-time flow).
  const handleOnboardingDone = () => {
    if (onboardingReopen.current) {
      onboardingReopen.current = false;
      setScreen('main');
    } else {
      setScreen('language');
    }
  };

  const handleUpgrade = () => {
    closePaywall();
    setScreen('subscriptions');
  };

  const handleSwipe = (direction) => {
    const q = questions[currentIndex];
    if (q) {
      swipeCard(q.id, direction);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      setUndoInfo({ questionId: q.id, direction, swipedAt: Date.now() });
      undoTimerRef.current = setTimeout(() => setUndoInfo(null), 3500);
    }
  };

  const handleUndo = async () => {
    if (!undoInfo) return;
    if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null; }
    await undoSwipe(undoInfo.questionId, undoInfo.direction);
    setUndoInfo(null);
  };

  const handleButtonSwipe = (direction) => {
    cardRefs.current[0]?.swipe?.(direction);
  };

   if (initState === 'starting') {
    return (
      <div className="app-loading">
        <SkeletonCard />
        <p style={{ textAlign: 'center', opacity: 0.5, marginTop: 16 }}>{t('auth.connecting')}</p>
      </div>
    );
  }

if (initState === 'landing') {
     return (
       <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}>
         <Landing onStart={() => setInitState('demo')} onLogin={() => setInitState('web_login')} />
       </Suspense>
     );
   }

  if (initState === 'demo') {
    const tg = window.Telegram?.WebApp;
    const urlRef = new URLSearchParams(window.location.search).get('ref');
    const referralId = tg?.initDataUnsafe?.start_param || urlRef || null;
    return (
      <DemoMode
        referralId={referralId}
        onSignup={() => setInitState('web_login')}
        onExit={() => setInitState('landing')}
      />
    );
  }

  if (initState === 'web_login') {
    const tg = window.Telegram?.WebApp;
    // Referral: from Telegram start_param OR from ?ref= in the URL (web/PWA share links).
    const urlRef = new URLSearchParams(window.location.search).get('ref');
    const referralId = tg?.initDataUnsafe?.start_param || urlRef || null;
    return (
      <WebLogin
        referralId={referralId}
        onBack={() => setInitState('landing')}
        onAuthenticated={(user, token, res) => {
          loginWithToken(user, token, res);
          if (localStorage.getItem(ONBOARD_KEY)) setScreen('tracks');
          else setScreen('onboarding');
          setInitState('ready');
        }}
      />
    );
  }
  if (initState === 'error') {
    return (
      <div className="app-loading" style={{ maxWidth: 380, margin: '0 auto', padding: 24 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          border: '2.5px solid var(--ink)', background: 'var(--coral-soft, #ffe7e2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26
        }}>
          ⚠️
        </div>
        <p style={{ fontSize: 18, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', margin: '8px 0 0' }}>
          {t('auth.startup_error', 'Сбой запуска')}
        </p>
        <p style={{ fontSize: 12, opacity: 0.75, textAlign: 'center', margin: '4px 0 16px', lineHeight: 1.5 }}>
          {authError}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
          <button
            className="start-button"
            onClick={() => window.location.reload()}
            type="button"
          >
            {t('auth.restart', 'Перезапустить')}
          </button>
          <button
            className="start-button ghost"
            onClick={() => setInitState('demo')}
            type="button"
            style={{ background: 'var(--cream2)', border: '2px solid var(--ink)', color: 'var(--ink)' }}
          >
            {t('demo.title', 'Открыть демо-режим')}
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'onboarding') return <Onboarding onStart={handleOnboardingDone} />;
  if (screen === 'language') return <LanguageSelection onSelect={() => setScreen('tracks')} />;
  if (screen === 'tracks') return <TracksScreenWrapper
    onStartTrack={(id) => { setCurrentTrackId(id); setScreen('track-detail'); }}
    onBack={() => setScreen('language')}
    onSkipToCategories={() => { useStore.getState().setLearningMode('swipe'); setScreen('main'); loadQuestions(); }}
  />;
if (screen === 'track-detail') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><TrackDetail trackId={currentTrackId} onStart={() => { useStore.getState().startTrack(currentTrackId); setScreen('main'); }} onBack={() => setScreen('tracks')} /></Suspense>;
   if (screen === 'companies') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><CompaniesScreen onBack={() => setScreen('main')} /></Suspense>;
   if (screen === 'category') return <CategorySelection onComplete={handleCategoryDone} onBack={() => setScreen('main')} onOpenTopQuestions={() => setScreen('top-questions')} />;
  if (screen === 'resume') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><ResumeAnalyzer onBack={() => setScreen('main')} onStartPractice={() => { useStore.getState().setLearningMode('swipe'); setScreen('main'); }} /></Suspense>;
  if (screen === 'vacancy') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><VacancyPrep onBack={() => setScreen('main')} /></Suspense>;
  if (screen === 'trends') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><MarketTrends onBack={() => setScreen('main')} /></Suspense>;
  if (screen === 'subscriptions') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><SubscriptionPlans onBack={() => setScreen('main')} /></Suspense>;
  if (screen === 'admin') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><AdminPanel onBack={() => setScreen('main')} /></Suspense>;
  if (screen === 'saved') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><SavedQuestions onBack={() => setScreen('main')} onUpgrade={() => setScreen('subscriptions')} /></Suspense>;
   if (screen === 'progress') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><ProgressScreen onBack={() => setScreen('main')} onReview={() => setScreen('review')} onUpgrade={() => setScreen('subscriptions')} onSavedClick={() => setScreen('saved')} /></Suspense>;
   if (screen === 'review') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><ReviewMode onBack={() => setScreen('progress')} onUpgrade={() => setScreen('subscriptions')} /></Suspense>;
if (screen === 'achievements') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><AchievementScreen onBack={() => setScreen('main')} /></Suspense>;
   if (screen === 'profile') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><ProfileScreen onBack={() => setScreen('main')} onSettingsClick={() => setScreen('settings')} /></Suspense>;
   if (screen === 'settings') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><Settings onBack={() => setScreen('main')} onNavigate={(s) => setScreen(s)} onExport={exportProgress} onHelp={handleHelp} /></Suspense>;
   if (screen === 'top-questions') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><TopQuestionsScreen onBack={() => setScreen('main')} onPractice={() => setScreen('main')} /></Suspense>;
   if (screen === 'peer-interview') {
     if (!useStore.getState().canAccessMode('peer-interview')) {
       return (
         <div className="app-loading" style={{ minHeight: '70vh', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 12, padding: 24, display: 'flex', flexDirection: 'column' }}>
           <p style={{ fontSize: 18, fontWeight: 600 }}>{t('peer.locked_title', 'Live interviews are part of Pro Max')}</p>
           <p style={{ opacity: 0.6, maxWidth: 320 }}>{t('peer.locked_desc', 'Practice 1-on-1 with real people, get instant AI feedback and a full mock interview room — upgrade to Pro Max to unlock live sessions.')}</p>
           <button className="start-button" style={{ marginTop: 8 }} onClick={() => setScreen('subscriptions')}>
             {t('peer.upgrade', 'See Pro Max plans')}
           </button>
           <button className="ghost-btn" style={{ marginTop: 4 }} onClick={() => setScreen('main')}>
             {t('common.back', 'Back')}
           </button>
         </div>
       );
     }
     return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><PeerInterviewScreen onBack={() => setScreen('main')} /></Suspense>;
   }
   if (playgroundQuestion) return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><PlaygroundMode initialCode={playgroundQuestion.code} onBack={() => setPlaygroundQuestion(null)} /></Suspense>;

   const emptyDeck = () => (
     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, padding: 24 }}>
       <p style={{ fontSize: 18, fontWeight: 600 }}>{t('demo.no_questions', 'No questions available yet.')}</p>
       <p style={{ textAlign: 'center', opacity: 0.6, maxWidth: 320 }}>{t('demo.no_questions_desc', 'Select a different language or category to get started.')}</p>
       <button className="start-button" onClick={() => setScreen('language')} style={{ marginTop: 8 }}>
         {t('common.go_back', 'Choose Language')}
       </button>
     </div>
   );

   const renderMode = () => {
    switch (learningMode) {
       case 'swipe': {
          if (isLoadingQuestions) return <SkeletonCard />;

          const visibleCards = questions.slice(currentIndex, currentIndex + 3);

          if (visibleCards.length === 0) {
            // Buffer is empty. If more questions are available, show loading card while fetching
            if (hasMoreQuestions() && !isLoadingQuestions) {
              return (
                <div className="card-stack" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                  <SkeletonCard />
                </div>
              );
            }
            if (questions.length === 0) {
              return (
                <div className="card-stack" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, padding: 24 }}>
                  <p style={{ fontSize: 18, fontWeight: 600 }}>{t('demo.no_questions', 'No questions available yet.')}</p>
                  <p style={{ textAlign: 'center', opacity: 0.6, maxWidth: 320 }}>{t('demo.no_questions_desc', 'Select a different language or category to get started.')}</p>
                  <button className="start-button" onClick={() => setScreen('language')} style={{ marginTop: 8 }}>
                    {t('common.go_back', 'Choose Language')}
                  </button>
                </div>
              );
            }
            return (
              <DeckComplete
                onChooseOther={() => setScreen('language')}
                onShare={() => setShowShare(true)}
              />
            );
          }

          return (
            <div className="card-stack">
              {feedRefresher && !isLoadingQuestions && (
                <div className="refresher-banner">
                  <span>🎉 {t('refresher.banner', 'You\'ve covered all new questions — these are refreshers to lock it in.')}</span>
                  <button onClick={dismissRefresher} type="button" aria-label="dismiss">✕</button>
                </div>
              )}
              {visibleCards.map((q, index) => (
                <div
                  key={q.id}
                  className={`card-wrapper ${index > 0 ? 'card-behind' : ''}`}
                  style={{ zIndex: 3 - index }}
                >
                  {index === 0 ? (
                    <QuestionCard
                      ref={el => (cardRefs.current[0] = el)}
                      question={q}
                      onSwipe={handleSwipe}
                      canSwipe={true}
                      onSwipeLeft={() => handleButtonSwipe('left')}
                      onSwipeRight={() => handleButtonSwipe('right')}
                      swipeDisabled={!hasMoreQuestions() || isLoadingQuestions}
                    />
                  ) : (
                    <div className="card-peek-shell" />
                  )}
                </div>
              ))}
            </div>
          );
        }
       case 'test':
         if (!hasMoreQuestions()) {
           if (questions.length === 0) return emptyDeck();
           return <DeckComplete onChooseOther={() => setScreen('language')} onShare={() => setShowShare(true)} />;
         }
         return <TestMode />;
       case 'bug-hunting':
         if (!hasMoreQuestions()) {
           if (questions.length === 0) return emptyDeck();
           return <DeckComplete onChooseOther={() => setScreen('language')} onShare={() => setShowShare(true)} />;
         }
         return <BugHuntingMode />;
       case 'blitz': return <BlitzMode />;
       case 'system-design': return <SystemDesignMode />;
       case 'mock-interview': return <Suspense fallback={<SkeletonCard />}><MockInterviewMode /></Suspense>;
       case 'concept-linker':
         if (!hasMoreQuestions()) {
           if (questions.length === 0) return emptyDeck();
           return <DeckComplete onChooseOther={() => setScreen('language')} onShare={() => setShowShare(true)} />;
         }
         return <ConceptLinker />;
       case 'code-completion':
         if (!hasMoreQuestions()) {
           if (questions.length === 0) return emptyDeck();
           return <DeckComplete onChooseOther={() => setScreen('language')} onShare={() => setShowShare(true)} />;
         }
         return <CodeCompletionMode />;
      case 'track':
        return <Suspense fallback={<SkeletonCard />}><TrackMode onBack={() => setScreen('tracks')} /></Suspense>;
       default:
         if (questions.length === 0) return emptyDeck();
         return <TestMode />;
    }
  };

  return (
    <div className={`app ${learningMode === 'swipe' ? 'swipe-mode' : ''}`}>
      <PwaInstallPrompt show={isWeb && (stats?.totalSeen || 0) >= 10} />
<Header
          onSettingsClick={() => setScreen('settings')}
          onTrackClick={() => setScreen('tracks')}
          onResumeClick={() => setScreen('resume')}
          onVacancyClick={() => setScreen('vacancy')}
          onTrendsClick={() => setScreen('trends')}
          onSubscriptionClick={() => setScreen('subscriptions')}
         onLanguageChange={handleLanguageChange}
         onAdminClick={() => setScreen('admin')}
         onProgressClick={() => setScreen('progress')}
         onHelpClick={handleHelp}
         onExportClick={exportProgress}
         onAchievementsClick={() => setScreen('achievements')}
         onProfileClick={() => setScreen('profile')}
         onPeerInterviewClick={() => setScreen('peer-interview')}
         onCompaniesClick={() => setScreen('companies')}
         onTopClick={() => setScreen('top-questions')}
         onFilterClick={() => setScreen('category')}
         />
      {['swipe', 'test', 'bug-hunting', 'blitz', 'code-completion'].includes(learningMode) && (
        <QuickFilterBar onOpenFilters={() => setScreen('category')} />
      )}
      <div className="card-container">
        <Suspense fallback={<SkeletonCard />}>
          {renderMode()}
        </Suspense>
      </div>

      <ProNudge onOpenSubscription={() => setScreen('subscriptions')} />

      {undoInfo && (
        <div className="undo-bar">
          <button className="undo-btn" onClick={handleUndo} type="button">
            ↩ {t('card.undo', 'Undo')}
          </button>
        </div>
      )}
      <ExplanationModal
        isOpen={showExplanation}
        explanation={currentExplanation}
        isLoading={isLoadingExplanation}
        onClose={closeExplanation}
        onUpgrade={() => setScreen('subscriptions')}
      />
      {showShare && (
        <ShareCard 
          stats={stats} 
          onBack={() => setShowShare(false)} 
        />
      )}
      {reportingQuestionId && (
        <ReportSheet 
          questionId={reportingQuestionId} 
          onClose={() => setReportingQuestionId(null)} 
        />
      )}
      <PaywallModal onUpgrade={handleUpgrade} />
      <Suspense fallback={null}>
        <CertificateModal
          isOpen={trackComplete}
          onClose={() => useStore.setState({ trackComplete: false, currentCertificate: null })}
          certificate={currentCertificate}
        />
      </Suspense>
      <MissedPanel />
      {import.meta.env.DEV && (
        <button type="button" className="debug-fab" onClick={() => setDebugOpen(true)} title="Debug">Debug</button>
      )}
      {import.meta.env.DEV && debugOpen && <DebugScreen onClose={() => setDebugOpen(false)} />}
    </div>
  );
}

export default App;
