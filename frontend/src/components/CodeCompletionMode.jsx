import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { Code2, Check, X, Loader2, Braces, AlertTriangle } from 'lucide-react';
import './CodeCompletionMode.css';

const CodeCompletionMode = () => {
  const { questions, currentIndex, submitCodeCompletionAnswer, isLoadingQuestions, hasMoreQuestions, fetchGeneration } = useStore();
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult]   = useState(null);

  const currentQuestion = questions[currentIndex];
  const completionData  = currentQuestion?.codeCompletionData;
  const hasError        = completionData?.__error;

  useEffect(() => {
    setSelectedOption(null);
    setResult(null);
    if (currentQuestion && !completionData) {
      fetchGeneration('code', currentQuestion.id);
    }
  }, [currentIndex, currentQuestion?.id]);   // eslint-disable-line

  const handleSubmit = async () => {
    if (!selectedOption || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await submitCodeCompletionAnswer(currentQuestion.id, selectedOption);
      setResult({ isCorrect: response.isCorrect, correctAnswer: response.correctAnswer });
    } catch (err) {
      console.error('Code completion submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingQuestions) return <LoadingCard text="Загрузка вопросов..." />;
  if (!hasMoreQuestions()) return null;

  // Terminal error state — show instead of infinite spinner
  if (hasError) {
    return (
      <div className="completion-mode-loading">
        <AlertTriangle size={40} color="#ff6b6b" />
        <p style={{ color: '#ff6b6b', marginTop: 12, textAlign: 'center' }}>
          {completionData.message}
        </p>
        <button
          style={{ marginTop: 16, padding: '8px 20px', borderRadius: 10, border: 'none', background: '#339af0', color: '#fff', cursor: 'pointer' }}
          onClick={() => fetchGeneration('code', currentQuestion.id, 0)}
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  // Still loading
  if (!completionData) return <LoadingCard text="Подготовка кода..." />;

  const renderedSnippet = completionData.snippet?.split('___').map((part, i, arr) => (
    <React.Fragment key={i}>
      {part}
      {i < arr.length - 1 && (
        <span className={`code-placeholder ${selectedOption ? 'has-selection' : ''} ${result ? (result.isCorrect ? 'correct' : 'incorrect') : ''}`}>
          {selectedOption || '___'}
        </span>
      )}
    </React.Fragment>
  ));

  return (
    <div className="code-completion-mode">
      <div className="completion-card">
        <div className="completion-header">
          <div className="completion-badge"><Braces size={16} /><span>Code Completion</span></div>
          <div className="topic-badge">{currentQuestion.category}</div>
        </div>

        <div className="snippet-container">
          <div className="snippet-header"><Code2 size={14} /><span>{currentQuestion.language || 'Java'} Fragment</span></div>
          <pre className="snippet-block"><code>{renderedSnippet}</code></pre>
        </div>

        <div className="completion-instruction">Выберите правильное продолжение:</div>

        <div className="options-grid">
          {completionData.options?.map((option, index) => {
            let cls = 'completion-option';
            if (selectedOption === option) cls += ' selected';
            if (result) {
              if (option === result.correctAnswer) cls += ' correct';
              else if (selectedOption === option && !result.isCorrect) cls += ' incorrect';
            }
            return (
              <button key={index} className={cls} onClick={() => !result && !isSubmitting && setSelectedOption(option)} disabled={!!result}>
                <code>{option}</code>
              </button>
            );
          })}
        </div>

        {!result ? (
          <button className="submit-completion-button" disabled={!selectedOption || isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? <Loader2 className="spinner" size={20} /> : 'Завершить код'}
          </button>
        ) : (
          <div className="completion-result-feedback">
            {result.isCorrect
              ? <div className="feedback-correct"><Check size={20} /><span>Идеально!</span></div>
              : <div className="feedback-incorrect"><X size={20} /><span>Неверно. Правильно: <code>{result.correctAnswer}</code></span></div>
            }
            <button className="next-completion-button" onClick={() => { setResult(null); setSelectedOption(null); }}>
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
