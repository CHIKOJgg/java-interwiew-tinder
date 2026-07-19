import { useState, useEffect } from 'react';
import { Share2, Trophy, Flame, Target, Users, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';
import useStore from '../store/useStore';
import { useModalA11y } from '../utils/useModalA11y';
import './ShareCard.css';

const ShareCard = ({ stats, onBack }) => {
  const { t } = useTranslation();
  const { user, language } = useStore();
  const dialogRef = useModalA11y(onBack);
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

  const [copied, setCopied] = useState(false);

  const shareUrl = window.Telegram?.WebApp
    ? `https://t.me/JavaInterviewTinderBot?start=${user?.telegram_id}`
    : `${window.location.origin}/?ref=${user?.telegram_id}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  const handleShareX = () => {
    const url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const shareText = t('share.text', {
    language,
    streak: stats.streak,
    known: stats.known,
    rank: 100 - (percentile || 0)
  });

  const handleShareStory = () => {
    const tg = window.Telegram?.WebApp;
    if (tg?.shareToStory) {
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
      <div
        className="share-card"
        role="dialog"
        aria-modal="true"
        aria-label={t('share.title', 'Session Complete!')}
        tabIndex={-1}
        ref={dialogRef}
      >
        <button className="close-btn" onClick={onBack}><X size={20} /></button>
        
        <div className="share-card-header">
          <Trophy className="trophy-icon" size={40} />
          <h2>{t('share.title')}</h2>
          <p>{t('share.subtitle', { language })}</p>
        </div>

        <div className="share-stats-grid">
          <div className="share-stat">
            <Flame className="stat-icon streak" size={20} />
            <span className="stat-val">{stats.streak}</span>
            <span className="stat-lab">{t('share.streak')}</span>
          </div>
          <div className="share-stat">
            <Target className="stat-icon target" size={20} />
            <span className="stat-val">{stats.known}</span>
            <span className="stat-lab">{t('share.concepts')}</span>
          </div>
          <div className="share-stat wide">
            <Users className="stat-icon users" size={20} />
            <span className="stat-val">{t('share.percentile', { rank: 100 - (percentile || 0) })}</span>
            <span className="stat-lab">{t('share.dev_week')}</span>
          </div>
        </div>

        <div className="share-actions">
          <button className="share-btn primary" onClick={handleShareStory}>
            <Share2 size={18} />
            {t('share.story')}
          </button>
          <button className="share-btn secondary" onClick={handleShareChat}>
            {t('share.friends')}
          </button>
          <button className="share-btn secondary" onClick={handleShareX}>
            Share on X
          </button>
          <button className="share-btn secondary" onClick={handleCopy}>
            {copied ? '✓ Copied!' : 'Copy link'}
          </button>
        </div>

        <p className="referral-hint">{t('share.hint')}</p>
      </div>
    </div>
  );
};

export default ShareCard;
