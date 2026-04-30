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

// ─── Robust Telegram initData getter ────────────────────────────────
// tg.initData can be empty string on first render before WebApp is ready.
// We retry up to 10 times with 200ms delay to get real initData.
function getTelegramInitData() {
  return new Promise((resolve) => {
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      // Not in Telegram — use mock data for dev/browser preview
      resolve('user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Dev%22%2C%22username%22%3A%22dev_user%22%7D');
      return;
    }

    tg.ready();
    tg.expand();

    // If initData is already populated, return immediately
    if (tg.initData && tg.initData.length > 0) {
      resolve(tg.initData);
      return;
    }

    // Otherwise poll until it's available (max 2 seconds)
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (tg.initData && tg.initData.length > 0) {
        clearInterval(interval);
        resolve(tg.initData);
      } else if (attempts >= 10) {
        clearInterval(interval);
        // Last resort: use whatever we have (even empty — backend will reject gracefully)
        resolve(tg.initData || '');
      }
    }, 200);
  });
}

function App() {
  const {
    isAuthenticated,
    isLoading,
    isLoadingQuestions,
    questions,
    currentIndex,
    showExplanation,
    currentExplanation,
    isLoadingExplanation,
    login,
    swipeCard,
    closeExplanation,
    hasMoreQuestions,
    loadQuestions,
    learningMode,
  } = useStore();

  const [showCategorySelection, setShowCategorySelection] = useState(false);
  const [showResumeAnalyzer, setShowResumeAnalyzer] = useState(false);
  const [showSubscriptions, setShowSubscriptions] = useState(false);
  const [authError, setAuthError] = useState(null);
  const cardRefs = useRef([]);

  useEffect(() => {
    let cancelled = false;

    getTelegramInitData().then((initData) => {
      if (cancelled) return;
      login(initData)
        .then(() => {
          if (!cancelled) setShowCategorySelection(true);
        })
        .catch((err) => {
          if (!cancelled) {
            console.error('Login failed:', err);
            setAuthError(err?.message || 'Auth failed');
          }
        });
    });

    return () => { cancelled = true; };
  }, []); // ← empty deps, runs once

  const handleCategorySelectionComplete = () => {
    setShowCategorySelection(false);
    loadQuestions();
  };

  const handleSwipe = (direction) => {
    const currentQuestion = questions[currentIndex];
    if (currentQuestion) {
      swipeCard(currentQuestion.id, direction);
    }
  };

  const handleButtonSwipe = (direction) => {
    if (cardRefs.current[currentIndex]) {
      const card = cardRefs.current[currentIndex];
      if (card && card.swipe) {
        card.swipe(direction);
      }
    }
  };

  // ─── Loading screen ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="app">
        <div className="skeleton-loading-screen">
          <SkeletonCard />
          <p style={{ textAlign: 'center', opacity: 0.5, marginTop: 16 }}>Загрузка...</p>
        </div>
      </div>
    );
  }

  // ─── Auth error ──────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="app-loading">
        <p>Ошибка авторизации. Пожалуйста, откройте приложение через Telegram.</p>
        {authError && (
          <p style={{ fontSize: 11, opacity: 0.5, marginTop: 8 }}>{authError}</p>
        )}
      </div>
    );
  }

  // ─── Category selection ──────────────────────────────────────────
  if (showCategorySelection) {
    return <CategorySelection onComplete={handleCategorySelectionComplete} />;
  }

  if (showResumeAnalyzer) {
    return <ResumeAnalyzer onBack={() => setShowResumeAnalyzer(false)} />;
  }

  if (showSubscriptions) {
    return <SubscriptionPlans onBack={() => setShowSubscriptions(false)} />;
  }

  // ─── Main app ────────────────────────────────────────────────────
  return (
    <div className="app">
      <Header
        onSettingsClick={() => setShowCategorySelection(true)}
        onResumeClick={() => setShowResumeAnalyzer(true)}
        onSubscriptionClick={() => setShowSubscriptions(true)}
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
            <button
              className="restart-button"
              onClick={() => setShowCategorySelection(true)}
            >
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