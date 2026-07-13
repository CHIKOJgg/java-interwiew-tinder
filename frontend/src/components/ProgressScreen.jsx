import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Flame, Target, TrendingUp, RotateCcw, Star, Award } from 'lucide-react';
import useStore from '../store/useStore';
import apiClient from '../api/client';
import './ProgressScreen.css';

const ProgressScreen = ({ onBack, onReview, onUpgrade }) => {
  const { t, i18n } = useTranslation();
  const { stats, categoryStats, selectedCategories, language, canAccessMode } = useStore();
  const [percentile, setPercentile] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiClient.getPercentile(stats.known).then(res => {
      if (!cancelled) setPercentile(res.percentile);
    }).catch(() => { if (!cancelled) setPercentile(null); });
    return () => { cancelled = true; };
  }, [stats.known]);

  const answered = stats.known + stats.unknown;
  const accuracy = answered > 0 ? Math.round((stats.known / answered) * 100) : 0;
  const coverage = stats.totalQuestions > 0 ? Math.round((stats.totalSeen / stats.totalQuestions) * 100) : 0;
  const isRu = i18n.language === 'ru';

  const bars = [
    { label: t('progress.known', 'Known'), value: stats.known, color: '#51cf66' },
    { label: t('progress.unknown', 'Weak'), value: stats.unknown, color: '#ff6b6b' },
  ];
  const maxVal = Math.max(stats.known, stats.unknown, 1);

  return (
    <div className="progress-screen">
      <div className="progress-header">
        <button className="progress-back" onClick={onBack} type="button">←</button>
        <h2>{t('progress.title', 'Your progress')}</h2>
      </div>

      <div className="progress-scroll">
        {/* Hero: percentile + accuracy */}
        <div className="progress-hero">
          <div className="hero-stat">
            <TrendingUp size={20} />
            <div className="hero-value">
              {percentile !== null ? `${percentile}%` : '—'}
            </div>
            <div className="hero-label">
              {t('progress.percentile', 'know more than others')}
            </div>
          </div>
          <div className="hero-stat">
            <Target size={20} />
            <div className="hero-value">{accuracy}%</div>
            <div className="hero-label">{t('progress.accuracy', 'accuracy')}</div>
          </div>
          <div className="hero-stat">
            <Flame size={20} />
            <div className="hero-value">{stats.streak}🔥</div>
            <div className="hero-label">
              {t('progress.streak', 'day streak')}{stats.longestStreak ? ` · ${stats.longestStreak}` : ''}
            </div>
          </div>
        </div>

        {percentile !== null && percentile >= 70 && (
          <div className="progress-brag">
            🏆 {t('progress.brag', 'You know more than {{p}}% of learners. Share your result!', { p: percentile })}
          </div>
        )}

        {/* Known / Weak bars */}
        <div className="progress-card">
          <h3>{t('progress.overview', 'Overview')}</h3>
          {bars.map(b => (
            <div className="bar-row" key={b.label}>
              <span className="bar-label">{b.label}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(b.value / maxVal) * 100}%`, background: b.color }} />
              </div>
              <span className="bar-num">{b.value}</span>
            </div>
          ))}
          <div className="coverage-row">
            <span>{t('progress.coverage', 'Deck coverage')}: <strong>{coverage}%</strong> ({stats.totalSeen}/{stats.totalQuestions})</span>
          </div>
        </div>

        {/* Topic mastery */}
        {selectedCategories?.length > 0 && (categoryStats?.total > 0) && (
          <div className="progress-card">
            <h3>{t('progress.topics', 'Your topics')}</h3>
            <div className="topic-row">
              <span>{selectedCategories.length === 1 ? selectedCategories[0] : `${selectedCategories.length} ${t('common.selected')}`}</span>
              <strong>{categoryStats.known}/{categoryStats.total}</strong>
            </div>
            <div className="bar-track">
              <div className="bar-fill topic" style={{ width: `${(categoryStats.known / Math.max(categoryStats.total, 1)) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Review CTA (Pro) */}
        <div className="progress-card review-cta">
          <div className="cta-icon"><RotateCcw size={22} /></div>
          <div className="cta-text">
            <h4>{t('review.title', 'Mistakes review')}</h4>
            <p>{t('review.cta_desc', 'Rehearse the questions you keep getting wrong until they stick.')}</p>
          </div>
          {canAccessMode('review') ? (
            <button className="cta-btn" onClick={onReview} type="button">{t('review.start', 'Review')}</button>
          ) : (
            <button className="cta-btn pro" onClick={onUpgrade} type="button">
              <Star size={14} /> PRO
            </button>
          )}
        </div>

        {/* Upgrade prompt */}
        <div className="progress-card upgrade-cta" onClick={onUpgrade}>
          <Award size={20} />
          <span>{t('progress.go_pro', 'Unlock all modes, mistakes review & deep analytics with Pro')}</span>
        </div>
      </div>
    </div>
  );
};

export default ProgressScreen;
