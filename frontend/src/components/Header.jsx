import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Settings, Layout, GraduationCap, Bug,
  Zap, Mic, Link, Braces, FileText, Star, ChevronUp, X, ShieldCheck, Languages, Lock, HelpCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore, { readinessFromStats } from '../store/useStore';
import './Header.css';

const LANG_LABELS = { Java: '☕ Java', Python: '🐍 Python', TypeScript: '🔷 TS' };
const MODES = [
  { id: 'swipe', icon: Layout, titleKey: 'modes.swipe', shortKey: 'modes.swipe' },
  { id: 'test', icon: GraduationCap, titleKey: 'modes.test', shortKey: 'modes.test' },
  { id: 'bug-hunting', icon: Bug, titleKey: 'modes.bug_hunting', shortKey: 'modes.bug_hunting' },
  { id: 'blitz', icon: Zap, titleKey: 'modes.blitz', shortKey: 'modes.blitz' },
  { id: 'mock-interview', icon: Mic, titleKey: 'modes.mock_interview', shortKey: 'modes.mock_interview' },
  { id: 'concept-linker', icon: Link, titleKey: 'modes.concept_linker', shortKey: 'modes.concept_linker' },
  { id: 'code-completion', icon: Braces, titleKey: 'modes.code_completion', shortKey: 'modes.code_completion' },
];
const BOTTOM_VISIBLE = 4;

