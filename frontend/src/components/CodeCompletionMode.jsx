import React, { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import { Code2, Check, X, Loader2, Braces } from 'lucide-react';
import './CodeCompletionMode.css';

const CodeCompletionMode = () => {
  const {
    questions,
    currentIndex,
    submitCodeCompletionAnswer,
    isLoadingQuestions,
    hasMoreQuestions,
    fetchGeneration,
    // advanceQuestion moves currentIndex without auto-advancing from the store
    advanceQuestion,
  } = useStore();

  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [genError, setGenError] = useState(null);

  const currentQuestion = questions[currentIndex];
  const completionData = currentQuestion?.codeCompletionData;

  // Track the question ID we last reset state for — only reset when question changes,
  // NOT when completionData arrives (which is what caused Завершить to appear broken).
  const lastResetIdRef = useRef(null);

  useEffect(() => {
    const id = currentQuestion?.id;
    if (id !== lastResetIdRef.current) {
      lastResetIdRef.current = id;
      setSelectedOption(null);
      setResult(null);
      setGenError(null);
    }
  }, [currentQuestion?.id]);

  // Separate effect: trigger generation when completionData is absent
  useEffect(() => {
    if (currentQuestion && !completionData && !result) {
      fetchGeneration('code', currentQuestion.id).catch((err) => {
        setGenError(err?.message || 'Не удалось загрузить задание');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.id, !!completionData]);

  const handleOptionSelect = (option) => {
    if (result || isSubmitting) return;
    setSelectedOption(option);
  };

  const handleSubmit = async () => {
    if (!selectedOption || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await submitCodeCompletionAnswer(currentQuestion.id, selectedOption);
      // Set result FIRST — store action no longer auto-advances on correct,
      // so currentIndex won't change until handleNext / explanation closes.
      setResult({
        isCorrect: response.isCorrect,
        correctAnswer: response.correctAnswer,
      });
    } catch (err) {
      console.error('Error submitting code completion answer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // User taps "Next fragment" after a correct answer
  const handleNext = () => {
    advanceQuestion();         // move currentIndex in store
    setResult(null);
    setSelectedOption(null);
  };

  // ── Loading states ───────────────────────────────────────────────────
  if (isLoadingQuestions) {
    return (
      <div className="completion-mode-loading">
        <Loader2 className="spinner" size={44} />
        <p>Загрузка вопросов…</p>
      </div>
    );
  }

  if (!hasMoreQuestions()) return null;

  if (!currentQuestion) return null;

  if (!completionData) {
    if (genError) {
      return (
        <div className="completion-mode-loading">
          <span style={{ fontSize: 32 }}>⚠️</span>
          <p style={{ color: '#c92a2a', fontSize: 14 }}>{genError}</p>
          <button
            className="retry-gen-button"
            onClick={() => {
              setGenError(null);
              fetchGeneration('code', currentQuestion.id).catch((e) => setGenError(e?.message || 'Ошибка'));
            }}
          >
            Повторить
          </button>
        </div>
      );
    }
    return (
      <div className="completion-mode-loading">
        <Loader2 className="spinner" size={44} />
        <p>Подготовка кода…</p>
        <span className="gen-hint">{currentQuestion.category} · {currentQuestion.difficulty}</span>
      </div>
    );
  }

  // ── Highlight the ___ placeholder in the snippet ────────────────────
  const normalize = (s) => s?.trim().toLowerCase() ?? '';

  const renderedSnippet = completionData.snippet.split('___').map((part, i, arr) => (
    <React.Fragment key={i}>
      {part}
      {i < arr.length - 1 && (
        <span
          className={[
            'code-placeholder',
            selectedOption ? 'has-selection' : '',
            result
              ? normalize(selectedOption) === normalize(result.correctAnswer)
                ? 'correct'
                : 'incorrect'
              : '',
          ].filter(Boolean).join(' ')}
        >
          {selectedOption || '___'}
        </span>
      )}
    </React.Fragment>
  ));

  return (
    <div className="code-completion-mode">
      <div className="completion-card">
        <div className="completion-header">
          <div className="completion-badge">
            <Braces size={16} />
            <span>Code Completion</span>
          </div>
          <div className="topic-badge">{currentQuestion.category}</div>
        </div>

        <div className="snippet-container">
          <div className="snippet-header">
            <Code2 size={14} />
            <span>Java Fragment</span>
          </div>
          <pre className="snippet-block">
            <code>{renderedSnippet}</code>
          </pre>
        </div>

        <div className="completion-instruction">Выберите правильное продолжение:</div>

        <div className="options-grid">
          {completionData.options?.map((option, index) => {
            const isCorrectOpt = normalize(option) === normalize(result?.correctAnswer);
            const isSelectedWrong = normalize(selectedOption) === normalize(option) && result && !result.isCorrect;

            let cls = 'completion-option';
            if (normalize(selectedOption) === normalize(option) && !result) cls += ' selected';
            if (result) {
              if (isCorrectOpt) cls += ' correct';
              else if (isSelectedWrong) cls += ' incorrect';
            }

            return (
              <button
                key={index}
                className={cls}
                onClick={() => handleOptionSelect(option)}
                disabled={!!result}
                type="button"
              >
                <code>{option}</code>
              </button>
            );
          })}
        </div>

        {!result ? (
          <button
            className="submit-completion-button"
            disabled={!selectedOption || isSubmitting}
            onClick={handleSubmit}
            type="button"
          >
            {isSubmitting ? <Loader2 className="spinner" size={20} /> : 'Завершить код'}
          </button>
        ) : (
          <div className="completion-result-feedback">
            {result.isCorrect ? (
              <div className="feedback-correct">
                <Check size={20} />
                <span>Идеально! Код работает.</span>
              </div>
            ) : (
              <div className="feedback-incorrect">
                <X size={20} />
                <span>Ошибка. Смотрите объяснение.</span>
              </div>
            )}
            {result.isCorrect && (
              <button className="next-completion-button" onClick={handleNext} type="button">
                Следующий фрагмент
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeCompletionMode;