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
import CategorySelection from './components/CategorySelection';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import LanguageSelection from './components/LanguageSelection';
import ReportSheet from './components/ReportSheet';
import Header from './components/Header';
import { SkeletonCard } from './components/Skeleton';
import QuestionCard from './components/QuestionCard';
import SwipeButtons from './components/SwipeButtons';
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
import { useTranslation } from 'react-i18next';
import i18n from './i18n/config';
import logger from './utils/logger';

const TracksScreenWrapper = ({ onStartTrack, onBack, onSkipToCategories }) => {
  const { tracks, loadTracks, language, setSelectedCategories, loadQuestions, setLearningMode } = useStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (tracks && tracks.length > 0) {
      setReady(true);
      return;
    }
    loadTracks().then(() => setReady(true)).catch(() => setReady(true));
  }, [language]);

  if (!ready) return <div className="app-loading"><SkeletonCard /></div>;

  if (tracks.length === 0) {
    setSelectedCategories([]);
    setLearningMode('swipe');
    onSkipToCategories();
    return null;
  }

  return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}>
    <TracksScreen onStartTrack={onStartTrack} onBack={onBack} onSkipToCategories={onSkipToCategories} />
  </Suspense>;
};

import DebugOverlay from './components/DebugOverlay';
import WebLogin from './components/WebLogin';
const Landing = lazy(() => import('./components/Landing'));
import DemoMode from './components/DemoMode';
import './App.css';

// Detect Telegram Mini App context.
// Check 1: initData from the Telegram SDK (most reliable — requires the SDK to have loaded)
// Check 2: URL params that Telegram injects synchronously (fallback for edge cases)
function detectContext() {
  const tg = window.Telegram?.WebApp;
  if (tg?.initData || tg?.initDataUnsafe?.user) return 'telegram';
  const params = new URLSearchParams(window.location.search);
  if (params.has('tgWebAppData') || params.has('tgWebAppPlatform') || params.has('tgWebAppVersion')) return 'telegram';
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
  useEffect(() => {
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

  const handleCategoryDone = () => {
    loadQuestions();
    setScreen('main');
  };

   const handleLanguageChange = (newLang) => {
    switchLanguage(newLang);
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
  // Export progress as JSON/CSV
  const exportProgress = async () => {
    try {
      const language = useStore.getState().language;
      window.open(`/api/progress/export?language=${language}&format=json`, '_blank');
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
      <div className="app-loading">
        <p style={{ fontSize: 16, fontWeight: 600 }}>{t('auth.startup_error')}</p>
        <p style={{ fontSize: 11, opacity: 0.6, marginTop: 8, textAlign: 'center', padding: '0 24px' }}>{authError}</p>
        <button
          onClick={() => window.location.reload()}
          style={{ marginTop: 20, padding: '12px 24px', borderRadius: 12, background: '#5c7cfa', color: '#fff', border: 'none', fontSize: 15, cursor: 'pointer' }}
        >
          {t('auth.restart')}
        </button>
      </div>
    );
  }

  if (screen === 'onboarding') return <Onboarding onStart={handleOnboardingDone} />;
  if (screen === 'language') return <LanguageSelection onSelect={() => setScreen('tracks')} />;
  if (screen === 'tracks') return <TracksScreenWrapper
    onStartTrack={(id) => { setCurrentTrackId(id); setScreen('track-detail'); }}
    onBack={() => setScreen('language')}
    onSkipToCategories={() => { setScreen('main'); setLearningMode('swipe'); loadQuestions({ mode: 'swipe' }); }}
  />;
if (screen === 'track-detail') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><TrackDetail trackId={currentTrackId} onStart={() => { useStore.getState().startTrack(currentTrackId); setScreen('main'); }} onBack={() => setScreen('tracks')} /></Suspense>;
   if (screen === 'companies') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><CompaniesScreen onBack={() => setScreen('main')} /></Suspense>;
   if (screen === 'category') return <CategorySelection onComplete={handleCategoryDone} onBack={() => setScreen('language')} />;
  if (screen === 'resume') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><ResumeAnalyzer onBack={() => setScreen('main')} onStartPractice={() => { useStore.getState().setLearningMode('swipe'); setScreen('main'); }} /></Suspense>;
  if (screen === 'vacancy') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><VacancyPrep onBack={() => setScreen('main')} /></Suspense>;
  if (screen === 'trends') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><MarketTrends onBack={() => setScreen('main')} /></Suspense>;
  if (screen === 'subscriptions') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><SubscriptionPlans onBack={() => setScreen('main')} /></Suspense>;
  if (screen === 'admin') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><AdminPanel onBack={() => setScreen('main')} /></Suspense>;
  if (screen === 'saved') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><SavedQuestions onBack={() => setScreen('main')} onUpgrade={() => setScreen('subscriptions')} /></Suspense>;
   if (screen === 'progress') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><ProgressScreen onBack={() => setScreen('main')} onReview={() => setScreen('review')} onUpgrade={() => setScreen('subscriptions')} onSavedClick={() => setScreen('saved')} /></Suspense>;
   if (screen === 'review') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><ReviewMode onBack={() => setScreen('progress')} onUpgrade={() => setScreen('subscriptions')} /></Suspense>;
if (screen === 'achievements') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><AchievementScreen onBack={() => setScreen('main')} /></Suspense>;
  if (screen === 'profile') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><ProfileScreen onBack={() => setScreen('main')} onSettingsClick={() => setScreen('language')} /></Suspense>;
   if (screen === 'peer-interview') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><PeerInterviewScreen onBack={() => setScreen('main')} /></Suspense>;
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
       case 'swipe':
         if (isLoadingQuestions) return <SkeletonCard />;

         if (!hasMoreQuestions()) {
           // If the feed is exhausted but there are still known cards,
           // show the refresher/completion screen. If there are zero
           // questions at all, redirect to language/category selection
           // so the user can still use the app.
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
            {questions.slice(currentIndex, currentIndex + 3).map((q, index) => (
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
                  />
                ) : (
                  <div className="card-peek-shell" />
                )}
              </div>
            ))}
          </div>
        );
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
          onSettingsClick={() => setScreen('language')}
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
         />
      <div className="card-container">
        <Suspense fallback={<SkeletonCard />}>
          {renderMode()}
        </Suspense>
      </div>

      <ProNudge onOpenSubscription={() => setScreen('subscriptions')} />

      {learningMode === 'swipe' && (
        <SwipeButtons
          onSwipeLeft={() => handleButtonSwipe('left')}
          onSwipeRight={() => handleButtonSwipe('right')}
          disabled={!hasMoreQuestions() || isLoadingQuestions}
        />
      )}
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
          isOpen={useStore.getState().trackComplete}
          onClose={() => useStore.setState({ trackComplete: false, currentCertificate: null })}
          certificate={useStore.getState().currentCertificate}
        />
      </Suspense>
      <MissedPanel />
      <DebugOverlay visible={debugOpen} onClose={() => setDebugOpen(false)} />
    </div>
  );
}

export default App;