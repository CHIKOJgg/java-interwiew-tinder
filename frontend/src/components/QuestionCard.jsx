import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import TinderCard from 'react-tinder-card';
import { RotateCcw, Flag } from 'lucide-react';
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

const QuestionCard = forwardRef(({ question, onSwipe, canSwipe = true }, ref) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const tinderRef = useRef(null);

  // Touch tracking state — distinguish tap vs drag/swipe
  const touchStart = useRef(null);
  // Whether the tinder card is currently being dragged (not a tap)
  const isDragging = useRef(false);

  useImperativeHandle(ref, () => ({
    swipe: (direction) => {
      if (tinderRef.current && canSwipe) tinderRef.current.swipe(direction);
    },
  }));

  const flip = () => {
    if (canSwipe) setIsFlipped(prev => !prev);
  };

  // --- Touch handlers on the card-inner div (inside TinderCard) ---
  // TinderCard intercepts touch for swiping. We detect taps ourselves
  // by measuring movement distance and duration so we don't conflict.
  const handleTouchStart = (e) => {
    isDragging.current = false;
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      t: Date.now(),
    };
  };

  const handleTouchMove = (e) => {
    if (!touchStart.current) return;
    const dx = Math.abs(e.touches[0].clientX - touchStart.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStart.current.y);
    // If the finger moved more than 8px in any direction, it's a drag/swipe, not a tap
    if (dx > 8 || dy > 8) isDragging.current = true;
  };

  const handleTouchEnd = (e) => {
    if (!touchStart.current || isDragging.current) return;
    const dt = Date.now() - touchStart.current.t;
    // Tap = moved < 8px AND under 300ms
    if (dt < 300) flip();
    touchStart.current = null;
  };

  // Mouse click for desktop
  const handleClick = (e) => {
    // pointerType is 'mouse' on desktop, 'touch' or 'pen' on mobile.
    // We handle touch via the touch events above; handle mouse here.
    if (e.pointerType !== 'touch') flip();
  };

  const onCardSwipe = (direction) => {
    setIsFlipped(false);
    if (onSwipe) onSwipe(direction);
  };

  const categoryColor = categoryColors[question.category] || '#7c5cbf';

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
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        <div className="card-inner">
          {/* ── Front ─────────────────────────────────────────── */}
          <div className="card-face card-front">
            <div className="badges-container">
              <span className="category-badge" style={{ background: categoryColor }}>
                {question.category}
              </span>
              <span
                className="difficulty-badge"
                style={{ background: difficultyColors[question.difficulty] || '#868e96' }}
              >
                {question.difficulty}
              </span>
            </div>

            <div className="question-content">
              <h2>{question.question}</h2>
            </div>

            {/* Explicit tap target — gives users a clear affordance on mobile */}
            <button
              className="flip-hint"
              onTouchEnd={(e) => { e.stopPropagation(); flip(); }}
              onClick={(e) => { e.stopPropagation(); flip(); }}
              type="button"
            >
              <RotateCcw size={15} />
              <span>Нажми для ответа</span>
            </button>
            <button
              className="report-flag"
              onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('report-question', { detail: question.id })); }}
              type="button"
              title="Сообщить об ошибке"
            >
              <Flag size={16} />
            </button>
          </div>

          {/* ── Back ──────────────────────────────────────────── */}
          <div className="card-face card-back">
            <div className="badges-container">
              <span className="category-badge" style={{ background: categoryColor }}>
                {question.category}
              </span>
              <span
                className="difficulty-badge"
                style={{ background: difficultyColors[question.difficulty] || '#868e96' }}
              >
                {question.difficulty}
              </span>
            </div>

            <div className="answer-content">
              <div className="answer-label">Краткий ответ:</div>
              <p>{question.shortAnswer}</p>
            </div>

            <div className="swipe-instructions">
              <span className="swipe-hint left">← Не знаю</span>
              <span className="swipe-hint right">Знаю →</span>
            </div>
          </div>
        </div>
      </div>
    </TinderCard>
  );
});

QuestionCard.displayName = 'QuestionCard';
export default QuestionCard;