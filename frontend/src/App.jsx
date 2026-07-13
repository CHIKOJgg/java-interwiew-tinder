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
import PaywallModal from './components/PaywallModal';
import ProNudge from './components/ProNudge';
import Onboarding, { ONBOARD_KEY } from './components/Onboarding';
import MissedPanel from './components/MissedPanel';
import useStore from './store/useStore';
import { CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
          reject(new Error('Telegram WebApp не загрузился. Откройте через Telegram.'));
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
        reject(new Error('initData пустой — приложение должно открываться через Telegram'));
      }
    }, 100);
  });
}

function App() {
  const {
    questions, currentIndex,
    showExplanation, currentExplanation, isLoadingExplanation,
    isLoadingQuestions,
    login, swipeCard, closeExplanation, hasMoreQuestions, loadQuestions,
    learningMode,
    switchLanguage,
    stats,
    closePaywall,
    feedRefresher, dismissRefresher,
  } = useStore();
  const { t } = useTranslation();

  const [initState, setInitState] = useState('waiting_telegram');
  const [screen, setScreen] = useState('language');
  const [authError, setAuthError] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [reportingQuestionId, setReportingQuestionId] = useState(null);
  // When the user re-opens the onboarding from the help button, "done" should
  // return them to the app (not back to language selection).
  const onboardingReopen = useRef(false);

  const cardRefs = useRef([]);

  useEffect(() => {
    const handleReport = (e) => setReportingQuestionId(e.detail);
    window.addEventListener('report-question', handleReport);
    return () => window.removeEventListener('report-question', handleReport);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const startApp = async () => {
      try {
        setInitState('waiting_telegram');
        const initData = await getTelegramInitData();
        if (!initData) throw new Error('No initData');

        // Extract referralId from start_param if present
        const tg = window.Telegram?.WebApp;
        let referralId = null;
        if (tg?.initDataUnsafe?.start_param) {
          referralId = tg.initDataUnsafe.start_param;
        }

        setInitState('auth');
        await login(initData, referralId);

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
    cardRefs.current[currentIndex]?.swipe?.(direction);
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
            <div className="completion-screen">
              <CheckCircle size={64} color="#51cf66" />
              <h2>{t('completion.title')}</h2>
              <p>{t('completion.desc')}</p>
              <button onClick={() => setScreen('language')}>
                {t('completion.choose_other')}
              </button>
              <button 
                onClick={() => setShowShare(true)}
                style={{ marginTop: 10, background: 'rgba(51, 154, 240, 0.1)', color: '#339af0' }}
              >
                {t('completion.share')}
              </button>
            </div>
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
                    ref={el => (cardRefs.current[currentIndex] = el)}
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
      case 'test': return <TestMode />;
      case 'bug-hunting': return <BugHuntingMode />;
      case 'blitz': return <BlitzMode />;
      case 'mock-interview': return <Suspense fallback={<SkeletonCard />}><MockInterviewMode /></Suspense>;
      case 'concept-linker': return <ConceptLinker />;
      case 'code-completion': return <CodeCompletionMode />;
      default: return <TestMode />;
    }
  };

  return (
    <div className={`app ${learningMode === 'swipe' ? 'swipe-mode' : ''}`}>
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
    </div>
  );
}

export default App;