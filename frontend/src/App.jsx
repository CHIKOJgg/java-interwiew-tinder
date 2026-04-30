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

// ─── Telegram init data helper ────────────────────────────────────────
function getTelegramInitData() {
  return new Promise((resolve) => {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      // Dev fallback
      resolve('user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Dev%22%2C%22username%22%3A%22dev_user%22%7D');
      return;
    }
    tg.ready();
    tg.expand();
    if (tg.initData && tg.initData.length > 0) {
      resolve(tg.initData);
      return;
    }
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (tg.initData && tg.initData.length > 0) {
        clearInterval(interval);
        resolve(tg.initData);
      } else if (attempts >= 10) {
        clearInterval(interval);
        resolve(tg.initData || '');
      }
    }, 200);
  });
}

// ─── Screen state machine ─────────────────────────────────────────────
// 'loading'   → auth in progress (skeleton shown)
// 'category'  → category selection
// 'main'      → card feed (questions guaranteed to be loaded before entering)
// 'error'     → auth failed
// 'resume'    → resume analyzer overlay
// 'subscriptions' → subscription plans overlay

function App() {
  const {
    questions,
    currentIndex,
    showExplanation,
    currentExplanation,
    isLoadingExplanation,
    isLoadingQuestions,
    login,
    swipeCard,
    closeExplanation,
    hasMoreQuestions,
    loadQuestions,
    learningMode,
  } = useStore();

  const [screen, setScreen] = useState('loading');
  const [authError, setAuthError] = useState(null);
  const cardRefs = useRef([]);

  // Auth on mount — only once
  useEffect(() => {
    let cancelled = false;
    getTelegramInitData().then((initData) => {
      if (cancelled) return;
      // login() awaits loadQuestions() internally, so by the time this resolves
      // questions are in the store. No render gap can occur.
      login(initData)
        .then(() => {
          if (!cancelled) setScreen('category');
        })
        .catch((err) => {
          if (!cancelled) {
            console.error('Login failed:', err);
            setAuthError(err?.message || 'Auth failed');
            setScreen('error');
          }
        });
    });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // After category selection: reload questions with the newly selected categories,
  // then transition to main. isLoadingQuestions gates the card container.
  const handleCategorySelectionComplete = () => {
    loadQuestions(); // non-blocking — isLoadingQuestions will show skeleton until done
    setScreen('main');
  };

  const handleSwipe = (direction) => {
    const currentQuestion = questions[currentIndex];
    if (currentQuestion) swipeCard(currentQuestion.id, direction);
  };

  const handleButtonSwipe = (direction) => {
    // cardRefs now work because QuestionCard uses forwardRef + useImperativeHandle
    if (cardRefs.current[currentIndex]?.swipe) {
      cardRefs.current[currentIndex].swipe(direction);
    }
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
        <p>Ошибка авторизации. Пожалуйста, откройте приложение через Telegram.</p>
        {authError && <p style={{ fontSize: 11, opacity: 0.5, marginTop: 8 }}>{authError}</p>}
      </div>
    );
  }

  if (screen === 'category') {
    return <CategorySelection onComplete={handleCategorySelectionComplete} />;
  }

  if (screen === 'resume') {
    return <ResumeAnalyzer onBack={() => setScreen('main')} />;
  }

  if (screen === 'subscriptions') {
    return <SubscriptionPlans onBack={() => setScreen('main')} />;
  }

  // ─── Main app ────────────────────────────────────────────────────
  return (
    <div className="app">
      <Header
        onSettingsClick={() => setScreen('category')}
        onResumeClick={() => setScreen('resume')}
        onSubscriptionClick={() => setScreen('subscriptions')}
      />

      <div className="card-container">
        {isLoadingQuestions ? (
          <SkeletonCard />
        ) : hasMoreQuestions() ? (
          learningMode === 'swipe' ? (
            <div className="card-stack">
              {questions
                .slice(currentIndex, currentIndex + 3)
                .map((question, index) => (
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
                      ref={(el) => (cardRefs.current[currentIndex + index] = el)}
                      question={question}
                      onSwipe={index === 0 ? handleSwipe : null}
                      canSwipe={index === 0}
                    />
                  </div>
                ))}
            </div>
          ) : learningMode === 'test' ? (
            <TestMode />
          ) : learningMode === 'bug-hunting' ? (
            <BugHuntingMode />
          ) : learningMode === 'blitz' ? (
            <BlitzMode />
          ) : learningMode === 'mock-interview' ? (
            <MockInterviewMode />
          ) : learningMode === 'concept-linker' ? (
            <ConceptLinker />
          ) : (
            <CodeCompletionMode />
          )
        ) : (
          <div className="completion-screen">
            <CheckCircle size={64} color="#51cf66" />
            <h2>Отличная работа!</h2>
            <p>Вы просмотрели все доступные вопросы</p>
            <button className="restart-button" onClick={() => setScreen('category')}>
              Выбрать другие темы
            </button>
          </div>
        )}
      </div>

      {learningMode === 'swipe' && (
        <SwipeButtons
          onSwipeLeft={() => handleButtonSwipe('left')}
          onSwipeRight={() => handleButtonSwipe('right')}
          disabled={!hasMoreQuestions()}
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
