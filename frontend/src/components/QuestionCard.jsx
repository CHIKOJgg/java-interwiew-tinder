import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import TinderCard from 'react-tinder-card';
import { RotateCcw, Flag, Sparkles, Bookmark, BookmarkCheck, X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
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

const QuestionCard = forwardRef(
  ({ question, onSwipe, canSwipe = true, onSwipeLeft, onSwipeRight, swipeDisabled }, ref) => {
  const { t } = useTranslation();
  const { learningMode, loadExplanation, savedIds, toggleSave } = useStore();
  const [isFlipped, setIsFlipped] = useState(false);
  const [saving, setSaving] = useState(false);
  const tinderRef = useRef(null);

  useEffect(() => { setIsFlipped(false); }, [question.id]);

  const isSaved = !!savedIds[question.id];
  const isRepeat = !!question.prevStatus;

  const handleSave = async (e) => {
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    try { await toggleSave(question.id, question); } finally { setSaving(false); }
  };

    useImperativeHandle(ref, () => ({
      swipe: (direction) => {
        if (tinderRef.current && canSwipe) tinderRef.current.swipe(direction);
      },
    }));

    const flip = () => {
      if (canSwipe) setIsFlipped((prev) => !prev);
    };

    const handleClick = () => {
      flip();
    };

    // react-tinder-card preventDefaults touchstart, which cancels the
    // synthesized click on phones — so the card body must flip via touch
    // events directly. Only treat as a tap when there was no real movement
    // (swipes / scrolling must not flip), and ignore taps on controls.
    const touchStartRef = useRef(null);
    const handleTouchStart = (e) => {
      const t = e.touches && e.touches[0];
      if (t) touchStartRef.current = { x: t.clientX, y: t.clientY };
    };

    const handleTouchEnd = (e) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start) return;
      if (e.target && e.target.closest && e.target.closest('button, a, [role="button"]')) return;
      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      if (Math.abs(t.clientX - start.x) < 10 && Math.abs(t.clientY - start.y) < 10) {
        e.preventDefault();
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
        preventSwipe={
          !canSwipe ? ['up', 'down', 'left', 'right'] : ['up', 'down']
        }
        swipeRequirementType="position"
        swipeThreshold={80}
      >
        <div
          className={`card ${isFlipped ? 'flipped' : ''}`}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="card-inner">
            {/* ── Front ─────────────────────────────────────────── */}
            <div className="card-face card-front">
              <div className="badges-container">
                <span
                  className="category-badge"
                  style={{ background: categoryColor }}
                >
                  {question.category}
                </span>
                <span
                  className="difficulty-badge"
                  style={{
                    background:
                      difficultyColors[question.difficulty] || '#868e96',
                  }}
                >
                  {question.difficulty}
                </span>
                {isRepeat && (
                  <span
                    className="repeat-badge"
                    title={t('card.repeat_title', 'Spaced repetition: you saw this before — great for long-term memory')}
                  >
                    <RotateCcw size={13} /> {t('card.repeat', 'Repeat')}
                  </span>
                )}
              </div>

              <div className="question-content">
                <h2>{question.question}</h2>
              </div>

              {/* Explicit tap target — gives users a clear affordance on mobile */}
              <div className="flip-hint">
                <button
                  className={`bookmark-btn ${isSaved ? 'saved' : ''}`}
                  onClick={handleSave}
                  type="button"
                  title={t('card.bookmark', 'Save to review later')}
                  disabled={saving}
                >
                  {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                </button>
                <button
                  className="report-flag"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(
                      new CustomEvent('report-question', { detail: question.id }),
                    );
                  }}
                  type="button"
                  title={t('card.report_error', 'Report error')}
                >
                  <Flag size={16} />
                </button>
              </div>

              {/* Swipe action buttons — embedded in the card */}
              {onSwipeLeft && onSwipeRight && (
                <div className="card-swipe-actions">
                  <button
                    className="card-swipe-btn card-swipe-btn-left"
                     onClick={(e) => { e.stopPropagation(); try { navigator.vibrate(10); } catch { /* optional haptic */ } onSwipeLeft(); }}
                    disabled={swipeDisabled}
                    type="button"
                  >
                    <X size={22} />
                    <span>{t('swipe.dont_know')}</span>
                  </button>
                  <button
                    className="card-swipe-btn card-swipe-btn-right"
                     onClick={(e) => { e.stopPropagation(); try { navigator.vibrate(10); } catch { /* optional haptic */ } onSwipeRight(); }}
                    disabled={swipeDisabled}
                    type="button"
                  >
                    <Check size={22} />
                    <span>{t('swipe.know')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* ── Back ──────────────────────────────────────────── */}
            <div className="card-face card-back">
              <div className="badges-container">
                <span
                  className="category-badge"
                  style={{ background: categoryColor }}
                >
                  {question.category}
                </span>
                <span
                  className="difficulty-badge"
                  style={{
                    background:
                      difficultyColors[question.difficulty] || '#868e96',
                  }}
                >
                  {question.difficulty}
                </span>
                {isRepeat && (
                  <span
                    className="repeat-badge"
                    title={t('card.repeat_title', 'Spaced repetition: you saw this before — great for long-term memory')}
                  >
                    <RotateCcw size={13} /> {t('card.repeat', 'Repeat')}
                  </span>
                )}
              </div>

              <div className="answer-content">
                <div className="answer-label">
                  {t('card.short_answer', 'Short answer')}:
                </div>
                {question.shortAnswer ? (
                  <p>{question.shortAnswer}</p>
                ) : (
                  <p className="answer-missing">
                    {t('card.no_answer', 'Краткий ответ ещё не добавлен — нажми «Разобрать ИИ» для подробного объяснения.')}
                  </p>
                )}
              </div>

              <div className="swipe-instructions">
                <span className="swipe-hint left">
                  ← {t('card.dont_know', "Don't know")}
                </span>
                <span className="swipe-hint right">
                  {t('card.know', 'Know')} →
                </span>
              </div>

              {['swipe', 'track'].includes(learningMode) && (
                <div className="card-actions">
                  <button
                    className="explain-ai-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadExplanation(question.id);
                    }}
                    type="button"
                  >
                    <Sparkles size={15} /> {t('card.explain_ai', 'Разобрать ИИ')}
                  </button>
                  <button
                    className={`bookmark-btn back ${isSaved ? 'saved' : ''}`}
                    onClick={handleSave}
                    type="button"
                    title={t('card.bookmark', 'Save to review later')}
                    disabled={saving}
                  >
                    {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                    <span>{t('card.bookmark_short', 'Save')}</span>
                  </button>
                </div>
              )}

              {onSwipeLeft && onSwipeRight && (
                <div className="card-swipe-actions">
                  <button
                    className="card-swipe-btn card-swipe-btn-left"
                    onClick={(e) => { e.stopPropagation(); try { navigator.vibrate(10); } catch { /* optional haptic */ } onSwipeLeft(); }}
                    disabled={swipeDisabled}
                    type="button"
                  >
                    <X size={20} />
                    <span>{t('swipe.dont_know')}</span>
                  </button>
                  <button
                    className="card-swipe-btn card-swipe-btn-right"
                    onClick={(e) => { e.stopPropagation(); try { navigator.vibrate(10); } catch { /* optional haptic */ } onSwipeRight(); }}
                    disabled={swipeDisabled}
                    type="button"
                  >
                    <Check size={20} />
                    <span>{t('swipe.know')}</span>
                  </button>
                </div>
              )}

              {isRepeat && (
                <p className="sr-note">
                  <RotateCcw size={13} style={{marginRight: 5, flexShrink: 0}} /> {t('card.sr_note', 'Spaced repetition: this card came back because it\'s due for review — that\'s how it sticks in memory.')}
                </p>
              )}
            </div>
          </div>
        </div>
      </TinderCard>
    );
  },
);

QuestionCard.displayName = 'QuestionCard';
export default QuestionCard;
