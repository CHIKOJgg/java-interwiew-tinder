import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Flame, Target, TrendingUp, RotateCcw, Star, Award, Bookmark } from 'lucide-react';
import useStore, { readinessFromStats } from '../store/useStore';
import apiClient from '../api/client';
import './ProgressScreen.css';

const ProgressScreen = ({ onBack, onReview, onUpgrade, onSavedClick }) => {
  const { t, i18n } = useTranslation();
  const { stats, categoryStats, selectedCategories, language, canAccessMode, savedIds } = useStore();
  const [percentile, setPercentile] = useState(null);
  const [history, setHistory] = useState([]);
  const [topics, setTopics] = useState([]);
  const [period, setPeriod] = useState('7d');

  useEffect(() => {
    let cancelled = false;
    apiClient.getPercentile(stats.known).then(res => {
      if (!cancelled) setPercentile(res.percentile);
    }).catch(() => { if (!cancelled) setPercentile(null); });
    return () => { cancelled = true; };
  }, [stats.known]);

  useEffect(() => {
    apiClient.getStatsHistory(period).then(r => setHistory(r.history || [])).catch(() => setHistory([]));
    apiClient.getTopicStats().then(r => setTopics(r.topics || [])).catch(() => setTopics([]));
  }, [period, language]);

  const answered = stats.known + stats.unknown;
  const accuracy = answered > 0 ? Math.round((stats.known / answered) * 100) : 0;
  const coverage = stats.totalQuestions > 0 ? Math.round((stats.totalSeen / stats.totalQuestions) * 100) : 0;
  const isRu = i18n.language === 'ru';
  const { readiness, tier: readinessTier } = readinessFromStats(stats);

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
        {/* Hero: interview readiness */}
        <div className="readiness-hero">
          <div className="readiness-ring" style={{ '--p': readiness }}>
            <span className="readiness-pct">{readiness}%</span>
          </div>
          <div className="readiness-meta">
            <div className="readiness-title">{t('header.readiness', 'Readiness')}</div>
            <div className={`readiness-tier-badge tier-${readinessTier}`}>{t(`readiness.tier_${readinessTier}`)}</div>
            <p className="readiness-sub">
              {t('progress.readiness_sub', 'Mix of your accuracy ({{accuracy}}%) and how much you\'ve learned ({{known}} questions). Keep going — it grows as you practice.',
                { accuracy, known: stats.known })}
            </p>
          </div>
        </div>

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

        {/* Progress History Chart */}
        {history.length > 0 && (
          <div className="progress-card">
            <div className="period-tabs">
              <button className={period === '7d' ? 'active' : ''} onClick={() => setPeriod('7d')}>7 {t('progress.days', 'days')}</button>
              <button className={period === '30d' ? 'active' : ''} onClick={() => setPeriod('30d')}>30 {t('progress.days', 'days')}</button>
            </div>
            <div className="history-bars">
              {history.map((h, i) => {
                const maxH = Math.max(...history.map(x => (x.known || 0) + (x.unknown || 0)), 1);
                return (
                  <div key={i} className="history-bar-col">
                    <div className="history-bar-stack">
                      <div className="history-bar" style={{ height: `${((h.known || 0) / maxH) * 100}%`, background: '#51cf66' }} />
                      <div className="history-bar" style={{ height: `${((h.unknown || 0) / maxH) * 100}%`, background: '#ff6b6b' }} />
                    </div>
                    <span className="history-date">{new Date(h.day).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en', { day: 'numeric', month: 'short' })}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Topic Accuracy Bars */}
        {topics.length > 0 && (
          <div className="progress-card">
            <h3>{t('progress.topic_accuracy', 'Accuracy by Topic')}</h3>
            {topics.map(t => (
              <div className="topic-accuracy-row" key={t.name}>
                <span className="topic-name">{t.name}</span>
                <div className="topic-bar-track">
                  <div className="topic-bar-fill" style={{
                    width: `${t.accuracy}%`,
                    background: t.accuracy >= 80 ? '#51cf66' : t.accuracy >= 50 ? '#fcc419' : '#ff6b6b'
                  }} />
                </div>
                <span className="topic-accuracy">{t.accuracy}%</span>
              </div>
            ))}
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

        {/* Saved questions */}
        <div className="progress-card saved-cta" onClick={onSavedClick}>
          <div className="cta-icon"><Bookmark size={22} /></div>
          <div className="cta-text">
            <h4>{t('saved.title', 'Saved questions')}</h4>
            <p>{t('progress.saved_desc', 'Questions you bookmarked to review later.')}</p>
          </div>
          <span className="saved-badge">{Object.values(savedIds).filter(Boolean).length}</span>
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
