import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import useStore from '../store/useStore';
import { useModalA11y } from '../utils/useModalA11y';
import './MissedPanel.css';

// Shown after the user swipes left ("Don't know") in swipe mode. This turns
// the previously dead "don't know" path into the core learning loop: we
// immediately show the short answer (free) and offer a one-tap AI breakdown
// (the premium hook).
const MissedPanel = () => {
  const { t } = useTranslation();
  const { missed, showMissed, closeMissed, loadExplanation, isPro } = useStore();
  const dialogRef = useModalA11y(closeMissed);

  if (!showMissed || !missed) return null;

  const handleExplain = () => {
    const id = missed.id;
    closeMissed();
    loadExplanation(id);
  };

  return (
    <div className="missed-overlay" onClick={closeMissed}>
      <div
        className="missed-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t('missed.title', 'Not knowing is fine')}
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="missed-close" onClick={closeMissed} type="button" aria-label="close">
          <X size={18} />
        </button>

        <div className="missed-head">
          <span className="missed-emoji">🙌</span>
          <h2>{t('missed.title')}</h2>
          <p>{t('missed.desc')}</p>
        </div>

        <div className="missed-question">{missed.question}</div>

        <div className="missed-answer">
          <div className="missed-answer-label">{t('missed.short_answer')}:</div>
          <p>{missed.shortAnswer}</p>
        </div>

        <button className="missed-explain" onClick={handleExplain} type="button">
          <Sparkles size={17} /> {t('missed.explain')}
        </button>
        {!isPro() && (
          <p className="missed-pro-hint">{t('missed.pro_hint')}</p>
        )}

        <button className="missed-next" onClick={closeMissed} type="button">
          {t('missed.next')} <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default MissedPanel;
