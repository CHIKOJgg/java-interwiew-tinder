import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Timer, CheckCircle, XCircle } from 'lucide-react';
import useStore from '../../store/useStore';
import apiClient from '../../api/client';
import './ChallengeMode.css';

const ChallengeMode = ({ onBack, onLeaderboard }) => {
  const { t } = useTranslation();
  const { questions, currentIndex, loadQuestions, language } = useStore();
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [showFeedback, setShowFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(300);
  const [finished, setFinished] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    apiClient.getCurrentChallenge(language).then(r => setChallenge(r.challenge)).catch(() => {});
    loadQuestions();
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (finished && challenge) {
      const accuracy = answered > 0 ? Math.round((score / answered) * 100) : 0;
      apiClient.submitChallengeResult(challenge.id, score, answered, accuracy).catch(() => {});
    }
  }, [finished]);

  const handleAnswer = async (answer) => {
    const q = questions[currentIndex];
    if (!q) return;
    try {
      const res = await apiClient.submitTestAnswer(q.id, answer);
      if (res.isCorrect) setScore(s => s + 1);
      setAnswered(a => a + 1);
      setShowFeedback(res.isCorrect ? 'correct' : 'wrong');
      setTimeout(() => {
        setShowFeedback(null);
        useStore.getState().advanceQuestion();
      }, 800);
    } catch {
      useStore.getState().advanceQuestion();
    }
  };

  const q = questions[currentIndex];
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  if (finished) {
    const accuracy = answered > 0 ? Math.round((score / answered) * 100) : 0;
    return (
      <div className="challenge-result">
        <Trophy size={48} />
        <h2>{t('challenges.done', 'Challenge Complete!')}</h2>
        <div className="challenge-final-score">{score}/{answered}</div>
        <div className="challenge-accuracy">{accuracy}% {t('challenges.accuracy', 'accuracy')}</div>
        <div className="challenge-result-actions">
          <button className="challenge-btn" onClick={onLeaderboard}>{t('challenges.leaderboard', 'Leaderboard')}</button>
          <button className="challenge-btn secondary" onClick={onBack}>{t('common.back', 'Back')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="challenge-mode">
      <div className="challenge-header">
        <div className="challenge-timer">
          <Timer size={16} />
          <span>{mins}:{secs.toString().padStart(2, '0')}</span>
        </div>
        <div className="challenge-score">{score}/{answered}</div>
      </div>

      <div className="challenge-card">
        {q ? (
          <>
            <div className="challenge-q-category">{q.category}</div>
            <div className="challenge-q-text">{q.question}</div>
            {q.options && q.options.length > 0 && (
              <div className="challenge-options">
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    className={`challenge-option ${showFeedback === 'correct' ? 'correct' : showFeedback === 'wrong' ? 'wrong' : ''}`}
                    onClick={() => !showFeedback && handleAnswer(opt)}
                    disabled={!!showFeedback}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="challenge-loading">{t('common.loading', 'Loading...')}</div>
        )}
      </div>
    </div>
  );
};

export default ChallengeMode;
