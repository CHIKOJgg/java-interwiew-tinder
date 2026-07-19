// Lazy load heavy/optional components
import { lazy, Suspense, useState, useRef, useEffect } from 'react';
const MockInterviewMode = lazy(() => import('./components/MockInterviewMode'));
const ResumeAnalyzer = lazy(() => import('./components/ResumeAnalyzer'));
const SubscriptionPlans = lazy(() => import('./components/SubscriptionPlans'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const ReviewMode = lazy(() => import('./components/ReviewMode'));
const ProgressScreen = lazy(() => import('./components/ProgressScreen'));
const SavedQuestions = lazy(() => import('./components/SavedQuestions'));
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
import DeckComplete from './components/DeckComplete';
import PaywallModal from './components/PaywallModal';
import ProNudge from './components/ProNudge';
import Onboarding, { ONBOARD_KEY } from './components/Onboarding';
import MissedPanel from './components/MissedPanel';
import useStore from './store/useStore';
import { useTranslation } from 'react-i18next';
import i18n from './i18n/config';
import logger from './utils/logger';
import DebugOverlay from './components/DebugOverlay';
import WebLogin from './components/WebLogin';
import Landing from './components/Landing';
import './App.css';

function getTelegramInitData() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 80;

    const interval = setInterval(() => {
      attempts++;
      const tg = window.Telegram?.WebApp;

      if (!tg) {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(new Error(i18n.t('app.tg_not_loaded')));
        }
        return;
      }

      if (!tg._readyCalled) {
        tg._readyCalled = true;
        try { tg.ready(); } catch (e) { console.warn('tg.ready() failed:', e); }
        try { tg.expand(); } catch (e) { console.warn('tg.expand() failed:', e); }
      }

      if (tg.initData && tg.initData.length > 0) {
        clearInterval(interval);
        resolve(tg.initData);
        return;
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        reject(new Error(i18n.t('app.initdata_empty')));
      }
    }, 100);
  });
}

