import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import { Timer, Zap, Check, X, Trophy, Play } from 'lucide-react';
import './BlitzMode.css';


// Generate a True/False statement from existing question data — no AI wait needed.
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
    questions,
    currentIndex,
    blitzScore,
    blitzTimeLeft,
    isBlitzActive,
    blitzIdle,
    startBlitz,
    decrementBlitzTime,
    submitBlitzAnswer,
    isLoadingQuestions,
    fetchGeneration,
    advanceQuestion,
  } = useStore();
  const { t } = useTranslation();

  const [feedback, setFeedback] = useState(null); // 'correct' | 'incorrect'
  const [localBlitzData, setLocalBlitzData] = useState(null);

  useEffect(() => {
    if (!isBlitzActive) return;
    const timer = setInterval(() => {
      decrementBlitzTime();
    }, 1000);
    return () => clearInterval(timer);
  }, [isBlitzActive, decrementBlitzTime]);

  const currentQuestion = questions[currentIndex];
  const aiBlitzData = currentQuestion?.blitzData;
  const hasError = aiBlitzData?.__error;
  // Use AI data if valid, otherwise use locally-generated fallback
  const blitzData = (aiBlitzData && !hasError) ? aiBlitzData : localBlitzData;

  useEffect(() => {
    if (!isBlitzActive || !currentQuestion) return;
    // Generate fallback data immediately (no loading state)
    setLocalBlitzData(makeFallbackBlitzData(currentQuestion));
    // Also request AI-generated statement in background
    if (!blitzData && !hasError) {
      fetchGeneration('blitz', currentQuestion.id).catch(() => { });
    }
  }, [isBlitzActive, currentIndex, currentQuestion?.id]); // eslint-disable-line

  const handleAnswer = async (answer) => {
    if (!isBlitzActive || feedback) return;
    const q = questions[currentIndex];
    if (!q) return;

    // Evaluate locally using whatever blitzData we have (AI or fallback)
    const blitzData = q.blitzData && !q.blitzData.__error ? q.blitzData : localBlitzData;
    if (!blitzData) return;

    const correct = Boolean(answer) === Boolean(blitzData.isCorrect);
    setFeedback(correct ? 'correct' : 'incorrect');

    // Score locally, fire server call for record-keeping (non-blocking)
    submitBlitzAnswer(q.id, answer, correct);

    setTimeout(() => {
      setFeedback(null);
      setLocalBlitzData(null);
      advanceQuestion();
    }, 350);
  };

  if (!isBlitzActive && blitzIdle) {
    return (
      <div className="blitz-start-screen">
        <div className="blitz-start-card">
          <Zap size={64} className="zap-icon" />
          <h1>{t('blitz.title', 'Blitz Mode')}</h1>
          <p>{t('blitz.description', 'Answer as many questions as possible in 60 seconds. True or False only!')}</p>
          <button className="start-blitz-button" onClick={startBlitz}>
            <Play size={20} />
            <span>{t('blitz.start', 'Go!')}</span>
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
          <h1>{t('blitz.time_up', 'Time Up!')}</h1>
          <div className="final-score">
            <span>{t('blitz.result', 'Your score:')}</span>
            <strong>{blitzScore}</strong>
          </div>
          <button className="retry-blitz-button" onClick={startBlitz}>
            {t('blitz.retry', 'Try Again')}
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
        <div className="blitz-current-score">
          <Zap size={20} />
          <span>Счет: {blitzScore}</span>
        </div>
      </div>

      <div className={`blitz-card ${feedback}`}>
        {!blitzData ? (
          <div className="blitz-loading">
            <Zap className="spinner" size={48} />
            <p style={{ marginTop: 8 }}>Загрузка...</p>
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