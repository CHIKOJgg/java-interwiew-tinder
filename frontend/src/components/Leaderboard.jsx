import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, ArrowLeft, Medal } from 'lucide-react';
import apiClient from '../api/client';
import useStore from '../store/useStore';
import './Leaderboard.css';

const Leaderboard = ({ onBack }) => {
  const { t } = useTranslation();
  const { language, user } = useStore();
  const [leaderboard, setLeaderboard] = useState([]);
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [language]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getCurrentChallenge(language);
      setChallenge(data.challenge);
      setLeaderboard(data.leaderboard || []);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="leaderboard-screen">
      <div className="leaderboard-header">
        <button className="back-btn-absolute" onClick={onBack}>
          <ArrowLeft size={24} />
        </button>
        <h1>{t('leaderboard.title', 'Leaderboard')}</h1>
        {challenge && <p>{challenge.theme}</p>}
      </div>

      <div className="leaderboard-scroll">
        {loading ? (
          <div className="leaderboard-loading">{t('common.loading', 'Loading...')}</div>
        ) : leaderboard.length === 0 ? (
          <div className="leaderboard-empty">
            <Trophy size={48} />
            <p>{t('leaderboard.empty', 'No results yet. Be the first!')}</p>
          </div>
        ) : (
          leaderboard.map((entry, i) => (
            <div
              key={entry.user_id}
              className={`leaderboard-row ${entry.user_id === user?.telegram_id ? 'is-me' : ''}`}
            >
              <div className="leaderboard-rank">
                {i < 3 ? medals[i] : <span>{i + 1}</span>}
              </div>
              <div className="leaderboard-user">
                <div className="leaderboard-name">{entry.first_name || `User ${entry.user_id}`}</div>
                <div className="leaderboard-stats">
                  {entry.questions_answered} {t('challenges.answered', 'answered')} · {entry.accuracy}% {t('challenges.accuracy', 'accuracy')}
                </div>
              </div>
              <div className="leaderboard-score">{entry.score}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
