import React, { useEffect, useState } from 'react';
import useStore from '../store/useStore';
import { Timer, Zap, Check, X, Trophy, Play } from 'lucide-react';
import './BlitzMode.css';

const BlitzMode = () => {
  const {
    questions,
    currentIndex,
    blitzScore,
    blitzTimeLeft,
    isBlitzActive,
    startBlitz,
    decrementBlitzTime,
    submitBlitzAnswer,
    isLoadingQuestions,
    fetchGeneration
  } = useStore();

  const [feedback, setFeedback] = useState(null); // 'correct' | 'incorrect'

  useEffect(() => {
    if (!isBlitzActive) return;
    const timer = setInterval(() => {
      decrementBlitzTime();
    }, 1000);
    return () => clearInterval(timer);
  }, [isBlitzActive, decrementBlitzTime]);
  
  const currentQuestion = questions[currentIndex];
  const blitzData = currentQuestion?.blitzData;

  useEffect(() => {
    if (isBlitzActive && currentQuestion && !blitzData) {
      fetchGeneration('blitz', currentQuestion.id);
    }
  }, [isBlitzActive, currentIndex, currentQuestion, blitzData, fetchGeneration]);

  const handleAnswer = async (answer) => {
    if (!isBlitzActive || feedback) return;

    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    try {
      const response = await submitBlitzAnswer(currentQuestion.id, answer);
      setFeedback(response.isCorrect ? 'correct' : 'incorrect');

      // Short delay for feedback before next question
      setTimeout(() => {
        setFeedback(null);
      }, 300);
    } catch (error) {
      console.error('Blitz answer error:', error);
    }
  };

  if (!isBlitzActive && blitzTimeLeft === 60) {
    return (
      <div className="blitz-start-screen">
        <div className="blitz-start-card">
          <Zap size={64} className="zap-icon" />
          <h1>Блиц-режим</h1>
          <p>Ответьте на максимальное количество вопросов за 60 секунд. Только Правда или Ложь!</p>
          <button className="start-blitz-button" onClick={startBlitz}>
            <Play size={20} />
            <span>Поехали!</span>
          </button>
        </div>
      </div>
    );
  }

  if (blitzTimeLeft <= 0) {
    return (
      <div className="blitz-results-screen">
        <div className="blitz-results-card">
          <Trophy size={64} className="trophy-icon" />
          <h1>Время вышло!</h1>
          <div className="final-score">
            <span>Ваш результат:</span>
            <strong>{blitzScore}</strong>
          </div>
          <button className="retry-blitz-button" onClick={startBlitz}>
            Попробовать еще раз
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const blitzData = currentQuestion?.blitzData;

  return (
    <div className="blitz-mode">
      <div className="blitz-header">
        <div className="blitz-timer">
          <Timer size={20} />
          <span className={blitzTimeLeft < 10 ? 'low-time' : ''}>{blitzTimeLeft}с</span>
        </div>
        <div className="blitz-current-score">
          <Zap size={20} />
          <span>Счет: {blitzScore}</span>
        </div>
      </div>

      <div className={`blitz-card ${feedback}`}>
        {isLoadingQuestions && !blitzData ? (
          <div className="blitz-loading">
            <Zap className="spinner" size={48} />
          </div>
        ) : (
          <>
            <div className="blitz-topic">{currentQuestion?.category}</div>
            <h2 className="blitz-statement">
              {blitzData?.statement || 'Загрузка...'}
            </h2>

            <div className="blitz-actions">
              <button
                className="blitz-btn false-btn"
                onClick={() => handleAnswer(false)}
                disabled={feedback}
              >
                <X size={24} />
                <span>Ложь</span>
              </button>
              <button
                className="blitz-btn true-btn"
                onClick={() => handleAnswer(true)}
                disabled={feedback}
              >
                <Check size={24} />
                <span>Правда</span>
              </button>
            </div>
          </>
        )}
      </div>

      <div className="blitz-progress">
        <div
          className="blitz-progress-fill"
          style={{ width: `${(blitzTimeLeft / 60) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default BlitzMode;