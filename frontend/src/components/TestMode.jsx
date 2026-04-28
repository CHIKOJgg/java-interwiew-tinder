import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { Check, X, Loader2 } from 'lucide-react';
import './TestMode.css';

const TestMode = () => {
  const {
    questions,
    currentIndex,
    submitTestAnswer,
    isLoadingQuestions,
    hasMoreQuestions,
    fetchGeneration
  } = useStore();

  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { isCorrect, correctAnswer }

  const currentQuestion = questions[currentIndex];

  // Reset local state when question changes (e.g. after explanation modal closes)
  useEffect(() => {
    setSelectedOption(null);
    setResult(null);
    
    // Trigger generation if options are missing
    if (currentQuestion && (!currentQuestion.options || currentQuestion.options.length === 0)) {
      fetchGeneration('test', currentQuestion.id);
    }
  }, [currentIndex, currentQuestion, fetchGeneration]);

  const handleOptionSelect = (option) => {
    if (result || isSubmitting) return;
    setSelectedOption(option);
  };

  const handleSubmit = async () => {
    if (!selectedOption || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await submitTestAnswer(currentQuestion.id, selectedOption);
      setResult({
        isCorrect: response.isCorrect,
        correctAnswer: response.correctAnswer
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    setResult(null);
    setSelectedOption(null);
    // currentIndex is updated in useStore.submitTestAnswer (if correct) 
    // or useStore.closeExplanation (if incorrect)
  };

  if (isLoadingQuestions) {
    return (
      <div className="test-mode-loading">
        <Loader2 className="spinner" size={48} />
        <p>Загрузка вопросов...</p>
      </div>
    );
  }

  if (!hasMoreQuestions()) {
    return null; // App.jsx handles completion screen
  }

  return (
    <div className="test-mode">
      <div className="test-card">
        <div className="test-category">
          {currentQuestion.category} • {currentQuestion.difficulty}
        </div>

        <h2 className="test-question">{currentQuestion.question}</h2>

        <div className="options-list">
          {currentQuestion.options?.map((option, index) => {
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
                  <Check size={20} className="result-icon" />
                )}
                {result && selectedOption === option && !result.isCorrect && (
                  <X size={20} className="result-icon" />
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
          >
            {isSubmitting ? <Loader2 className="spinner" size={20} /> : 'Ответить'}
          </button>
        ) : (
          <div className="test-result-feedback">
            {result.isCorrect ? (
              <div className="feedback-correct">
                <Check size={24} />
                <span>Правильно!</span>
              </div>
            ) : (
              <div className="feedback-incorrect">
                <X size={24} />
                <span>Не совсем...</span>
              </div>
            )}

            {result.isCorrect && (
              <button className="next-test-button" onClick={handleNext}>
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