import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle, XCircle, X, Check } from 'lucide-react';
import useStore from '../../store/useStore';
import apiClient from '../../api/client';
import './TrackMode.css';

const TrackMode = ({ onBack }) => {
  const { t } = useTranslation();
  const { currentTrack, questions, currentIndex, swipeCard, advanceTrack } = useStore();
  const [trackInfo, setTrackInfo] = useState(null);
  const [swiped, setSwiped] = useState(false);
  const [pending, setPending] = useState(false);
  const [swipedDirection, setSwipedDirection] = useState(null);
  const cardRef = useRef(null);

  const question = questions[currentIndex];

  useEffect(() => {
    if (currentTrack) {
      apiClient.getTrack(currentTrack).then(setTrackInfo).catch(() => {});
    }
  }, [currentTrack]);

  const handleSwipe = async (direction) => {
    if (swiped || pending) return;
    setSwiped(true);
    setSwipedDirection(direction);

    const status = direction === 'right' ? 'known' : 'unknown';
    if (question) {
      swipeCard(question.id, direction).catch(() => {});
    }

    setPending(true);
    try {
      await advanceTrack();
    } finally {
      setTimeout(() => {
        setSwiped(false);
        setSwipedDirection(null);
        setPending(false);
      }, 300);
    }
  };

  if (!question) {
    return (
      <div className="track-mode-empty">
        <p>{t('tracks.no_questions', 'No more questions in this track.')}</p>
        <button className="track-btn-back" onClick={onBack}>{t('common.back', 'Back')}</button>
      </div>
    );
  }

  return (
    <div className="track-mode">
      <div className="track-mode-header">
        <button className="track-back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <div className="track-progress-text">
          {trackInfo && `${Math.min(trackInfo.currentStep + 1, trackInfo.totalSteps)} / ${trackInfo.totalSteps}`}
        </div>
        <div className="track-mode-progress">
          <div
            className="track-mode-progress-fill"
            style={{ width: trackInfo ? `${Math.min(100, ((trackInfo.currentStep + 1) / trackInfo.totalSteps) * 100)}%` : '0%' }}
          />
        </div>
      </div>

      <div className="track-card-area">
        <div className={`track-question-card ${swiped ? `swiped-${swipedDirection}` : ''}`} ref={cardRef}>
          <div className="track-q-category">{question.category}</div>
          <div className="track-q-text">{question.question}</div>
          <div className="track-swipe-actions">
            <button className="track-swipe-btn track-swipe-btn-left" onClick={() => handleSwipe('left')} disabled={pending}>
              <X size={20} />
              <span>{t('swipe.dont_know')}</span>
            </button>
            <button className="track-swipe-btn track-swipe-btn-right" onClick={() => handleSwipe('right')} disabled={pending}>
              <Check size={20} />
              <span>{t('swipe.know')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackMode;
