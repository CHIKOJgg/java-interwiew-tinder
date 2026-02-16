import React, { useState } from 'react';
import TinderCard from 'react-tinder-card';
import { RotateCcw } from 'lucide-react';
import './QuestionCard.css';

const categoryColors = {
  'Java Core': '#ff6b6b',
  'Collections': '#4ecdc4',
  'Multithreading': '#95e1d3',
  'OOP': '#f38181',
  'Spring': '#38ada9',
  'JVM': '#786fa6',
  'Exceptions': '#f8b500'
};

const QuestionCard = ({ question, onSwipe, canSwipe = true }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleCardClick = () => {
    if (canSwipe) {
      setIsFlipped(!isFlipped);
    }
  };

  const onCardSwipe = (direction) => {
    if (onSwipe) {
      onSwipe(direction);
    }
  };

  const categoryColor = categoryColors[question.category] || '#999';

  return (
    <TinderCard
      className="swipe-card"
      onSwipe={onCardSwipe}
      preventSwipe={!canSwipe ? ['up', 'down', 'left', 'right'] : ['up', 'down']}
      swipeRequirementType="position"
      swipeThreshold={100}
    >
      <div 
        className={`card ${isFlipped ? 'flipped' : ''}`}
        onClick={handleCardClick}
      >
        <div className="card-inner">
          {/* Front side */}
          <div className="card-face card-front">
            <div 
              className="category-badge" 
              style={{ background: categoryColor }}
            >
              {question.category}
            </div>
            <div className="question-content">
              <h2>{question.question}</h2>
            </div>
            <div className="flip-hint">
              <RotateCcw size={16} />
              <span>Нажми для ответа</span>
            </div>
          </div>

          {/* Back side */}
          <div className="card-face card-back">
            <div 
              className="category-badge" 
              style={{ background: categoryColor }}
            >
              {question.category}
            </div>
            <div className="answer-content">
              <div className="answer-label">Краткий ответ:</div>
              <p>{question.shortAnswer}</p>
            </div>
            <div className="swipe-instructions">
              <div className="swipe-hint left">← Не знаю</div>
              <div className="swipe-hint right">Знаю →</div>
            </div>
          </div>
        </div>
      </div>
    </TinderCard>
  );
};

export default QuestionCard;
