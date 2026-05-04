import React from 'react';
import { X, Check } from 'lucide-react';
import './SwipeButtons.css';

const SwipeButtons = ({ onSwipeLeft, onSwipeRight, disabled = false }) => {
  return (
    <div className="swipe-buttons">
      <button
        className="swipe-button swipe-button-left"
        onClick={onSwipeLeft}
        disabled={disabled}
        type="button"
      >
        <X size={30} />
        <span>Не знаю</span>
      </button>

      <button
        className="swipe-button swipe-button-right"
        onClick={onSwipeRight}
        disabled={disabled}
        type="button"
      >
        <Check size={30} />
        <span>Знаю</span>
      </button>
    </div>
  );
};

export default SwipeButtons;