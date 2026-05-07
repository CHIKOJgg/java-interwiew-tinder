import React, { useState, useEffect, useMemo } from 'react';
import useStore from '../store/useStore';
import { Code2, Check, X, Loader2, Braces, AlertTriangle } from 'lucide-react';
import { highlight } from '../utils/highlight';
import '../utils/highlight.css';
import './CodeCompletionMode.css';

// Render a code snippet that has ___ as the blank.
// Before selection: shows '___'. After selection: shows the chosen option highlighted.
function SnippetBlock({ snippet, selected, result, codeLanguage }) {
  const parts = (snippet || '').split('___');

  // Build the full code string for highlighting, replacing ___ with the selected or blank token
  const placeholder = result
    ? (result.isCorrect ? selected : selected)  // always show what was chosen
    : (selected || '___');

  const fullCode = parts.join(placeholder);

  const html = useMemo(() => highlight(fullCode, codeLanguage), [fullCode, codeLanguage]);

  return (
    <div
      className="hl-code-block snippet-block"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

const CodeCompletionMode = () => {
  const { questions, currentIndex, submitCodeCompletionAnswer, isLoadingQuestions,
    hasMoreQuestions, fetchGeneration, language } = useStore();

  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const currentQuestion = questions[currentIndex];
  const completionData = currentQuestion?.codeCompletionData;
  const hasError = completionData?.__error;
  const codeLanguage = { Java: 'java', Python: 'python', TypeScript: 'typescript' }[language] || 'java';

  useEffect(() => {
    setSelectedOption(null);
    setResult(null);
    if (currentQuestion && !completionData) {
      fetchGeneration('code', currentQuestion.id);
    }
  }, [currentIndex, currentQuestion?.id]); // eslint-disable-line

  const handleSubmit = async () => {
    if (!selectedOption || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await submitCodeCompletionAnswer(currentQuestion.id, selectedOption);
      setResult({ isCorrect: response.isCorrect, correctAnswer: response.correctAnswer });
    } catch (err) {
      console.error('Code completion submit error:', err);
      setResult({ isCorrect: false, correctAnswer: completionData?.correctPart || '?' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    setResult(null);
    setSelectedOption(null);
    advanceQuestion();
  };

  if (isLoadingQuestions) return <LoadingCard text="Загрузка вопросов..." />;
  if (!hasMoreQuestions()) return null;

  if (hasError) return (
    <div className="completion-mode-loading">
      <AlertTriangle size={40} color="#ff6b6b" />
      <p style={{ color: '#ff6b6b', marginTop: 12, textAlign: 'center' }}>{completionData.message}</p>
      <button className="retry-btn" onClick={() => fetchGeneration('code', currentQuestion.id, 0)}>
        Попробовать снова
      </button>
    </div>
  );

  if (!completionData) return <LoadingCard text="Подготовка кода..." />;

  return (
    <div className="code-completion-mode">
      <div className="completion-card">
        <div className="completion-header">
          <div className="completion-badge"><Braces size={14} /><span>Code Completion</span></div>
          <span className="topic-badge">{currentQuestion.category}</span>
        </div>

        <p className="completion-instruction">Выбери правильное продолжение:</p>

        {/* §5 — syntax-highlighted snippet with ___ replaced */}
        <SnippetBlock
          snippet={completionData.snippet}
          selected={selectedOption}
          result={result}
          codeLanguage={codeLanguage}
        />

        <div className="options-grid">
          {completionData.options?.map((option, index) => {
            let cls = 'completion-option';
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
                <code>{option}</code>
              </button>
            );
          })}
        </div>

        {!result ? (
          <button className="submit-completion-button"
            disabled={!selectedOption || isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? <Loader2 className="spinner" size={18} /> : 'Завершить'}
          </button>
        ) : (
          <div className="completion-result-feedback">
            {result.isCorrect
              ? <div className="feedback-correct"><Check size={18} /><span>Идеально!</span></div>
              : <div className="feedback-incorrect"><X size={18} />
                <span>Неверно. Правильно: <code>{result.correctAnswer}</code></span>
              </div>
            }
            {/* §12 — next button always appears */}
            <button className="next-completion-button" onClick={handleNext}>
              Следующий фрагмент →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const LoadingCard = ({ text }) => (
  <div className="completion-mode-loading">
    <Loader2 className="spinner" size={48} />
    <p>{text}</p>
  </div>
);

export default CodeCompletionMode;