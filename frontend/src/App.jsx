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
import { CheckCircle } from 'lucide-react';
import './App.css';

// ✅ BULLETPROOF Telegram init (Mobile safe + Dev fallback)
function getTelegramInitData() {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 50; // ~5 seconds
    let isReadyCalled = false;

    const interval = setInterval(() => {
      const tg = window.Telegram?.WebApp;

      if (tg) {
        // Clear the native Telegram mobile spinner
        if (!isReadyCalled) {
          try {
            tg.ready();
            tg.expand();
            isReadyCalled = true;
          } catch (err) {
            console.warn('Error calling Telegram ready/expand:', err);
          }
        }

        // If we have actual Telegram data, resolve with it
        if (tg.initData && tg.initData.length > 0) {
          clearInterval(interval);
          resolve(tg.initData);
          return;
        }
      }

      attempts++;

      // If we hit the 5-second timeout, DON'T crash. Use the dev fallback.
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.warn('Timeout waiting for Telegram initData. Using Dev Fallback.');

        // Your original dev fallback string
        resolve('user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Dev%22%2C%22username%22%3A%22dev_user%22%7D');
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
  } = useStore();

  // ✅ NEW: separate init state
  const [initState, setInitState] = useState('waiting_telegram');
  const [screen, setScreen] = useState('category');
  const [authError, setAuthError] = useState(null);

  const cardRefs = useRef([]);

  // ✅ NON-BLOCKING STARTUP
  useEffect(() => {
    let cancelled = false;

    const startApp = async () => {
      try {
        setInitState('waiting_telegram');

        const initData = await getTelegramInitData();

        if (!initData) throw new Error('No initData');

        setInitState('auth');

        await login(initData);

        if (cancelled) return;

        // ✅ DO NOT BLOCK UI
        setInitState('ready');
        setScreen('category');

        // load in background
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

  // ─────────────────────────────────────────────

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

  // ✅ NEW: INIT STATE UI (instead of blocking spinner forever)

  if (initState === 'waiting_telegram') {
    return (
      <div className="app">
        <SkeletonCard />
        <p style={{ textAlign: 'center', opacity: 0.5 }}>Connecting to Telegram...</p>
      </div>
    );
  }

  if (initState === 'auth') {
    return (
      <div className="app">
        <SkeletonCard />
        <p style={{ textAlign: 'center', opacity: 0.5 }}>Signing you in...</p>
      </div>
    );
  }

  if (initState === 'error') {
    return (
      <div className="app-loading">
        <p>Ошибка запуска приложения</p>
        <p style={{ fontSize: 11, opacity: 0.6 }}>{authError}</p>
        <button onClick={() => window.location.reload()}>
          Перезапустить
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────

  if (screen === 'category') {
    return <CategorySelection onComplete={handleCategoryDone} />;
  }

  if (screen === 'resume') {
    return <ResumeAnalyzer onBack={() => setScreen('main')} />;
  }

  if (screen === 'subscriptions') {
    return <SubscriptionPlans onBack={() => setScreen('main')} />;
  }

  // ─── MAIN ───────────────────────────────────

  const renderMode = () => {
    if (isLoadingQuestions) return <SkeletonCard />;

    if (!hasMoreQuestions()) {
      return (
        <div className="completion-screen">
          <CheckCircle size={64} color="#51cf66" />
          <h2>Отличная работа!</h2>
          <p>Вы просмотрели все доступные вопросы</p>
          <button onClick={() => setScreen('category')}>
            Выбрать другие темы
          </button>
        </div>
      );
    }

    switch (learningMode) {
      case 'swipe':
        return (
          <div className="card-stack">
            {questions.slice(currentIndex, currentIndex + 3).map((q, index) => (
              <div key={q.id} className="card-wrapper">
                <QuestionCard
                  ref={el => (cardRefs.current[currentIndex + index] = el)}
                  question={q}
                  onSwipe={index === 0 ? handleSwipe : null}
                  canSwipe={index === 0}
                />
              </div>
            ))}
          </div>
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