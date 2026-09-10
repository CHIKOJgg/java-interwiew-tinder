import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbulb, Sparkles, X } from 'lucide-react';
import useStore from '../store/useStore';
import './MissedToast.css';

const MissedToast = () => {
  const { t } = useTranslation();
  const { missedToast, openMissed, dismissMissedToast, learningMode } = useStore();

  useEffect(() => {
    if (!missedToast) return;
    const timer = setTimeout(() => {
      dismissMissedToast();
    }, 4500);
    return () => clearTimeout(timer);
  }, [missedToast, dismissMissedToast]);

  if (!missedToast || learningMode !== 'swipe') return null;

  const handleOpen = (e) => {
    e.stopPropagation();
    openMissed(missedToast);
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    dismissMissedToast();
  };

  return (
    <div className="missed-toast-container" role="status" aria-live="polite">
      <div className="missed-toast" onClick={handleOpen}>
        <div className="missed-toast-icon">
          <Lightbulb size={18} />
        </div>
        <div className="missed-toast-body">
          <span className="missed-toast-label">{t('missed.toast_label', 'Не знали?')}</span>
          <span className="missed-toast-title" title={missedToast.question}>
            {missedToast.question}
          </span>
        </div>
        <button
          className="missed-toast-action"
          onClick={handleOpen}
          type="button"
          aria-label={t('missed.explain', 'Разбор')}
        >
          <Sparkles size={14} />
          <span>{t('missed.explain', 'Разбор')}</span>
        </button>
        <button
          className="missed-toast-close"
          onClick={handleDismiss}
          type="button"
          aria-label={t('common.close', 'Закрыть')}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};

export default MissedToast;
