import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import TinderCard from 'react-tinder-card';
import { RotateCcw, Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './QuestionCard.css';

const categoryColors = {
  'Java Core': 'var(--color-java-core)',
  Collections: 'var(--color-collections)',
  Multithreading: 'var(--color-multithreading)',
  OOP: 'var(--color-oop)',
  Spring: 'var(--color-spring)',
  JVM: 'var(--color-jvm)',
  Exceptions: 'var(--color-exceptions)',
  'Stream API': 'var(--color-stream-api)',
  'Design Patterns': 'var(--color-design-patterns)',
  Testing: 'var(--color-testing)',
  Database: 'var(--color-database)',
};

const difficultyColors = {
  Junior: 'var(--color-junior)',
  Middle: 'var(--color-middle)',
  Senior: 'var(--color-senior)',
};

const QuestionCard = forwardRef(({ question, onSwipe, canSwipe = true }, ref) => {
  const { t } = useTranslation();
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

  // Mouse click for desktop (PointerEvent usually)
  const handleClick = (e) => {
    // nativeEvent.pointerType is 'mouse' on desktop, 'touch' or 'pen' on mobile.
    // We handle touch via the custom tap detection in touchEnd; handle mouse here.
    if (e.nativeEvent.pointerType === 'mouse' || !e.nativeEvent.pointerType) {
      flip();
    }
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
              <span>{t('card.flip_hint', 'Tap for answer')}</span>
            </button>
            <button
              className="report-flag"
              onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('report-question', { detail: question.id })); }}
              type="button"
              title={t('card.report_error', 'Report error')}
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
              <div className="answer-label">{t('card.short_answer', 'Short answer')}:</div>
              <p>{question.shortAnswer}</p>
            </div>

            <div className="swipe-instructions">
              <span className="swipe-hint left">← {t('card.dont_know', "Don't know")}</span>
              <span className="swipe-hint right">{t('card.know', 'Know')} →</span>
            </div>
          </div>
        </div>
      </div>
    </TinderCard>
  );
});

QuestionCard.displayName = 'QuestionCard';
export default QuestionCard;