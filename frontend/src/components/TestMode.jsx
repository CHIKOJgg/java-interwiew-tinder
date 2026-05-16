import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import { Check, X, Loader2, AlertCircle } from 'lucide-react';
import './TestMode.css';

// Shuffle an array without mutating it
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const TestMode = () => {
  const {
    questions,
    currentIndex,
    submitTestAnswer,
    advanceQuestion,
    isLoadingQuestions,
  } = useStore();
  const { t } = useTranslation();

  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const currentQuestion = questions[currentIndex];

  // Build the 4 shuffled options once per question.
  // The correct answer is always shortAnswer. The 3 distractors come from options[] in DB.
  // We memo by questionId so the shuffle doesn't change on every render.
  const displayOptions = useMemo(() => {
    if (!currentQuestion) return [];
    const correct = currentQuestion.shortAnswer || '';
    const wrongs = (currentQuestion.options || [])
      .filter(o => (o || '').trim().toLowerCase() !== correct.trim().toLowerCase())
      .slice(0, 3);
    if (!wrongs.length) return [];        // no distractors → not a test question
    return shuffle([correct, ...wrongs]);
  }, [currentQuestion?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset UI when question changes
  const prevIdRef = useRef(null);
  useEffect(() => {
    if (currentQuestion?.id !== prevIdRef.current) {
      prevIdRef.current = currentQuestion?.id;
      setSelectedOption(null);
      setResult(null);
    }
  }, [currentQuestion?.id]);

  const handleOptionSelect = (option) => {
    if (result || isSubmitting) return;
    setSelectedOption(option);
  };

  const handleSubmit = async () => {
    if (!selectedOption || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await submitTestAnswer(currentQuestion.id, selectedOption);
      setResult({ isCorrect: response.isCorrect, correctAnswer: response.correctAnswer });
    } catch (err) {
      console.error('Test submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    setResult(null);
    setSelectedOption(null);
    advanceQuestion();
  };

  // ── States ───────────────────────────────────────────────────────────
  if (isLoadingQuestions) {
    return (
      <div className="test-mode-loading">
        <Loader2 className="spinner" size={44} />
        <p>{t('test.loading_questions', 'Loading questions...')}</p>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="test-mode-loading">
        <AlertCircle size={44} opacity={0.4} />
        <p>{t('test.no_questions', 'No questions available for the test')}</p>
        <p style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>{t('test.generating_options', 'Answer options are still being generated')}</p>
      </div>
    );
  }

  if (!displayOptions.length) {
    // This question has no distractors — skip it automatically
    advanceQuestion();
    return (
      <div className="test-mode-loading">
        <Loader2 className="spinner" size={44} />
        <p>{t('common.loading', 'Loading...')}</p>
      </div>
    );
  }

  const norm = s => (s || '').trim().toLowerCase();

  return (
    <div className="test-mode">
      <div className="test-card">
        <div className="test-category">
          {currentQuestion.category} · {currentQuestion.difficulty}
        </div>

        <h2 className="test-question">{currentQuestion.question}</h2>

        <div className="options-list">
          {displayOptions.map((option, index) => {
            const isCorrectOpt = result && norm(option) === norm(result.correctAnswer);
            const isWrongSelected = result && !result.isCorrect && selectedOption === option;

            let cls = 'option-item';
            if (!result && selectedOption === option) cls += ' selected';
            if (isCorrectOpt) cls += ' correct';
            if (isWrongSelected) cls += ' incorrect';

            return (
              <button
                key={index}
                className={cls}
                onClick={() => handleOptionSelect(option)}
                disabled={!!result}
                type="button"
              >
                <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                <span className="option-text">{option}</span>
                {isCorrectOpt && <Check size={18} className="result-icon check" />}
                {isWrongSelected && <X size={18} className="result-icon cross" />}
              </button>
            );
          })}
        </div>

        {!result ? (
          <button
            className="submit-test-button"
            disabled={!selectedOption || isSubmitting}
            onClick={handleSubmit}
            type="button"
          >
            {isSubmitting ? <Loader2 className="spinner" size={18} /> : t('test.submit', 'Answer')}
          </button>
        ) : (
          <div className="test-result-feedback">
            {result.isCorrect ? (
              <div className="feedback-correct">
                <Check size={22} /><span>{t('test.correct', 'Correct!')}</span>
              </div>
            ) : (
              <div className="feedback-incorrect">
                <X size={22} /><span>{t('test.incorrect', 'Incorrect')}</span>
              </div>
            )}
            <button className="next-test-button" onClick={handleNext} type="button">
              {t('test.next_question', 'Next question →')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestMode;