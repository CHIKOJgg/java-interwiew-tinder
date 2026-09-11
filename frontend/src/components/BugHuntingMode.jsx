import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import { Bug, Check, X, Loader2, AlertTriangle, FastForward, Sparkles } from 'lucide-react';
import { highlight } from '../utils/highlight';
import { getFallbackBug } from '../utils/fallbackBugs';
import DOMPurify from 'dompurify';
import '../utils/highlight.css';
import './BugHuntingMode.css';

const BugHuntingMode = () => {
  const { questions, currentIndex, submitBugHuntAnswer, isLoadingQuestions,
    hasMoreQuestions, fetchGeneration, applyGenerationData, advanceQuestion, language } = useStore();
  const { t } = useTranslation();

  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const currentQuestion = questions[currentIndex];
  const bugData = currentQuestion?.bugHuntingData;
  const hasError = bugData?.__error;

  const codeLanguage = { Java: 'java', Python: 'python', TypeScript: 'typescript', Go: 'go' }[language] || 'java';

  // §5 — syntax-highlight the buggy code snippet
  const highlightedCode = useMemo(
    () => bugData?.code ? highlight(bugData.code, codeLanguage) : '',
    [bugData?.code, codeLanguage]
  );

  // Deterministically shuffle options so correct answer isn't always first
  const shuffledOptions = useMemo(() => {
    if (!bugData?.options || !Array.isArray(bugData.options)) return [];
    const arr = [...bugData.options];
    let seed = (Number(currentQuestion?.id) || 1) * 37 + 13;
    for (let i = arr.length - 1; i > 0; i--) {
      seed = (seed * 9301 + 49297) % 233280;
      const j = Math.floor((seed / 233280) * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [bugData?.options, currentQuestion?.id]);

  useEffect(() => {
    setSelectedOption(null);
    setResult(null);
    setSubmitError(null);

    if (currentQuestion && !bugData) {
      fetchGeneration('bug', currentQuestion.id).catch(() => {});

      // Fallback timer: never hang more than 2.5s on loading
      const timer = setTimeout(() => {
        const q = useStore.getState().questions[currentIndex];
        if (q && !q.bugHuntingData) {
          const fallback = getFallbackBug(language, currentQuestion.id);
          applyGenerationData('bug', currentQuestion.id, fallback);
        }
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, currentQuestion?.id, bugData, language]); // eslint-disable-line

  const handleApplyInstantFallback = () => {
    if (!currentQuestion) return;
    const fallback = getFallbackBug(language, currentQuestion.id);
    applyGenerationData('bug', currentQuestion.id, fallback);
  };

  const handleSubmit = async () => {
    if (!selectedOption || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      let isCorrect = false;
      let correctAnswer = bugData?.bug || bugData?.correctAnswer;
      try {
        const response = await submitBugHuntAnswer(currentQuestion.id, selectedOption);
        isCorrect = response.isCorrect;
        correctAnswer = response.correctAnswer || correctAnswer;
      } catch (apiErr) {
        // If server 404s (e.g. client fallback question), evaluate locally
        if (correctAnswer) {
          const norm = s => (s || '').trim().toLowerCase();
          isCorrect = norm(selectedOption) === norm(correctAnswer);
        } else {
          throw apiErr;
        }
      }
      setResult({ isCorrect, correctAnswer });
    } catch (err) {
      console.error('Bug hunt submit error:', err);
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

  if (isLoadingQuestions) return <LoadingCard text={t('common.loading_questions', 'Loading questions...')} />;
  if (!currentQuestion) return <LoadingCard text={t('common.loading_questions', 'Loading questions...')} />;

  if (hasError) return (
    <div className="bug-mode-loading error">
      <AlertTriangle size={40} />
      <p>{bugData.message}</p>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button className="retry-btn" onClick={() => fetchGeneration('bug', currentQuestion.id, 0)}>
          {t('common.retry', 'Try again')}
        </button>
        <button className="retry-btn" style={{ background: 'var(--yellow, #ffd43b)' }} onClick={handleApplyInstantFallback}>
          {t('bug.instant_play', 'Стандартный фрагмент')}
        </button>
        <button className="retry-btn" onClick={handleNext}>
          {t('common.skip', 'Пропустить')} →
        </button>
      </div>
    </div>
  );

  if (!bugData) {
    return (
      <div className="bug-mode-loading">
        <Loader2 className="spinner" size={48} />
        <p>{t('bug.preparing_code', 'Preparing code snippet...')}</p>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            type="button"
            className="retry-btn"
            style={{ background: 'var(--yellow, #ffd43b)', color: 'var(--ink, #000)' }}
            onClick={handleApplyInstantFallback}
          >
            <Sparkles size={16} /> {t('bug.instant_play', 'Загрузить мгновенно')}
          </button>
          <button
            type="button"
            className="retry-btn"
            onClick={handleNext}
          >
            <FastForward size={16} /> {t('common.skip', 'Пропустить')} →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bug-hunting-mode">
      <div className="bug-card">
        <div className="bug-header">
          <div className="bug-badge"><Bug size={14} /><span>Bug Hunt</span></div>
          <span className="bug-category">{currentQuestion.category}</span>
        </div>

        <p className="bug-instruction">{t('bug.find_bug', 'Find the bug in this code:')}</p>

        {/* §5 — highlighted code block */}
        <div
          className="hl-code-block bug-code"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(highlightedCode) }}
        />

        <div className="options-list">
          {shuffledOptions.map((option, index) => {
            let cls = 'option-item';
            if (selectedOption === option) cls += ' selected';
            if (result) {
              const norm = s => (s || '').trim().toLowerCase();
              if (norm(option) === norm(result.correctAnswer)) cls += ' correct';
              else if (selectedOption === option && !result.isCorrect) cls += ' incorrect';
            }
            return (
              <button key={index} className={cls}
                onClick={() => !result && !isSubmitting && setSelectedOption(option)}
                disabled={!!result}>
                <span className="option-text">{option}</span>
                {result && (option || '').trim().toLowerCase() === (result.correctAnswer || '').trim().toLowerCase() && <Check size={16} />}
                {result && selectedOption === option && !result.isCorrect && <X size={16} />}
              </button>
            );
          })}
        </div>

        {!result ? (
          <>
            {submitError && <div className="mode-error" role="alert">⚠️ {submitError}</div>}
            <button className="submit-bug-button" disabled={!selectedOption || isSubmitting} onClick={handleSubmit} type="button">
              {isSubmitting ? <Loader2 className="spinner" size={18} /> : t('bug.check', 'Check')}
            </button>
          </>
        ) : (
          <div className="bug-result-feedback">
            {result.isCorrect
              ? <div className="feedback-correct"><Check size={18} /><span>{t('bug.correct', 'Correct! You found the bug.')}</span></div>
              : <div className="feedback-incorrect"><X size={18} /><span>{t('bug.incorrect', 'Incorrect. Correct:')} <strong>{result.correctAnswer}</strong></span></div>
            }
            <button className="next-bug-button" onClick={handleNext}>
              {t('bug.next_task', 'Next task →')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const LoadingCard = ({ text }) => (
  <div className="bug-mode-loading">
    <Loader2 className="spinner" size={48} />
    <p>{text}</p>
  </div>
);

export default BugHuntingMode;
