import React, { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import { Check, X, Loader2 } from 'lucide-react';
import './TestMode.css';

const TestMode = () => {
  const {
    questions,
    currentIndex,
    submitTestAnswer,
    advanceQuestion,
    isLoadingQuestions,
    hasMoreQuestions,
    fetchGeneration,
    pendingGenerations,
  } = useStore();

  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [generationError, setGenerationError] = useState(null);

  const currentQuestion = questions[currentIndex];

  // Derive the generation key for this question so we can check pending state
  const genKey = currentQuestion
    ? `test:${currentQuestion.id}:${currentQuestion.language || 'Java'}`
    : null;

  const isGenerating = genKey ? !!pendingGenerations?.[genKey] : false;

  // Determine whether this question actually has usable options
  const hasOptions =
    Array.isArray(currentQuestion?.options) && currentQuestion.options.length >= 2;

  useEffect(() => {
    setSelectedOption(null);
    setResult(null);
    setGenerationError(null);

    // Only trigger generation if the question exists and has no options yet
    if (currentQuestion && !hasOptions) {
      fetchGeneration('test', currentQuestion.id).catch((err) => {
        setGenerationError(err?.message || 'Не удалось загрузить варианты ответов');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentQuestion?.id]);

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
      // Note: store no longer auto-advances. For incorrect answers the store
      // opens the ExplanationModal; closeExplanation() will call advanceQuestion().
      // For correct answers we show feedback here and user taps "Next".
    } catch (err) {
      console.error('Error submitting answer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    setResult(null);
    setSelectedOption(null);
    advanceQuestion();
  };

  // ── Loading states ──────────────────────────────────────────────────
  if (isLoadingQuestions) {
    return (
      <div className="test-mode-loading">
        <Loader2 className="spinner" size={44} />
        <p>Загрузка вопросов…</p>
      </div>
    );
  }

  if (!hasMoreQuestions()) return null; // App.jsx shows completion screen

  if (!currentQuestion) return null;

  // ── Question exists but options aren't ready yet ────────────────────
  if (!hasOptions) {
    if (generationError) {
      return (
        <div className="test-mode-loading">
          <div className="test-error-icon">⚠️</div>
          <p className="test-error-text">{generationError}</p>
          <button
            className="retry-button"
            onClick={() => {
              setGenerationError(null);
              fetchGeneration('test', currentQuestion.id).catch((err) => {
                setGenerationError(err?.message || 'Ошибка');
              });
            }}
          >
            Повторить
          </button>
        </div>
      );
    }

    // Actively generating — show a descriptive loader instead of a broken form
    return (
      <div className="test-mode-loading">
        <Loader2 className="spinner" size={44} />
        <p>Генерация вариантов…</p>
        <span className="test-loading-hint">
          {currentQuestion.category} · {currentQuestion.difficulty}
        </span>
      </div>
    );
  }

  // ── Render question with options ─────────────────────────────────────
  return (
    <div className="test-mode">
      <div className="test-card">
        <div className="test-category">
          {currentQuestion.category} · {currentQuestion.difficulty}
        </div>

        <h2 className="test-question">{currentQuestion.question}</h2>

        <div className="options-list">
          {currentQuestion.options.map((option, index) => {
            let cls = 'option-item';
            if (selectedOption === option) cls += ' selected';
            if (result) {
              const norm = (s) => s?.trim().toLowerCase() ?? '';
              if (norm(option) === norm(result.correctAnswer)) cls += ' correct';
              else if (selectedOption === option && !result.isCorrect) cls += ' incorrect';
            }

            return (
              <button
                key={index}
                className={cls}
                onClick={() => handleOptionSelect(option)}
                disabled={!!result}
                type="button"
              >
                <span className="option-letter">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="option-text">{option}</span>
                {result && (option?.trim().toLowerCase() === result.correctAnswer?.trim().toLowerCase()) && (
                  <Check size={18} className="result-icon check" />
                )}
                {result && selectedOption === option && !result.isCorrect && (
                  <X size={18} className="result-icon cross" />
                )}
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
            {isSubmitting ? <Loader2 className="spinner" size={18} /> : 'Ответить'}
          </button>
        ) : (
          <div className="test-result-feedback">
            {result.isCorrect ? (
              <div className="feedback-correct">
                <Check size={22} />
                <span>Правильно!</span>
              </div>
            ) : (
              <div className="feedback-incorrect">
                <X size={22} />
                <span>Не совсем…</span>
              </div>
            )}
            {result.isCorrect && (
              <button className="next-test-button" onClick={handleNext} type="button">
                Следующий вопрос
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestMode;