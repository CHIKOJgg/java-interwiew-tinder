import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Timer, CheckCircle, XCircle } from 'lucide-react';
import useStore from '../../store/useStore';
import apiClient from '../../api/client';
import { hasRealDistractors } from '../../utils/stubOptions';
import { buildTestOptions } from '../../utils/fallbackOptions';
import './ChallengeMode.css';

const ChallengeMode = ({ onBack, onLeaderboard }) => {
  const { t } = useTranslation();
  const { questions, currentIndex, loadQuestions, language, fetchGeneration, distractorPool, loadDistractors } = useStore();
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [showFeedback, setShowFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(300);
  const [finished, setFinished] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const timerRef = useRef(null);
  const requestedRef = useRef(new Set());

  // Stub-only option sets make the answer obvious — generate real options on
  // demand (same lazy path as TestMode), once per question. The local pool
  // renders instant fallback options meanwhile.
  const q = questions[currentIndex];
  const opts = q?.options;

  useEffect(() => {
    loadDistractors().catch(() => { });
  }, [loadDistractors, language]);

  useEffect(() => {
    if (!q) return;
    if (Array.isArray(opts) && opts.length > 0 && hasRealDistractors(opts, q.shortAnswer)) return;
    if (requestedRef.current.has(q.id)) return;
    requestedRef.current.add(q.id);
    fetchGeneration('test', q.id).catch(() => { });
  }, [q?.id, q?.options, fetchGeneration]); // eslint-disable-line

  // 4 shuffled options: correct answer + up to 3 distractors (real AI ones
  // when available, otherwise local fallback). Cached per question so the
  // shown options never reshuffle mid-question.
  const builtOptionsRef = useRef(new Map());
  const displayOptions = useMemo(() => {
    if (!q) return [];
    const qid = q.id;
    if (builtOptionsRef.current.has(qid)) return builtOptionsRef.current.get(qid);
    const built = buildTestOptions(q, distractorPool);
    if (built.length > 0) {
      builtOptionsRef.current.set(qid, built);
      if (builtOptionsRef.current.size > 20) {
        builtOptionsRef.current.delete(builtOptionsRef.current.keys().next().value);
      }
    }
    return built;
  }, [q, distractorPool]);

  useEffect(() => {
    apiClient.getCurrentChallenge(language).then(r => setChallenge(r.challenge)).catch(() => {});
    loadQuestions();    timerRef.current = setInterval(() => {
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
            {displayOptions.length > 0 ? (
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
