import React, { useEffect, useRef, useState } from 'react';
import Header from './components/Header';
import QuestionCard from './components/QuestionCard';
import SwipeButtons from './components/SwipeButtons';
import ExplanationModal from './components/ExplanationModal';
import CategorySelection from './components/CategorySelection';
import useStore from './store/useStore';
import { Loader2, CheckCircle } from 'lucide-react';
import './App.css';

function App() {
  const {
    isAuthenticated,
    isLoading,
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
  } = useStore();

  const [showCategorySelection, setShowCategorySelection] = useState(false);
  const cardRefs = useRef([]);

  useEffect(() => {
    // Initialize Telegram WebApp
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();

      // Try to authenticate
      const initData =
        tg.initData ||
        'user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Dev%22%2C%22username%22%3A%22dev_user%22%7D';
      login(initData)
        .then(() => {
          // После успешной авторизации показываем выбор категорий
          setShowCategorySelection(true);
        })
        .catch(console.error);
    } else {
      // Development mode: mock auth
      const mockInitData =
        'user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Dev%22%2C%22username%22%3A%22dev_user%22%7D';
      login(mockInitData)
        .then(() => {
          setShowCategorySelection(true);
        })
        .catch(console.error);
    }
  }, [login]);

  const handleCategorySelectionComplete = () => {
    setShowCategorySelection(false);
    // Перезагружаем вопросы с учетом выбранных категорий
    loadQuestions();
  };

  const handleSwipe = (direction) => {
    const currentQuestion = questions[currentIndex];
    if (currentQuestion) {
      swipeCard(currentQuestion.id, direction);
    }
  };

  const handleButtonSwipe = (direction) => {
    // Trigger programmatic swipe on the top card
    if (cardRefs.current[currentIndex]) {
      const card = cardRefs.current[currentIndex];
      if (card && card.swipe) {
        card.swipe(direction);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        <Loader2 className="spinner" size={48} />
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="app-loading">
        <p>
          Ошибка авторизации. Пожалуйста, откройте приложение через Telegram.
        </p>
      </div>
    );
  }

  // Показываем экран выбора категорий
  if (showCategorySelection) {
    return <CategorySelection onComplete={handleCategorySelectionComplete} />;
  }

  return (
    <div className="app">
      <Header onSettingsClick={() => setShowCategorySelection(true)} />

      <div className="card-container">
        {hasMoreQuestions() ? (
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

      <SwipeButtons
        onSwipeLeft={() => handleButtonSwipe('left')}
        onSwipeRight={() => handleButtonSwipe('right')}
        disabled={!hasMoreQuestions()}
      />

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
