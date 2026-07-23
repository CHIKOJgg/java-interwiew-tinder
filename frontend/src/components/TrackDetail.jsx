import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Play, CheckCircle, Lock } from 'lucide-react';
import apiClient from '../api/client';
import './TrackDetail.css';

const TrackDetail = ({ trackId, onStart, onBack }) => {
  const { t } = useTranslation();
  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrack();
  }, [trackId]);

  const loadTrack = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getTrack(trackId);
      setTrack(data);
    } catch (err) {
      console.error('Failed to load track:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="track-detail-loading">{t('common.loading', 'Loading...')}</div>;
  if (!track) return <div className="track-detail-loading">{t('tracks.not_found', 'Track not found')}</div>;

  const progress = track.totalSteps > 0 ? Math.round((track.currentStep / track.totalSteps) * 100) : 0;

  return (
    <div className="track-detail">
      <div className="track-detail-header">
        <button className="back-btn-absolute" onClick={onBack}>
          <ArrowLeft size={24} />
        </button>
        <h1>{track.name}</h1>
        {track.description && <p>{track.description}</p>}
        <div className="track-detail-meta">
          <span className="track-level-badge">{track.level}</span>
          <span>{track.currentStep}/{track.totalSteps} {t('tracks.steps', 'steps')}</span>
        </div>
        <div className="track-detail-progress">
          <div className="track-detail-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="track-steps-list">
        {track.steps?.map((step, i) => {
          const isCompleted = i < track.currentStep;
          const isCurrent = i === track.currentStep;
          return (
            <div
              key={step.id}
              className={`track-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
            >
              <div className="step-number">
                {isCompleted ? <CheckCircle size={16} /> : isCurrent ? <Play size={16} /> : <span>{i + 1}</span>}
              </div>
              <div className="step-info">
                <div className="step-question">{step.question}</div>
                <div className="step-meta">
                  <span>{step.difficulty}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="track-detail-footer">
        {track.completed ? (
          <div className="track-completed-banner">
            {t('tracks.completed', 'Track completed!')}
          </div>
        ) : (
          <button className="start-track-btn" onClick={onStart}>
            <Play size={18} />
            {track.currentStep > 0 ? t('tracks.continue', 'Continue') : t('tracks.start', 'Start Track')}
          </button>
        )}
      </div>
    </div>
  );
};

export default TrackDetail;
