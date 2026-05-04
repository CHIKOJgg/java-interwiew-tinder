import React, { useEffect, useRef, useState } from 'react';
import Header from './components/Header';
import QuestionCard from './components/QuestionCard';
import SwipeButtons from './components/SwipeButtons';
import TestMode from './components/TestMode';
import BugHuntingMode from './components/BugHuntingMode';
import BlitzMode from './components/BlitzMode';
import MockInterviewMode from './components/MockInterviewMode';
import ConceptLinker from './components/ConceptLinker';
import CodeCompletionMode from './components/CodeCompletionMode';
import ResumeAnalyzer from './components/ResumeAnalyzer';
import ExplanationModal from './components/ExplanationModal';
import CategorySelection from './components/CategorySelection';
import SubscriptionPlans from './components/SubscriptionPlans';
import { SkeletonCard } from './components/Skeleton';
import useStore from './store/useStore';
import { CheckCircle, RefreshCw } from 'lucide-react';
import './App.css';

// ─── Error Boundary ────────────────────────────────────────────────────
class CardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Card render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card-error-fallback">
          <RefreshCw size={32} opacity={0.4} />
          <p>Ошибка отображения карточки</p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              this.props.onReset?.();
            }}
          >
            Следующий вопрос
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Telegram initData ─────────────────────────────────────────────────
function getTelegramInitData() {
  return new Promise((resolve, reject) => {
    // Try synchronously first — initData is usually ready immediately
    const tryNow = () => {
      const tg = window.Telegram?.WebApp;
      if (!tg) return false;
      if (!tg._readyCalled) {
        tg._readyCalled = true;
        try { tg.ready(); } catch (_) { }
        try { tg.expand(); } catch (_) { }
      }
      if (tg.initData && tg.initData.length > 0) {
        resolve(tg.initData);
        return true;
      }
      return false;
    };

    if (tryNow()) return;

    let attempts = 0;
    const MAX = 30; // 30 × 100ms = 3s
    const timer = setInterval(() => {
      attempts++;
      if (tryNow()) { clearInterval(timer); return; }
      if (attempts >= MAX) {
        clearInterval(timer);
        console.warn('initData still empty after 3s — sending to backend anyway');
        resolve(window.Telegram?.WebApp?.initData ?? '');
      }
    }, 100);
  });
}

// ─── App ──────────────────────────────────────────────────────────────
function App() {
  const {
    questions, currentIndex,
    showExplanation, currentExplanation, isLoadingExplanation,
    isLoadingQuestions,
    login, swipeCard, closeExplanation, hasMoreQuestions, loadQuestions,
    learningMode,
    switchLanguage,
  } = useStore();

  const [initState, setInitState] = useState('waiting_telegram');
  const [screen, setScreen] = useState('category');
  const [authError, setAuthError] = useState(null);
  const [cardErrorKey, setCardErrorKey] = useState(0); // resets ErrorBoundary

  const cardRefs = useRef([]);

  useEffect(() => {
    let cancelled = false;
    const startApp = async () => {
      try {
        setInitState('waiting_telegram');
        const initData = await getTelegramInitData();
        setInitState('auth');
        await login(initData);
        if (cancelled) return;
        setInitState('ready');
        setScreen('category');
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

  const handleSwipe = (direction) => {
    const q = questions[currentIndex];
    if (q) swipeCard(q.id, direction);
  };

  const handleButtonSwipe = (direction) => {
    cardRefs.current[currentIndex]?.swipe?.(direction);
  };

  // ── Loading / error screens ──────────────────────────────────────────
  if (initState === 'waiting_telegram' || initState === 'auth') {
    return (
      <div className="app-loading">
        <SkeletonCard />
        <p style={{ marginTop: 16, opacity: 0.5 }}>
          {initState === 'waiting_telegram' ? 'Connecting to Telegram...' : 'Signing you in...'}
        </p>
      </div>
    );
  }

  if (initState === 'error') {
    return (
      <div className="app-loading">
        <p style={{ fontSize: 16, fontWeight: 600 }}>Ошибка запуска приложения</p>
        <p style={{ fontSize: 11, opacity: 0.6, marginTop: 8, padding: '0 24px', textAlign: 'center' }}>{authError}</p>
        <button
          onClick={() => window.location.reload()}
          style={{ marginTop: 20, padding: '12px 24px', borderRadius: 12, background: '#5c7cfa', color: '#fff', border: 'none', fontSize: 15, cursor: 'pointer' }}
        >
          Перезапустить
        </button>
      </div>
    );
  }

  if (screen === 'category') return <CategorySelection onComplete={handleCategoryDone} />;
  if (screen === 'resume') return <ResumeAnalyzer onBack={() => setScreen('main')} />;
  if (screen === 'subscriptions') return <SubscriptionPlans onBack={() => setScreen('main')} />;

  // ── Mode content ─────────────────────────────────────────────────────
  const renderMode = () => {
    if (isLoadingQuestions) return <SkeletonCard />;

    if (!hasMoreQuestions()) {
      return (
        <div className="completion-screen">
          <CheckCircle size={64} color="#51cf66" />
          <h2>Отличная работа!</h2>
          <p>Вы просмотрели все доступные вопросы</p>
          <button onClick={() => setScreen('category')}>Выбрать другие темы</button>
        </div>
      );
    }

    switch (learningMode) {
      case 'swipe':
        return (
          <CardErrorBoundary
            key={cardErrorKey}
            onReset={() => {
              setCardErrorKey(k => k + 1);
              swipeCard(questions[currentIndex]?.id, 'left');
            }}
          >
            <div className="card-stack">
              {questions.slice(currentIndex, currentIndex + 3).map((q, index) => {
                if (!q) return null;
                return (
                  <div
                    key={q.id}
                    className={`card-wrapper ${index > 0 ? 'card-behind' : ''}`}
                    style={{ zIndex: 3 - index }}
                  >
                    {index === 0 ? (
                      <QuestionCard
                        ref={el => { cardRefs.current[currentIndex] = el; }}
                        question={q}
                        onSwipe={handleSwipe}
                        canSwipe={true}
                      />
                    ) : (
                      <div className="card-peek-shell" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardErrorBoundary>
        );
      case 'test': return <TestMode />;
      case 'bug-hunting': return <BugHuntingMode />;
      case 'blitz': return <BlitzMode />;
      case 'mock-interview': return <MockInterviewMode />;
      case 'concept-linker': return <ConceptLinker />;
      case 'code-completion': return <CodeCompletionMode />;
      default: return <TestMode />;
    }
  };

  return (
    <div className="app">
      <Header
        onSettingsClick={() => setScreen('category')}
        onResumeClick={() => setScreen('resume')}
        onSubscriptionClick={() => setScreen('subscriptions')}
        onLanguageChange={handleLanguageChange}
      />
      <div className="card-container">
        {renderMode()}
      </div>

      {/* SwipeButtons are position:fixed — rendered outside card-container
          so they don't affect layout, and sit above the bottom nav */}
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
      />
    </div>
  );
}

export default App;