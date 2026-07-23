import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BookOpen, CheckCircle, ChevronRight, Play } from 'lucide-react';
import apiClient from '../api/client';
import useStore from '../store/useStore';
import './TracksScreen.css';

const TracksScreen = ({ onStartTrack, onBack, onSkipToCategories }) => {
  const { t } = useTranslation();
  const { language } = useStore();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTracks();
  }, [language]);

  const loadTracks = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getTracks(language);
      setTracks(data.tracks || []);
    } catch (err) {
      console.error('Failed to load tracks:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tracks-screen">
      <div className="tracks-header">
        <button className="back-btn-absolute" onClick={onBack}>
          <ArrowLeft size={24} />
        </button>
        <h1>{t('tracks.title', 'Learning Tracks')}</h1>
        <p>{t('tracks.subtitle', 'Structured paths to master interview topics')}</p>
      </div>

      <div className="tracks-scroll">
        {loading ? (
          <div className="tracks-loading">{t('common.loading', 'Loading...')}</div>
        ) : tracks.length === 0 ? (
          <div className="tracks-empty">
            <BookOpen size={48} />
            <p>{t('tracks.empty', 'No tracks available yet for this language.')}</p>
            <button className="skip-btn" onClick={onSkipToCategories}>
              {t('tracks.skip', 'Free Practice Instead')}
            </button>
          </div>
        ) : (
          tracks.map(track => (
            <TrackCard key={track.id} track={track} onClick={() => onStartTrack(track.id)} />
          ))
        )}
      </div>

      <div className="tracks-footer">
        <button className="skip-link" onClick={onSkipToCategories}>
          {t('tracks.skip_to_practice', 'Skip to free practice →')}
        </button>
      </div>
    </div>
  );
};

const TrackCard = ({ track, onClick }) => {
  const { t } = useTranslation();
  const progress = track.totalSteps > 0 ? Math.round((track.currentStep / track.totalSteps) * 100) : 0;
  const isCompleted = track.completed;
  const isStarted = track.currentStep > 0 && !isCompleted;

  return (
    <div className={`track-card ${isCompleted ? 'completed' : ''} ${isStarted ? 'started' : ''}`} onClick={onClick}>
      <div className="track-icon">
        {isCompleted ? <CheckCircle size={24} /> : <BookOpen size={24} />}
      </div>
      <div className="track-info">
        <div className="track-name">{track.name}</div>
        <div className="track-meta">
          <span className="track-level">{track.level}</span>
          <span className="track-count">{track.currentStep}/{track.totalSteps} {t('tracks.steps', 'steps')}</span>
        </div>
        {track.description && <div className="track-desc">{track.description}</div>}
        {isStarted && (
          <div className="track-progress-bar">
            <div className="track-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      <ChevronRight size={20} className="track-arrow" />
    </div>
  );
};

export default TracksScreen;