const Header = ({ onSettingsClick, onResumeClick, onSubscriptionClick, onLanguageChange, onAdminClick, onProgressClick, onHelpClick }) => {
  const { t, i18n } = useTranslation();
  const { stats, categoryStats, selectedCategories, learningMode, setLearningMode, language, user, canAccessMode, requestPaywall, todaySeen, dailyGoal, dailyDone, selectedDifficulties } = useStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const progress = stats.totalQuestions > 0 ? (stats.known / stats.totalQuestions) * 100 : 0;
  const hasCat = selectedCategories?.length > 0 && (categoryStats?.total || 0) > 0;
  const catProgress = hasCat ? (categoryStats.known / categoryStats.total) * 100 : 0;
  const topicLabel = selectedCategories?.length === 1 ? selectedCategories[0] : `${selectedCategories?.length} ${t('common.selected')}`;
  const dailyProgress = dailyGoal > 0 ? Math.min((todaySeen / dailyGoal) * 100, 100) : 0;
  const { readiness, tier: readinessTier } = readinessFromStats(stats);

  const handleLang = useCallback((e) => onLanguageChange?.(e.target.value), [onLanguageChange]);
  const isPremium = user?.plan && user.plan !== 'free';
  const extraActive = MODES.slice(BOTTOM_VISIBLE).some(m => m.id === learningMode);

  // Daily Pro CTA: show at most once per calendar day (not every session) to
  // cut upsell fatigue. The first time the daily goal is hit today we mark the
  // day in localStorage so later sessions stay quiet.
  const [dailyProVisible, setDailyProVisible] = useState(false);
  useEffect(() => {
    if (!(dailyDone && !isPremium)) return;
    try {
      const key = `jit_daily_pro_${new Date().toISOString().slice(0, 10)}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '1');
        setDailyProVisible(true);
      }
    } catch { /* ignore */ }
  }, [dailyDone, isPremium]);
  const showDailyPro = dailyProVisible;

  const [showStreakAnim, setShowStreakAnim] = useState(false);
  useEffect(() => {
    if (stats.streakIncreased) {
      setShowStreakAnim(true);
      const t = setTimeout(() => setShowStreakAnim(false), 2000);
      return () => clearTimeout(t);
    }
  }, [stats.streak, stats.streakIncreased]);

  const toggleAppLanguage = () => {
    const nextLang = i18n.language === 'ru' ? 'en' : 'ru';
    i18n.changeLanguage(nextLang);
  };

  return (
    <>
      <header className="header">
        <div className="header-content">
          <div className="header-top">
            <div className="header-title">
              <TrendingUp size={20} className="header-logo" />
              <h1>Interview Tinder</h1>
              <select className="lang-select" value={language} onChange={handleLang}>
                {Object.entries(LANG_LABELS).map(([id, lbl]) => <option key={id} value={id}>{lbl}</option>)}
              </select>
            </div>
            <div className="header-actions">
              <button className="action-btn" onClick={toggleAppLanguage} type="button">
                <Languages size={20} />
              </button>
              <button className={`action-btn ${isPremium ? 'premium' : ''}`} onClick={onSubscriptionClick} type="button">
                <Star size={20} fill={isPremium ? '#fff' : 'none'} />
              </button>
              <button className="action-btn" onClick={onResumeClick} type="button"><FileText size={20} /></button>
              <button className="action-btn" onClick={onHelpClick} type="button" title={t('header.help', 'How it works')}>
                <HelpCircle size={20} />
              </button>
              <button className="action-btn" onClick={onSettingsClick} type="button"><Settings size={20} /></button>
              {user?.plan === 'admin' && (
                <button className="action-btn admin-btn" onClick={onAdminClick} type="button"><ShieldCheck size={20} /></button>
              )}
            </div>
          </div>

          <div className="stats-container" onClick={onProgressClick} title={t('header.open_progress', 'Open progress')} style={{ cursor: 'pointer' }}>
            <div className="stats-row">
              <span className="stats-text">
                {t('header.readiness')}: <strong>{readiness}%</strong>{' '}
                <span className={`readiness-tier tier-${readinessTier}`}>{t(`readiness.tier_${readinessTier}`)}</span>
                {isPremium && <span className="plan-badge"> · {user.plan === 'admin' ? '👑' : '⭐'} {user.plan}</span>}
                {stats.streak > 0 && (
                  <span className="streak-badge" title={`Longest: ${stats.longestStreak} days`}>
                    🔥 {stats.streak}
                    {showStreakAnim && <span className="streak-anim">+1</span>}
                  </span>
                )}
              </span>
                {hasCat && (
                  <span className="topic-counter" title={selectedCategories?.join(', ')}>
                    {topicLabel}: <strong>{categoryStats.known}</strong>/{categoryStats.total}
                  </span>
                )}
                {selectedDifficulties?.length > 0 && (
                  <span className="diff-chip" title={t('header.diff_filter', 'Difficulty filter')}>
                    {selectedDifficulties.map(d => t(`difficulty.${d}`, d)).join('+')}
                  </span>
                )}
            </div>
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
            {hasCat && (
              <div className="progress-bar topic-bar"><div className="progress-fill topic-fill" style={{ width: `${catProgress}%` }} /></div>
            )}
            <div className="daily-goal">
              <span className={`daily-goal-text ${dailyDone ? 'done' : ''}`}>
                {dailyDone
                  ? t('header.daily_done')
                  : t('header.daily', { done: todaySeen, goal: dailyGoal })}
              </span>
              {showDailyPro && (
                <button
                  className="daily-pro-cta"
                  onClick={onSubscriptionClick}
                  type="button"
                  title={t('header.daily_pro', 'See weekly analytics in Pro')}
                >
                  ⭐ Pro
                </button>
              )}
              <div className="progress-bar daily-bar">
                <div className={`progress-fill daily-fill ${dailyDone ? 'done' : ''}`} style={{ width: `${dailyProgress}%` }} />
              </div>
            </div>
          </div>
        </div>
      </header>

      {drawerOpen && <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />}

      <div className={`mode-drawer ${drawerOpen ? 'open' : ''}`}>
        <div className="drawer-handle" />
        <div className="drawer-header">
          <span>{t('header.learning_mode')}</span>
          <button className="drawer-close" onClick={() => setDrawerOpen(false)} type="button"><X size={18} /></button>
        </div>
        <div className="drawer-modes">
          {MODES.map(({ id, icon: Icon, titleKey }) => {
            const locked = !canAccessMode(id);
            return (
              <button key={id} className={`drawer-mode-btn ${learningMode === id ? 'active' : ''} ${locked ? 'locked' : ''}`}
                onClick={() => {
                  if (locked) { requestPaywall(id); setDrawerOpen(false); }
                  else { setLearningMode(id); setDrawerOpen(false); }
                }} type="button">
                <div className="drawer-mode-icon"><Icon size={22} />{locked && <Lock size={11} className="drawer-lock" />}</div>
                <span className="drawer-mode-label">{t(titleKey)}</span>
                {locked && <span className="pro-tag">PRO</span>}
                {learningMode === id && !locked && <div className="drawer-active-dot" />}
              </button>
            );
          })}
        </div>
      </div>

      <nav className="bottom-nav">
        {MODES.slice(0, BOTTOM_VISIBLE).map(({ id, icon: Icon, shortKey }) => {
          const locked = !canAccessMode(id);
          return (
            <button key={id} className={`bottom-nav-item ${learningMode === id ? 'active' : ''} ${locked ? 'locked' : ''}`}
              onClick={() => locked ? requestPaywall(id) : setLearningMode(id)} type="button">
              <div className="nav-icon-wrap"><Icon size={22} />{locked && <Lock size={11} className="nav-lock" />}</div>
              <span>{t(shortKey)}</span>
              {locked && <span className="pro-tag small">PRO</span>}
            </button>
          );
        })}
        <button className={`bottom-nav-item ${extraActive ? 'active' : ''}`}
          onClick={() => setDrawerOpen(p => !p)} type="button">
          <ChevronUp size={22} style={{ transform: drawerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }} />
          <span>{t('header.more')}</span>
        </button>
      </nav>
    </>
  );
};
export default Header;