import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import useStore from '../../store/useStore';
import apiClient from '../../api/client';
import QuestionCard from '../QuestionCard';
import './TrackMode.css';

const TrackMode = ({ onBack }) => {
  const { t } = useTranslation();
  const { currentTrack, questions, currentIndex, swipeCard, advanceTrack } = useStore();
  const [trackInfo, setTrackInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const cardRef = useRef(null);
  const question = questions[currentIndex];

  useEffect(() => {
    if (currentTrack) apiClient.getTrack(currentTrack).then(setTrackInfo).catch(() => {});
  }, [currentTrack]);

  const handleSwipe = async (direction) => {
    if (submitting || !question) return;
    setSubmitting(true);
    setError(null);
    try {
      await swipeCard(question.id, direction);
      await advanceTrack();
    } catch (err) {
      setError(err?.message || t('tracks.answer_error', 'Не удалось сохранить ответ'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!question) {
    return (
      <div className="track-mode-empty">
        <p>{t('tracks.no_questions', 'No more questions in this track.')}</p>
        <button className="track-btn-back" onClick={onBack} type="button">{t('common.back', 'Back')}</button>
      </div>
    );
  }

  const totalSteps = trackInfo?.totalSteps || 0;
  const currentStep = trackInfo?.currentStep || currentIndex;
  const progress = totalSteps ? Math.min(100, ((currentStep + 1) / totalSteps) * 100) : 0;

  return (
    <div className="track-mode">
      <div className="track-mode-header">
        <button className="track-back-btn" onClick={onBack} type="button"><ArrowLeft size={20} /></button>
        <div className="track-progress-text">{totalSteps ? `${Math.min(currentStep + 1, totalSteps)} / ${totalSteps}` : ''}</div>
        <div className="track-mode-progress">
          <div className="track-mode-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="track-card-area">
        <div className="track-question-stack">
          <QuestionCard
            ref={cardRef}
            question={question}
            onSwipe={handleSwipe}
            onSwipeLeft={() => cardRef.current?.swipe?.('left')}
            onSwipeRight={() => cardRef.current?.swipe?.('right')}
            swipeDisabled={submitting}
            canSwipe={!submitting}
          />
        </div>
      </div>
      {error && <div className="track-mode-error" role="alert">⚠️ {error}</div>}
    </div>
  );
};

export default TrackMode;
