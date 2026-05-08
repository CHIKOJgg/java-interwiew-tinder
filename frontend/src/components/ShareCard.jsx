import React, { useEffect, useState } from 'react';
import { Share2, Trophy, Flame, Target, Users, X } from 'lucide-react';
import apiClient from '../api/client';
import useStore from '../store/useStore';
import './ShareCard.css';

const ShareCard = ({ stats, onBack }) => {
  const { user, language } = useStore();
  const [percentile, setPercentile] = useState(null);

  useEffect(() => {
    const fetchPercentile = async () => {
      try {
        const res = await apiClient.getPercentile(stats.known);
        setPercentile(res.percentile);
      } catch (e) {
        console.error('Failed to fetch percentile', e);
      }
    };
    fetchPercentile();
  }, [stats.known]);

  const shareUrl = `${window.location.origin}/?ref=share&from=${user?.telegram_id}`;
  const shareText = `🚀 I'm crushing my ${language} interviews! Streak: ${stats.streak} days, Knowledge: ${stats.known} concepts. Better than ${percentile || 'most'}% of devs!`;

  const handleShareStory = () => {
    const tg = window.Telegram?.WebApp;
    if (tg?.shareToStory) {
      // In a real production app, we'd generate a dynamic image URL for the story
      // For now, we use the text-based story sharing if available
      tg.shareToStory(shareUrl, { text: shareText });
    } else {
      handleShareChat();
    }
  };

  const handleShareChat = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="share-card-overlay">
      <div className="share-card">
        <button className="close-btn" onClick={onBack}><X size={20} /></button>
        
        <div className="share-card-header">
          <Trophy className="trophy-icon" size={40} />
          <h2>Session Complete!</h2>
          <p>You're becoming a ${language} master</p>
        </div>

        <div className="share-stats-grid">
          <div className="share-stat">
            <Flame className="stat-icon streak" size={20} />
            <span className="stat-val">{stats.streak}</span>
            <span className="stat-lab">Day Streak</span>
          </div>
          <div className="share-stat">
            <Target className="stat-icon target" size={20} />
            <span className="stat-val">{stats.known}</span>
            <span className="stat-lab">Concepts</span>
          </div>
          <div className="share-stat wide">
            <Users className="stat-icon users" size={20} />
            <span className="stat-val">Top {100 - (percentile || 0)}%</span>
            <span className="stat-lab">of devs this week</span>
          </div>
        </div>

        <div className="share-actions">
          <button className="share-btn primary" onClick={handleShareStory}>
            <Share2 size={18} />
            Share to Story
          </button>
          <button className="share-btn secondary" onClick={handleShareChat}>
            Send to Friends
          </button>
        </div>

        <p className="referral-hint">Friends who join via your link get 1 week of Pro!</p>
      </div>
    </div>
  );
};

export default ShareCard;
