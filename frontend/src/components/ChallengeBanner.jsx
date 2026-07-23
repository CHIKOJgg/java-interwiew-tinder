import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Users, Clock } from 'lucide-react';
import apiClient from '../../api/client';
import useStore from '../../store/useStore';
import './ChallengeBanner.css';

const ChallengeBanner = ({ onStartChallenge }) => {
  const { t } = useTranslation();
  const { language } = useStore();
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.getCurrentChallenge(language)
      .then(r => setChallenge(r.challenge))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [language]);

  if (loading || !challenge) return null;

  const endDate = new Date(challenge.end_date);
  const daysLeft = Math.max(0, Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="challenge-banner" onClick={onStartChallenge}>
      <div className="challenge-banner-icon">
        <Trophy size={20} />
      </div>
      <div className="challenge-banner-info">
        <div className="challenge-banner-title">
          {challenge.theme || t('challenges.weekly', 'Weekly Challenge')}
        </div>
        <div className="challenge-banner-meta">
          <Clock size={12} /> {daysLeft} {t('challenges.days_left', 'days left')}
        </div>
      </div>
    </div>
  );
};

export default ChallengeBanner;
