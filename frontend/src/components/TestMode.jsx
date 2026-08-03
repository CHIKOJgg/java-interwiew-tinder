import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import { Check, X, Loader2, AlertCircle } from 'lucide-react';
import { hasRealDistractors } from '../utils/stubOptions';
import { buildTestOptions } from '../utils/fallbackOptions';
import './TestMode.css';

const TestMode = () => {
  const {
    questions,
    currentIndex,
    submitTestAnswer,
    advanceQuestion,
    isLoadingQuestions,
    fetchGeneration,
    distractorPool,
    loadDistractors,
    language,
  } = useStore();
  const { t } = useTranslation();

  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const currentQuestion = questions[currentIndex];

  // Keep the local distractor pool warm so Test mode renders options
  // instantly — real AI options still arrive in the background.
  useEffect(() => {
    loadDistractors().catch(() => { });
  }, [loadDistractors, language]);

  // Build the 4 shuffled options once per question.
  // The correct answer is always shortAnswer. Prefer real AI-generated
  // distractors; until they exist, fall back to other questions' answers from
  // the pool (never wait on the LLM). Results are cached per question so the
  // options the user sees never get reshuffled mid-question.
  const builtOptionsRef = useRef(new Map());
  const displayOptions = useMemo(() => {
    if (!currentQuestion) return [];
    const qid = currentQuestion.id;
    if (builtOptionsRef.current.has(qid)) return builtOptionsRef.current.get(qid);
    const built = buildTestOptions(currentQuestion, distractorPool);
    if (built.length > 0) {
      builtOptionsRef.current.set(qid, built);
      if (builtOptionsRef.current.size > 20) {
        builtOptionsRef.current.delete(builtOptionsRef.current.keys().next().value);
      }
    }
    return built;
  }, [currentQuestion, distractorPool]);

  // Reset UI when question changes
  const prevIdRef = useRef(null);
  useEffect(() => {
    if (currentQuestion?.id !== prevIdRef.current) {
      prevIdRef.current = currentQuestion?.id;
      setSelectedOption(null);
      setResult(null);
    }
  }, [currentQuestion?.id]);

  // Test options are generated on demand (the backend doesn't pre-fill them).
  // Trigger generation for the current question, but only once per question.
  // Stub-only option sets count as "not ready" too. The local fallback pool
  // keeps the test usable meanwhile; the queue re-requests AI options on
  // advance/submit, so an errored generation retries in the background.
  const requestedRef = useRef(new Set());
  useEffect(() => {
    if (!currentQuestion) return;
    const opts = currentQuestion.options;
    if (Array.isArray(opts) && opts.length > 0 && hasRealDistractors(opts, currentQuestion.shortAnswer)) return; // already ready
    if (opts && opts.__error) return;                   // errored — retried via queue on next answer/advance
    if (requestedRef.current.has(currentQuestion.id)) return;
    requestedRef.current.add(currentQuestion.id);
    fetchGeneration('test', currentQuestion.id).catch(() => { });
  }, [currentQuestion?.id, fetchGeneration]); // eslint-disable-line

  const handleOptionSelect = (option) => {
    if (result || isSubmitting) return;
    setSelectedOption(option);
  };

  const handleSubmit = async () => {
    if (!selectedOption || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await submitTestAnswer(currentQuestion.id, selectedOption);
      setResult({ isCorrect: response.isCorrect, correctAnswer: response.correctAnswer });
    } catch (err) {
      setSubmitError(err?.message || t('common.request_failed', 'Не удалось проверить ответ'));
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

  // genError no longer blocks the question: instant local fallback options are
  // always shown; the AI error only means "improved options will come later".

  if (!displayOptions.length) {
    // Only reachable when even the local distractor pool is empty (first load
    // race / offline) — options are being fetched, wait instead of skipping.
    return (
      <div className="test-mode-loading">
        <Loader2 className="spinner" size={44} />
        <p>{t('test.generating_options', 'Answer options are still being generated')}</p>
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
          <>
            {submitError && <div className="mode-error" role="alert">⚠️ {submitError}</div>}
            <button
              className="submit-test-button"
              disabled={!selectedOption || isSubmitting}
              onClick={handleSubmit}
              type="button"
            >
              {isSubmitting ? <Loader2 className="spinner" size={18} /> : t('test.submit', 'Answer')}
            </button>
          </>
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
