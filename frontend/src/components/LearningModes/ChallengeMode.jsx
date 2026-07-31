import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Timer, CheckCircle, XCircle } from 'lucide-react';
import useStore from '../../store/useStore';
import apiClient from '../../api/client';
import { hasRealDistractors, realDistractors } from '../../utils/stubOptions';
import './ChallengeMode.css';

// Shuffle an array without mutating it
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ChallengeMode = ({ onBack, onLeaderboard }) => {
  const { t } = useTranslation();
  const { questions, currentIndex, loadQuestions, language, fetchGeneration } = useStore();
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [showFeedback, setShowFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(300);
  const [finished, setFinished] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const timerRef = useRef(null);
  const requestedRef = useRef(new Set());

  // Stub-only option sets make the answer obvious — generate real options on
  // demand (same lazy path as TestMode), once per question.
  const q = questions[currentIndex];
  const opts = q?.options;
  const genError = opts?.__error;

  useEffect(() => {
    if (!q) return;
    if (genError) return;
    if (Array.isArray(opts) && opts.length > 0 && hasRealDistractors(opts, q.shortAnswer)) return;
    if (requestedRef.current.has(q.id)) return;
    requestedRef.current.add(q.id);
    fetchGeneration('test', q.id).catch(() => { });
  }, [q?.id, q?.options, genError, fetchGeneration]); // eslint-disable-line

  // 4 shuffled options: correct answer + up to 3 real distractors.
  const displayOptions = useMemo(() => {
    if (!q) return [];
    const wrongs = realDistractors(q.options, q.shortAnswer).slice(0, 3);
    if (wrongs.length < 3) return [];
    return shuffle([q.shortAnswer, ...wrongs]);
  }, [q?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const retryGeneration = () => {
    if (!q) return;
    requestedRef.current.delete(q.id);
    useStore.setState(s => ({
      questions: s.questions.map(x => x.id === q.id ? { ...x, options: null } : x),
    }));
    fetchGeneration('test', q.id, 0).catch(() => { });
  };

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
            {genError ? (
              <div className="challenge-loading">
                <p>{genError.message}</p>
                <div className="challenge-result-actions">
                  <button className="challenge-btn" onClick={retryGeneration}>{t('common.retry', 'Try again')}</button>
                  <button className="challenge-btn secondary" onClick={() => useStore.getState().advanceQuestion()}>
                    {t('test.skip', 'Skip question')}
                  </button>
                </div>
              </div>
            ) : displayOptions.length > 0 ? (
              <div className="challenge-options">
                {displayOptions.map((opt, i) => (
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
            ) : (
              <div className="challenge-loading">{t('test.generating_options', 'Answer options are still being generated')}</div>
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