function App() {
  const {
    questions, currentIndex,
    showExplanation, currentExplanation, isLoadingExplanation,
    isLoadingQuestions,
    login, loginWithToken, swipeCard, closeExplanation, hasMoreQuestions, loadQuestions,
    learningMode,
    switchLanguage,
    stats,
    closePaywall,
    feedRefresher, dismissRefresher,
  } = useStore();
  const { t } = useTranslation();

  // Show the PWA install prompt only on web (not inside Telegram WebView,
  // where install is irrelevant) and only after the user has done a real
  // session worth of swipes.
  const isTelegram = !!window.Telegram?.WebApp?.initData;
  const showPwa = !isTelegram && (stats?.totalSeen || 0) >= 10;

  const [initState, setInitState] = useState('waiting_telegram');
  const [screen, setScreen] = useState('language');
  const [authError, setAuthError] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [reportingQuestionId, setReportingQuestionId] = useState(null);
  // On-screen debug overlay (no DevTools inside Telegram WebApp).
  const [debugOpen, setDebugOpen] = useState(false);
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

  useEffect(() => {
    const handleReport = (e) => setReportingQuestionId(e.detail);
    window.addEventListener('report-question', handleReport);
    return () => window.removeEventListener('report-question', handleReport);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const startApp = async () => {
      try {
        // Prefer Telegram Mini App if available.
        const initData = await getTelegramInitData().catch(() => null);
        if (initData) {
          const tg = window.Telegram?.WebApp;
          let referralId = null;
          if (tg?.initDataUnsafe?.start_param) {
            referralId = tg.initDataUnsafe.start_param;
          }
          setInitState('auth');
          await login(initData, referralId);
        } else {
          // Standalone web / PWA: show the public landing page first, then
          // the web login when the user clicks "Start free".
          setInitState('landing');
          return;
        }

        if (cancelled) return;
        setInitState('ready');
        // First-time users see a quick explainer before choosing a language.
        setScreen(localStorage.getItem(ONBOARD_KEY) ? 'language' : 'onboarding');
        loadQuestions().catch(console.error);
      } catch (err) {
        if (cancelled) return;
        console.error('Startup failed:', err);
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

  const handleLanguageChange = async (newLang) => {
    await switchLanguage(newLang);
    setScreen('category');
  };

  // Re-open the first-run explainer from the Header help button.
  const handleHelp = () => {
    onboardingReopen.current = true;
    setScreen('onboarding');
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
    if (q) swipeCard(q.id, direction);
  };

  const handleButtonSwipe = (direction) => {
    cardRefs.current[0]?.swipe?.(direction);
  };

  if (initState === 'waiting_telegram') {
    return (
      <div className="app-loading">
        <SkeletonCard />
        <p style={{ textAlign: 'center', opacity: 0.5, marginTop: 16 }}>{t('auth.connecting')}</p>
      </div>
    );
  }

  if (initState === 'auth') {
    return (
      <div className="app-loading">
        <SkeletonCard />
        <p style={{ textAlign: 'center', opacity: 0.5, marginTop: 16 }}>{t('auth.signing_in')}</p>
      </div>
    );
  }

  if (initState === 'landing') {
    return (
      <Landing onStart={() => setInitState('web_login')} />
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
        onAuthenticated={(user, token) => {
          loginWithToken(user, token);
          if (localStorage.getItem(ONBOARD_KEY)) setScreen('language');
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
  if (screen === 'language') return <LanguageSelection onSelect={() => setScreen('category')} />;
  if (screen === 'category') return <CategorySelection onComplete={handleCategoryDone} onBack={() => setScreen('language')} />;
  if (screen === 'resume') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><ResumeAnalyzer onBack={() => setScreen('main')} /></Suspense>;
  if (screen === 'subscriptions') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><SubscriptionPlans onBack={() => setScreen('main')} /></Suspense>;
  if (screen === 'admin') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><AdminPanel onBack={() => setScreen('main')} /></Suspense>;
  if (screen === 'saved') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><SavedQuestions onBack={() => setScreen('main')} onUpgrade={() => setScreen('subscriptions')} /></Suspense>;
  if (screen === 'progress') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><ProgressScreen onBack={() => setScreen('main')} onReview={() => setScreen('review')} onUpgrade={() => setScreen('subscriptions')} onSavedClick={() => setScreen('saved')} /></Suspense>;
  if (screen === 'review') return <Suspense fallback={<div className="app-loading"><SkeletonCard /></div>}><ReviewMode onBack={() => setScreen('progress')} onUpgrade={() => setScreen('subscriptions')} /></Suspense>;

  const renderMode = () => {
    switch (learningMode) {
      case 'swipe':
        // Swipe mode: show skeleton during load, completion screen when exhausted
        if (isLoadingQuestions) return <SkeletonCard />;

        if (!hasMoreQuestions()) {
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
        if (!hasMoreQuestions()) return <DeckComplete onChooseOther={() => setScreen('language')} onShare={() => setShowShare(true)} />;
        return <TestMode />;
      case 'bug-hunting':
        if (!hasMoreQuestions()) return <DeckComplete onChooseOther={() => setScreen('language')} onShare={() => setShowShare(true)} />;
        return <BugHuntingMode />;
      case 'blitz': return <BlitzMode />;
      case 'mock-interview': return <Suspense fallback={<SkeletonCard />}><MockInterviewMode /></Suspense>;
      case 'concept-linker':
        if (!hasMoreQuestions()) return <DeckComplete onChooseOther={() => setScreen('language')} onShare={() => setShowShare(true)} />;
        return <ConceptLinker />;
      case 'code-completion':
        if (!hasMoreQuestions()) return <DeckComplete onChooseOther={() => setScreen('language')} onShare={() => setShowShare(true)} />;
        return <CodeCompletionMode />;
      default: return <TestMode />;
    }
  };

  return (
    <div className={`app ${learningMode === 'swipe' ? 'swipe-mode' : ''}`}>
      <PwaInstallPrompt show={showPwa} />
      <Header
        onSettingsClick={() => setScreen('language')}
        onResumeClick={() => setScreen('resume')}
        onSubscriptionClick={() => setScreen('subscriptions')}
        onLanguageChange={handleLanguageChange}
        onAdminClick={() => setScreen('admin')}
        onProgressClick={() => setScreen('progress')}
        onHelpClick={handleHelp}
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
      <MissedPanel />
      <DebugOverlay visible={debugOpen} onClose={() => setDebugOpen(false)} />
    </div>
  );
}

export default App;