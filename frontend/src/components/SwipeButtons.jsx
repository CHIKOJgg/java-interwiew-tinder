import React from 'react';
import { X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './SwipeButtons.css';

const vibrate = () => { try { navigator.vibrate(10); } catch { } };

const SwipeButtons = ({ onSwipeLeft, onSwipeRight, disabled = false }) => {
  const { t } = useTranslation();
  return (
    <div className="swipe-buttons">
      <button
        className="swipe-button swipe-button-left"
        onClick={() => { vibrate(); onSwipeLeft(); }}
        disabled={disabled}
        type="button"
      >
        <X size={30} />
        <span>{t('swipe.dont_know')}</span>
      </button>

      <button
        className="swipe-button swipe-button-right"
        onClick={() => { vibrate(); onSwipeRight(); }}
        disabled={disabled}
        type="button"
      >
        <Check size={30} />
        <span>{t('swipe.know')}</span>
      </button>
    </div>
  );
};

export default SwipeButtons;
