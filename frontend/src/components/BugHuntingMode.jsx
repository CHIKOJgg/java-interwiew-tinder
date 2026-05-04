import React, { useState, useEffect, useMemo } from 'react';
import useStore from '../store/useStore';
import { Bug, Check, X, Loader2, AlertTriangle } from 'lucide-react';
import { highlight } from '../utils/highlight';
import '../utils/highlight.css';
import './BugHuntingMode.css';

const BugHuntingMode = () => {
  const { questions, currentIndex, submitBugHuntAnswer, isLoadingQuestions,
    hasMoreQuestions, fetchGeneration, language } = useStore();

  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const currentQuestion = questions[currentIndex];
  const bugData = currentQuestion?.bugHuntingData;
  const hasError = bugData?.__error;

  const codeLanguage = { Java: 'java', Python: 'python', TypeScript: 'typescript' }[language] || 'java';

  // §5 — syntax-highlight the buggy code snippet
  const highlightedCode = useMemo(
    () => bugData?.code ? highlight(bugData.code, codeLanguage) : '',
    [bugData?.code, codeLanguage]
  );

  useEffect(() => {
    setSelectedOption(null);
    setResult(null);
    if (currentQuestion && !bugData) {
      fetchGeneration('bug', currentQuestion.id);
    }
  }, [currentIndex, currentQuestion?.id]); // eslint-disable-line

  const handleSubmit = async () => {
    if (!selectedOption || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await submitBugHuntAnswer(currentQuestion.id, selectedOption);
      setResult({ isCorrect: response.isCorrect, correctAnswer: response.correctAnswer });
    } catch (err) {
      console.error('Bug hunt submit error:', err);
      setResult({ isCorrect: false, correctAnswer: bugData?.bug || '?' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => { setResult(null); setSelectedOption(null); };

  if (isLoadingQuestions) return <LoadingCard text="Загрузка вопросов..." />;
  if (!hasMoreQuestions()) return null;

  if (hasError) return (
    <div className="bug-mode-loading">
      <AlertTriangle size={40} color="#ff6b6b" />
      <p style={{ color: '#ff6b6b', marginTop: 12, textAlign: 'center' }}>{bugData.message}</p>
      <button className="retry-btn" onClick={() => fetchGeneration('bug', currentQuestion.id, 0)}>
        Попробовать снова
      </button>
    </div>
  );

  if (!bugData) return <LoadingCard text="Подготовка кода..." />;

  return (
    <div className="bug-hunting-mode">
      <div className="bug-card">
        <div className="bug-header">
          <div className="bug-badge"><Bug size={14} /><span>Bug Hunt</span></div>
          <span className="bug-category">{currentQuestion.category}</span>
        </div>

        <p className="bug-instruction">Найди баг в коде:</p>

        {/* §5 — highlighted code block */}
        <div
          className="hl-code-block bug-code"
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />

        <div className="bug-options">
          {bugData.options?.map((option, index) => {
            let cls = 'bug-option';
            if (selectedOption === option) cls += ' selected';
            if (result) {
              const norm = (s) => s?.trim().toLowerCase() ?? '';
              if (norm(option) === norm(result.correctAnswer)) cls += ' correct';
              else if (selectedOption === option && !result.isCorrect) cls += ' incorrect';
            }
            return (
              <button key={index} className={cls}
                onClick={() => !result && !isSubmitting && setSelectedOption(option)}
                disabled={!!result}>
                <span className="option-text">{option}</span>
                {result && option?.trim().toLowerCase() === result.correctAnswer?.trim().toLowerCase() && <Check size={16} />}
                {result && selectedOption === option && !result.isCorrect && <X size={16} />}
              </button>
            );
          })}
        </div>

        {!result ? (
          <button className="submit-bug-button" disabled={!selectedOption || isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? <Loader2 className="spinner" size={18} /> : 'Проверить'}
          </button>
        ) : (
          <div className="bug-result-feedback">
            {result.isCorrect
              ? <div className="feedback-correct"><Check size={18} /><span>Верно! Вы нашли баг.</span></div>
              : <div className="feedback-incorrect"><X size={18} /><span>Неверно. Правильно: <strong>{result.correctAnswer}</strong></span></div>
            }
            {/* §11 — next button always appears, not only on correct */}
            <button className="next-bug-button" onClick={handleNext}>
              Следующая задача →
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