import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import useStore from '../store/useStore';
import apiClient from '../../api/client';
import './TrackMode.css';

const TrackMode = ({ onBack }) => {
  const { t } = useTranslation();
  const { currentTrack, questions, currentIndex } = useStore();
  const [trackInfo, setTrackInfo] = useState(null);
  const [swiped, setSwiped] = useState(false);
  const [swipedDirection, setSwipedDirection] = useState(null);
  const cardRef = useRef(null);

  const question = questions[currentIndex];

  useEffect(() => {
    if (currentTrack) {
      apiClient.getTrack(currentTrack).then(setTrackInfo).catch(() => {});
    }
  }, [currentTrack]);

  const handleSwipe = async (direction) => {
    if (swiped) return;
    setSwiped(true);
    setSwipedDirection(direction);

    const status = direction === 'right' ? 'known' : 'unknown';
    if (question) {
      await apiClient.recordSwipe(question.id, status).catch(() => {});
    }

    const result = await apiClient.advanceTrack(currentTrack).catch(() => ({ completed: false }));

    setTimeout(() => {
      setSwiped(false);
      setSwipedDirection(null);
      if (result.completed) {
        useStore.getState().set({ trackComplete: true });
      } else {
        useStore.getState().advanceTrack?.();
      }
    }, 300);
  };

  if (!question) {
    return (
      <div className="track-mode-empty">
        <p>{t('tracks.no_questions', 'No more questions in this track.')}</p>
        <button onClick={onBack}>{t('common.back', 'Back')}</button>
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
          {trackInfo && `${currentIndex + 1} / ${trackInfo.totalSteps}`}
        </div>
        <div className="track-mode-progress">
          <div
            className="track-mode-progress-fill"
            style={{ width: trackInfo ? `${((currentIndex + 1) / trackInfo.totalSteps) * 100}%` : '0%' }}
          />
        </div>
      </div>

      <div className="track-card-area">
        <div className={`track-question-card ${swiped ? `swiped-${swipedDirection}` : ''}`} ref={cardRef}>
          <div className="track-q-category">{question.category}</div>
          <div className="track-q-text">{question.question}</div>
        </div>
      </div>

      <div className="track-swipe-buttons">
        <button className="track-btn track-btn-left" onClick={() => handleSwipe('left')}>
          <XCircle size={28} />
        </button>
        <button className="track-btn track-btn-right" onClick={() => handleSwipe('right')}>
          <CheckCircle size={28} />
        </button>
      </div>
    </div>
  );
};

export default TrackMode;
