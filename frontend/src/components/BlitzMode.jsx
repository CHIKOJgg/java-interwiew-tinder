import React, { useEffect, useRef, useState, useCallback } from 'react';
import useStore from '../store/useStore';
import { Timer, Zap, Check, X, Trophy, Play, RefreshCw } from 'lucide-react';
import './BlitzMode.css';

// Generate True/False statement from existing question data — no AI needed.
// Uses shortAnswer (always correct) or a wrong option (isCorrect: false).
function makeFallbackBlitzData(question) {
  const wrong = (question.options || []).filter(
    o => (o || '').trim().toLowerCase() !== (question.shortAnswer || '').trim().toLowerCase()
  );
  const useWrong = wrong.length > 0 && Math.random() < 0.5;
  return {
    statement: useWrong ? wrong[Math.floor(Math.random() * wrong.length)] : question.shortAnswer,
    isCorrect: !useWrong,
  };
}

const BlitzMode = () => {
  const {
    questions, currentIndex, blitzScore, blitzTimeLeft,
    isBlitzActive, blitzIdle, startBlitz, decrementBlitzTime,
    submitBlitzAnswer, fetchGeneration, advanceQuestion,
  } = useStore();

  const [feedback, setFeedback] = useState(null);
  const [localBlitzData, setLocalBlitzData] = useState(null);
  const feedbackTimer = useRef(null);

  useEffect(() => {
    if (!isBlitzActive) return;
    const t = setInterval(() => decrementBlitzTime(), 1000);
    return () => clearInterval(t);
  }, [isBlitzActive, decrementBlitzTime]);

  const currentQuestion = questions[currentIndex];
  const aiBlitzData = currentQuestion?.blitzData;
  const blitzData = (aiBlitzData && !aiBlitzData.__error) ? aiBlitzData : localBlitzData;

  useEffect(() => {
    if (!isBlitzActive || !currentQuestion) return;
    setLocalBlitzData(makeFallbackBlitzData(currentQuestion));
    if (!aiBlitzData || aiBlitzData.__error) {
      fetchGeneration('blitz', currentQuestion.id).catch(() => { });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBlitzActive, currentIndex, currentQuestion?.id]);

  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  const handleAnswer = useCallback(async (answer) => {
    if (!isBlitzActive || feedback || !blitzData) return;
    const correct = Boolean(answer) === Boolean(blitzData.isCorrect);
    setFeedback(correct ? 'correct' : 'incorrect');
    submitBlitzAnswer(currentQuestion.id, answer).catch(() => { });
    feedbackTimer.current = setTimeout(() => {
      setFeedback(null);
      setLocalBlitzData(null);
      advanceQuestion();
    }, 350);
  }, [isBlitzActive, feedback, blitzData, currentQuestion, submitBlitzAnswer, advanceQuestion]);

  // Start screen — controlled by blitzIdle flag, not blitzTimeLeft===60
  if (blitzIdle) {
    return (
      <div className="blitz-start-screen">
        <div className="blitz-start-card">
          <Zap size={64} className="zap-icon" />
          <h1>Блиц-режим</h1>
          <p>60 секунд. Только Правда или Ложь. Отвечайте как можно быстрее!</p>
          <button className="start-blitz-button" onClick={startBlitz} type="button">
            <Play size={20} /><span>Поехали!</span>
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
          <div className="final-score"><span>Ваш результат:</span><strong>{blitzScore}</strong></div>
          <button className="retry-blitz-button" onClick={startBlitz} type="button">
            <RefreshCw size={18} /><span>Ещё раз</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="blitz-mode">
      <div className="blitz-header">
        <div className="blitz-timer">
          <Timer size={20} />
          <span className={blitzTimeLeft < 10 ? 'low-time' : ''}>{blitzTimeLeft}с</span>
        </div>
        <div className="blitz-current-score"><Zap size={20} /><span>Счёт: {blitzScore}</span></div>
      </div>

      <div className={`blitz-card ${feedback || ''}`}>
        {!blitzData ? (
          <div className="blitz-loading"><Zap className="spinner" size={48} /><p>Загрузка...</p></div>
        ) : (
          <>
            <div className="blitz-topic">{currentQuestion?.category} · {currentQuestion?.difficulty}</div>
            <h2 className="blitz-statement">{blitzData.statement}</h2>
            <div className="blitz-actions">
              <button className="blitz-btn false-btn" onClick={() => handleAnswer(false)} disabled={!!feedback} type="button">
                <X size={24} /><span>Ложь</span>
              </button>
              <button className="blitz-btn true-btn" onClick={() => handleAnswer(true)} disabled={!!feedback} type="button">
                <Check size={24} /><span>Правда</span>
              </button>
            </div>
          </>
        )}
      </div>
      <div className="blitz-progress">
        <div className="blitz-progress-fill" style={{ width: `${(blitzTimeLeft / 60) * 100}%` }} />
      </div>
    </div>
  );
};

export default BlitzMode;