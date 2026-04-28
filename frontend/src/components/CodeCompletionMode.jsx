import React, { useState, useEffect } from 'react';
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
    fetchGeneration
  } = useStore();
  
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const currentQuestion = questions[currentIndex];
  const completionData = currentQuestion?.codeCompletionData;

  useEffect(() => {
    setSelectedOption(null);
    setResult(null);
    
    // Trigger generation if missing
    if (currentQuestion && !completionData) {
      fetchGeneration('code', currentQuestion.id);
    }
  }, [currentIndex, currentQuestion, completionData, fetchGeneration]);

  const handleOptionSelect = (option) => {
    if (result || isSubmitting) return;
    setSelectedOption(option);
  };

  const handleSubmit = async () => {
    if (!selectedOption || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await submitCodeCompletionAnswer(currentQuestion.id, selectedOption);
      setResult({
        isCorrect: response.isCorrect,
        correctAnswer: response.correctAnswer
      });
    } catch (error) {
      console.error('Error submitting code completion answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    setResult(null);
    setSelectedOption(null);
  };

  if (isLoadingQuestions) {
    return (
      <div className="completion-mode-loading">
        <Loader2 className="spinner" size={48} />
        <p>Генерация фрагмента...</p>
      </div>
    );
  }

  if (!hasMoreQuestions()) return null;

  if (!completionData) {
     return (
      <div className="completion-mode-loading">
        <Loader2 className="spinner" size={48} />
        <p>Подготовка кода...</p>
      </div>
    );
  }

  // Highlight the placeholder in the snippet
  const renderedSnippet = completionData.snippet.split('___').map((part, i, arr) => (
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

        <div className="completion-instruction">
          Выберите правильное продолжение:
        </div>

        <div className="options-grid">
          {completionData.options?.map((option, index) => {
            let optionClass = 'completion-option';
            if (selectedOption === option) optionClass += ' selected';
            
            if (result) {
              if (option === result.correctAnswer) {
                optionClass += ' correct';
              } else if (selectedOption === option && !result.isCorrect) {
                optionClass += ' incorrect';
              }
            }

            return (
              <button
                key={index}
                className={optionClass}
                onClick={() => handleOptionSelect(option)}
                disabled={!!result}
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
                <span>Ошибка. Проверьте логику.</span>
              </div>
            )}
            
            {result.isCorrect && (
              <button className="next-completion-button" onClick={handleNext}>
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
