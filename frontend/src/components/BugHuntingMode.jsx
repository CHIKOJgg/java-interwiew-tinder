import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { Bug, Check, X, Loader2, Code } from 'lucide-react';
import './BugHuntingMode.css';

const BugHuntingMode = () => {
  const { 
    questions, 
    currentIndex, 
    submitBugHuntAnswer, 
    isLoadingQuestions,
    hasMoreQuestions 
  } = useStore();
  
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const currentQuestion = questions[currentIndex];
  const bugData = currentQuestion?.bugHuntingData;

  useEffect(() => {
    setSelectedOption(null);
    setResult(null);
  }, [currentIndex]);

  const handleOptionSelect = (option) => {
    if (result || isSubmitting) return;
    setSelectedOption(option);
  };

  const handleSubmit = async () => {
    if (!selectedOption || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await submitBugHuntAnswer(currentQuestion.id, selectedOption);
      setResult({
        isCorrect: response.isCorrect,
        correctAnswer: response.correctAnswer
      });
    } catch (error) {
      console.error('Error submitting bug hunt answer:', error);
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
      <div className="bug-mode-loading">
        <Loader2 className="spinner" size={48} />
        <p>Генерация задачи...</p>
      </div>
    );
  }

  if (!hasMoreQuestions()) return null;

  if (!bugData) {
     return (
      <div className="bug-mode-loading">
        <Loader2 className="spinner" size={48} />
        <p>Подготовка кода...</p>
      </div>
    );
  }

  return (
    <div className="bug-hunting-mode">
      <div className="bug-card">
        <div className="bug-header">
          <div className="bug-badge">
            <Bug size={16} />
            <span>Bug Hunting</span>
          </div>
          <div className="topic-badge">{currentQuestion.category}</div>
        </div>

        <div className="code-container">
          <div className="code-header">
            <Code size={14} />
            <span>Java</span>
          </div>
          <pre className="code-block">
            <code>{bugData.code}</code>
          </pre>
        </div>

        <div className="bug-instruction">
          Найдите ошибку в коде выше:
        </div>

        <div className="options-list">
          {bugData.options?.map((option, index) => {
            let optionClass = 'option-item';
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
                <span className="option-text">{option}</span>
                {result && option === result.correctAnswer && (
                  <Check size={18} className="result-icon" />
                )}
                {result && selectedOption === option && !result.isCorrect && (
                  <X size={18} className="result-icon" />
                )}
              </button>
            );
          })}
        </div>

        {!result ? (
          <button
            className="submit-bug-button"
            disabled={!selectedOption || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? <Loader2 className="spinner" size={20} /> : 'Проверить'}
          </button>
        ) : (
          <div className="bug-result-feedback">
            {result.isCorrect ? (
              <div className="feedback-correct">
                <Check size={20} />
                <span>Верно! Вы нашли баг.</span>
              </div>
            ) : (
              <div className="feedback-incorrect">
                <X size={20} />
                <span>Неверно. Посмотрите объяснение.</span>
              </div>
            )}
            
            {result.isCorrect && (
              <button className="next-bug-button" onClick={handleNext}>
                Следующая задача
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BugHuntingMode;
