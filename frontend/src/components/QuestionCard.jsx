import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
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

const difficultyColors = {
  Junior: '#51cf66',
  Middle: '#fcc419',
  Senior: '#ff6b6b',
};

// forwardRef + useImperativeHandle exposes swipe() so App.jsx SwipeButtons work
const QuestionCard = forwardRef(({ question, onSwipe, canSwipe = true }, ref) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const tinderRef = useRef(null);

  // Expose swipe() to parent via ref
  useImperativeHandle(ref, () => ({
    swipe: (direction) => {
      if (tinderRef.current && canSwipe) {
        tinderRef.current.swipe(direction);
      }
    },
  }));

  // Touch tracking — distinguish tap vs swipe
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
    const isTap = deltaX < 10 && deltaY < 10 && deltaTime < 300;
    if (isTap && canSwipe) setIsFlipped((prev) => !prev);
  };

  const handleClick = (e) => {
    if (e.pointerType === 'mouse' && canSwipe) setIsFlipped((prev) => !prev);
  };

  const onCardSwipe = (direction) => {
    setIsFlipped(false);
    if (onSwipe) onSwipe(direction);
  };

  const categoryColor = categoryColors[question.category] || '#999';

  return (
    <TinderCard
      ref={tinderRef}
      className="swipe-card"
      onSwipe={onCardSwipe}
      preventSwipe={!canSwipe ? ['up', 'down', 'left', 'right'] : ['up', 'down']}
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
          {/* Front */}
          <div className="card-face card-front">
            <div className="badges-container">
              <div className="category-badge" style={{ background: categoryColor }}>{question.category}</div>
              <div className="difficulty-badge" style={{ background: difficultyColors[question.difficulty] || '#999' }}>{question.difficulty}</div>
            </div>
            <div className="question-content">
              <h2>{question.question}</h2>
            </div>
            <div className="flip-hint">
              <RotateCcw size={16} />
              <span>Нажми для ответа</span>
            </div>
          </div>

          {/* Back */}
          <div className="card-face card-back">
            <div className="badges-container">
              <div className="category-badge" style={{ background: categoryColor }}>{question.category}</div>
              <div className="difficulty-badge" style={{ background: difficultyColors[question.difficulty] || '#999' }}>{question.difficulty}</div>
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
});

QuestionCard.displayName = 'QuestionCard';

export default QuestionCard;
