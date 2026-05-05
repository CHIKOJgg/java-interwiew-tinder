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
  } = useStore();

  const [initState, setInitState] = useState('waiting_telegram');
  const [screen, setScreen] = useState('category');
  const [authError, setAuthError] = useState(null);

  const cardRefs = useRef([]);

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

  if (initState === 'waiting_telegram') {
    return (
      <div className="app-loading">
        <SkeletonCard />
        <p style={{ textAlign: 'center', opacity: 0.5, marginTop: 16 }}>Connecting to Telegram...</p>
      </div>
    );
  }

  if (initState === 'auth') {
    return (
      <div className="app-loading">
        <SkeletonCard />
        <p style={{ textAlign: 'center', opacity: 0.5, marginTop: 16 }}>Signing you in...</p>
      </div>
    );
  }

  if (initState === 'error') {
    return (
      <div className="app-loading">
        <p style={{ fontSize: 16, fontWeight: 600 }}>Ошибка запуска приложения</p>
        <p style={{ fontSize: 11, opacity: 0.6, marginTop: 8, textAlign: 'center', padding: '0 24px' }}>{authError}</p>
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

  const renderMode = () => {
    // Blitz and MockInterview have their own start/active/results state machines.
    // Never block them with the global "no questions" completion screen.
    if (learningMode === 'blitz') return <BlitzMode />;
    if (learningMode === 'mock-interview') return <MockInterviewMode />;

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
              <div
                key={q.id}
                className={`card-wrapper ${index > 0 ? 'card-behind' : ''}`}
                style={{ zIndex: 3 - index }}
              >
                {index === 0 ? (
                  // ── Active card: full QuestionCard with flip ──
                  <QuestionCard
                    ref={el => (cardRefs.current[currentIndex] = el)}
                    question={q}
                    onSwipe={handleSwipe}
                    canSwipe={true}
                  />
                ) : (
                  // ── Peek cards: blank gradient shell only, no text bleeding ──
                  <div className="card-peek-shell" />
                )}
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