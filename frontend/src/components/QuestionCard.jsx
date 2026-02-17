import React, { useState, useRef } from 'react';
import TinderCard from 'react-tinder-card';
import { RotateCcw } from 'lucide-react';
import './QuestionCard.css';

const categoryColors = {
  'Java Core': '#ff6b6b',
  Collections: '#4ecdc4',
  Multithreading: '#95e1d3',
  OOP: '#f38181',
  Spring: '#38ada9',
  JVM: '#786fa6',
  Exceptions: '#f8b500',
  'Stream API': '#6c5ce7',
  'Design Patterns': '#a29bfe',
  Testing: '#fd79a8',
  Database: '#00b894',
};

const QuestionCard = ({ question, onSwipe, canSwipe = true }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  // Для определения tap vs swipe на мобильном
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (e) => {
    const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartX.current);
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    const deltaTime = Date.now() - touchStartTime.current;

    // Если движение маленькое (<10px) и быстрое (<300ms) - это tap, не свайп
    const isTap = deltaX < 10 && deltaY < 10 && deltaTime < 300;

    if (isTap && canSwipe) {
      setIsFlipped((prev) => !prev);
    }
  };

  // Для десктопа - обычный клик
  const handleClick = (e) => {
    // Проверяем что это не завершение свайпа (touch устройства обработаны выше)
    if (e.pointerType === 'mouse' && canSwipe) {
      setIsFlipped((prev) => !prev);
    }
  };

  const onCardSwipe = (direction) => {
    setIsFlipped(false); // Сбрасываем flip при свайпе
    if (onSwipe) {
      onSwipe(direction);
    }
  };

  const categoryColor = categoryColors[question.category] || '#999';

  return (
    <TinderCard
      className="swipe-card"
      onSwipe={onCardSwipe}
      preventSwipe={
        !canSwipe ? ['up', 'down', 'left', 'right'] : ['up', 'down']
      }
      swipeRequirementType="position"
      swipeThreshold={80}
    >
      <div
        className={`card ${isFlipped ? 'flipped' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
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
