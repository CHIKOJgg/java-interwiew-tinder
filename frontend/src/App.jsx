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

// ─── Screen state machine ─────────────────────────────────────────────
// 'loading'       → auth in progress
// 'category'      → pick question categories (also after language switch)
// 'main'          → card feed
// 'resume'        → resume analyzer overlay
// 'subscriptions' → subscription management overlay
// 'error'         → auth failed

// ─── Telegram initData helper ─────────────────────────────────────────
function getTelegramInitData() {
  return new Promise((resolve) => {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      // Dev fallback — works with BOT_TOKEN='' in .env (mock validation)
      resolve('user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Dev%22%2C%22username%22%3A%22dev_user%22%7D');
      return;
    }
    tg.ready();
    tg.expand();
    if (tg.initData?.length > 0) { resolve(tg.initData); return; }
    let attempts = 0;
    const iv = setInterval(() => {
      attempts++;
      if (tg.initData?.length > 0) { clearInterval(iv); resolve(tg.initData); }
      else if (attempts >= 10)     { clearInterval(iv); resolve(tg.initData || ''); }
    }, 200);
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

  const [screen, setScreen]     = useState('loading');
  const [authError, setAuthError] = useState(null);
  const cardRefs = useRef([]);

  // ─── Auth on mount ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    getTelegramInitData().then((initData) => {
      if (cancelled) return;
      login(initData)
        .then(() => { if (!cancelled) setScreen('category'); })
        .catch((err) => {
          if (!cancelled) {
            setAuthError(err?.message || 'Auth failed');
            setScreen('error');
          }
        });
    });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  // ─── Category selection complete ──────────────────────────────────
  const handleCategoryDone = () => {
    loadQuestions(); // reload for newly selected cats — isLoadingQuestions shows skeleton
    setScreen('main');
  };

  // ─── Language switching ───────────────────────────────────────────
  // 1. Store clears questions + calls backend to reset category filter
  // 2. We send user back to category selection so they pick cats for the new lang
  const handleLanguageChange = async (newLang) => {
    await switchLanguage(newLang); // updates apiClient language + saves to backend
    setScreen('category');         // show category picker for the new language
  };

  // ─── Swipe handlers ───────────────────────────────────────────────
  const handleSwipe = (direction) => {
    const q = questions[currentIndex];
    if (q) swipeCard(q.id, direction);
  };

  const handleButtonSwipe = (direction) => {
    cardRefs.current[currentIndex]?.swipe?.(direction);
  };

  // ─── Screens ─────────────────────────────────────────────────────

  if (screen === 'loading') {
    return (
      <div className="app">
        <div className="skeleton-loading-screen">
          <SkeletonCard />
          <p style={{ textAlign: 'center', opacity: 0.5, marginTop: 16 }}>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (screen === 'error') {
    return (
      <div className="app-loading">
        <p>Ошибка авторизации. Откройте приложение через Telegram.</p>
        {authError && <p style={{ fontSize: 11, opacity: 0.5, marginTop: 8 }}>{authError}</p>}
      </div>
    );
  }

  if (screen === 'category') {
    return <CategorySelection onComplete={handleCategoryDone} />;
  }

  if (screen === 'resume') {
    return <ResumeAnalyzer onBack={() => setScreen('main')} />;
  }

  if (screen === 'subscriptions') {
    return <SubscriptionPlans onBack={() => setScreen('main')} />;
  }

  // ─── Main ─────────────────────────────────────────────────────────
  const renderMode = () => {
    if (isLoadingQuestions)    return <SkeletonCard />;
    if (!hasMoreQuestions())   return (
      <div className="completion-screen">
        <CheckCircle size={64} color="#51cf66" />
        <h2>Отличная работа!</h2>
        <p>Вы просмотрели все доступные вопросы</p>
        <button className="restart-button" onClick={() => setScreen('category')}>
          Выбрать другие темы
        </button>
      </div>
    );

    switch (learningMode) {
      case 'swipe': return (
        <div className="card-stack">
          {questions.slice(currentIndex, currentIndex + 3).map((question, index) => (
            <div
              key={question.id}
              className="card-wrapper"
              style={{
                zIndex: 3 - index,
                transform: `scale(${1 - index * 0.05}) translateY(${index * -10}px)`,
                opacity: 1 - index * 0.3,
              }}
            >
              <QuestionCard
                ref={el => (cardRefs.current[currentIndex + index] = el)}
                question={question}
                onSwipe={index === 0 ? handleSwipe : null}
                canSwipe={index === 0}
              />
            </div>
          ))}
        </div>
      );
      case 'test':            return <TestMode />;
      case 'bug-hunting':     return <BugHuntingMode />;
      case 'blitz':           return <BlitzMode />;
      case 'mock-interview':  return <MockInterviewMode />;
      case 'concept-linker':  return <ConceptLinker />;
      case 'code-completion': return <CodeCompletionMode />;
      default:                return <TestMode />;
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
