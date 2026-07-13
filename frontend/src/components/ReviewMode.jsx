import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw, Check, X, Loader2, AlertCircle, Lightbulb, Star } from 'lucide-react';
import useStore from '../store/useStore';
import './ReviewMode.css';

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

const ReviewMode = ({ onBack, onUpgrade }) => {
  const { t } = useTranslation();
  const {
    reviewQuestions, currentReviewIndex, isLoadingReview, reviewDone,
    loadReviewQuestions, reviewSwipe, canAccessMode, loadExplanation,
  } = useStore();

  const [isFlipped, setIsFlipped] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (canAccessMode('review') && reviewQuestions.length === 0 && !reviewDone && !isLoadingReview) {
      loadReviewQuestions();
    }
  }, []); // eslint-disable-line

  if (!canAccessMode('review')) {
    return (
      <div className="review-mode">
        <div className="review-header">
          <button className="review-back" onClick={onBack} type="button">←</button>
          <h2>{t('review.title', 'Mistakes review')}</h2>
        </div>
        <div className="review-done">
          <Star size={64} color="#fcc419" />
          <h3>{t('review.title', 'Mistakes review')}</h3>
          <p>{t('review.locked_desc', 'Repeat your weak spots until they stick. This is a Pro feature.')}</p>
          <button className="cta-btn pro" onClick={onUpgrade} type="button">
            <Star size={14} /> PRO
          </button>
        </div>
      </div>
    );
  }

  const current = reviewQuestions[currentReviewIndex];
  const total = reviewQuestions.length;

  const handleBack = () => {
    onBack?.();
  };

  const handleSwipe = async (direction) => {
    if (busy || !current) return;
    setBusy(true);
    const id = current.id;
    setIsFlipped(false);
    await reviewSwipe(id, direction);
    setBusy(false);
  };

  const openExplanation = () => {
    if (current) loadExplanation(current.id);
  };

  // ── Empty / done ────────────────────────────────────────────────────
  if (isLoadingReview) {
    return (
      <div className="review-mode">
        <div className="review-header">
          <button className="review-back" onClick={handleBack} type="button">←</button>
          <h2>{t('review.title', 'Mistakes review')}</h2>
        </div>
        <div className="review-loading">
          <Loader2 className="spinner" size={44} />
          <p>{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  if (reviewDone || !current) {
    return (
      <div className="review-mode">
        <div className="review-header">
          <button className="review-back" onClick={handleBack} type="button">←</button>
          <h2>{t('review.title', 'Mistakes review')}</h2>
        </div>
        <div className="review-done">
          <Check size={64} color="#51cf66" />
          <h3>{t('review.all_done_title', 'All clear!')}</h3>
          <p>{t('review.all_done_desc', 'You have no weak spots right now. Keep practising to stay sharp.')}</p>
          <button className="review-done-btn" onClick={handleBack} type="button">
            {t('review.back_to_progress', 'Back to progress')}
          </button>
        </div>
      </div>
    );
  }

  const categoryColor = categoryColors[current.category] || '#7c5cbf';

  return (
    <div className="review-mode">
      <div className="review-header">
        <button className="review-back" onClick={handleBack} type="button">←</button>
        <h2>{t('review.title', 'Mistakes review')}</h2>
        <span className="review-counter">{currentReviewIndex + 1}/{total}</span>
      </div>

      <div
        className={`review-card ${isFlipped ? 'flipped' : ''}`}
        onClick={() => setIsFlipped(prev => !prev)}
      >
        <div className="review-card-inner">
          <div className="review-face review-front">
            <div className="badges-container">
              <span className="category-badge" style={{ background: categoryColor }}>{current.category}</span>
              <span className="difficulty-badge" style={{ background: difficultyColors[current.difficulty] || '#868e96' }}>{current.difficulty}</span>
            </div>
            <div className="review-question"><h2>{current.question}</h2></div>
            <button
              className="flip-hint"
              onClick={(e) => { e.stopPropagation(); setIsFlipped(prev => !prev); }}
              type="button"
            >
              <RotateCcw size={15} />
              <span>{t('card.flip_hint', 'Tap for answer')}</span>
            </button>
          </div>

          <div className="review-face review-back">
            <div className="badges-container">
              <span className="category-badge" style={{ background: categoryColor }}>{current.category}</span>
              <span className="difficulty-badge" style={{ background: difficultyColors[current.difficulty] || '#868e96' }}>{current.difficulty}</span>
            </div>
            <div className="review-answer">
              <div className="answer-label">{t('card.short_answer', 'Short answer')}:</div>
              <p>{current.shortAnswer}</p>
            </div>
            {current.explanation ? (
              <div className="review-explanation">
                <div className="answer-label"><Lightbulb size={13} /> {t('review.explanation', 'Explanation')}</div>
                <p>{current.explanation}</p>
              </div>
            ) : (
              <button className="review-explain-btn" onClick={(e) => { e.stopPropagation(); openExplanation(); }} type="button">
                <Lightbulb size={14} /> {t('review.load_explanation', 'Load full explanation')}
              </button>
            )}
            <div className="swipe-instructions">
              <span className="swipe-hint left">← {t('card.dont_know', "Don't know")}</span>
              <span className="swipe-hint right">{t('card.know', 'Know')} →</span>
            </div>
          </div>
        </div>
      </div>

      <div className="review-actions">
        <button className="review-btn review-weak" onClick={() => handleSwipe('left')} disabled={busy} type="button">
          <X size={26} />
          <span>{t('review.still_weak', 'Still weak')}</span>
        </button>
        <button className="review-btn review-known" onClick={() => handleSwipe('right')} disabled={busy} type="button">
          <Check size={26} />
          <span>{t('review.got_it', 'Got it now')}</span>
        </button>
      </div>
    </div>
  );
};

export default ReviewMode;
