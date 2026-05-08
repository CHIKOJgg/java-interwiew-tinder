import React, { useState, useCallback } from 'react';
import {
  TrendingUp, Settings, Layout, GraduationCap, Bug,
  Zap, Mic, Link, Braces, FileText, Star, ChevronUp, X, ShieldCheck
} from 'lucide-react';
import useStore from '../store/useStore';
import './Header.css';

const LANG_LABELS = { Java: '☕ Java', Python: '🐍 Python', TypeScript: '🔷 TS' };
const MODES = [
  { id: 'swipe', icon: Layout, title: 'Карточки', short: 'Свайп' },
  { id: 'test', icon: GraduationCap, title: 'Тест', short: 'Тест' },
  { id: 'bug-hunting', icon: Bug, title: 'Охота на баги', short: 'Баги' },
  { id: 'blitz', icon: Zap, title: 'Блиц', short: 'Блиц' },
  { id: 'mock-interview', icon: Mic, title: 'Мок-интервью', short: 'Интервью' },
  { id: 'concept-linker', icon: Link, title: 'Связи понятий', short: 'Связи' },
  { id: 'code-completion', icon: Braces, title: 'Код', short: 'Код' },
];
const BOTTOM_VISIBLE = 4;

const Header = ({ onSettingsClick, onResumeClick, onSubscriptionClick, onLanguageChange, onAdminClick }) => {
  const { stats, categoryStats, selectedCategories, learningMode, setLearningMode, language, user } = useStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const progress = stats.totalQuestions > 0 ? (stats.known / stats.totalQuestions) * 100 : 0;
  const hasCat = selectedCategories?.length > 0 && (categoryStats?.total || 0) > 0;
  const catProgress = hasCat ? (categoryStats.known / categoryStats.total) * 100 : 0;
  const topicLabel = selectedCategories?.length === 1 ? selectedCategories[0] : `${selectedCategories?.length} тем`;

  const handleLang = useCallback((e) => onLanguageChange?.(e.target.value), [onLanguageChange]);
  const isPremium = user?.plan && user.plan !== 'free';
  const extraActive = MODES.slice(BOTTOM_VISIBLE).some(m => m.id === learningMode);

  const [showStreakAnim, setShowStreakAnim] = useState(false);
  useEffect(() => {
    if (stats.streakIncreased) {
      setShowStreakAnim(true);
      const t = setTimeout(() => setShowStreakAnim(false), 2000);
      return () => clearTimeout(t);
    }
  }, [stats.streak, stats.streakIncreased]);

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
              <button className={`action-btn ${isPremium ? 'premium' : ''}`} onClick={onSubscriptionClick} type="button">
                <Star size={20} fill={isPremium ? '#fff' : 'none'} />
              </button>
              <button className="action-btn" onClick={onResumeClick} type="button"><FileText size={20} /></button>
              <button className="action-btn" onClick={onSettingsClick} type="button"><Settings size={20} /></button>
              {user?.plan === 'admin' && (
                <button className="action-btn admin-btn" onClick={onAdminClick} type="button"><ShieldCheck size={20} /></button>
              )}
            </div>
          </div>

          <div className="stats-container">
            <div className="stats-row">
              <span className="stats-text">
                Изучено: <strong>{stats.known}</strong>/{stats.totalQuestions}
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
            </div>
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
            {hasCat && (
              <div className="progress-bar topic-bar"><div className="progress-fill topic-fill" style={{ width: `${catProgress}%` }} /></div>
            )}
          </div>
        </div>
      </header>

      {drawerOpen && <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />}

      <div className={`mode-drawer ${drawerOpen ? 'open' : ''}`}>
        <div className="drawer-handle" />
        <div className="drawer-header">
          <span>Режим обучения</span>
          <button className="drawer-close" onClick={() => setDrawerOpen(false)} type="button"><X size={18} /></button>
        </div>
        <div className="drawer-modes">
          {MODES.map(({ id, icon: Icon, title }) => (
            <button key={id} className={`drawer-mode-btn ${learningMode === id ? 'active' : ''}`}
              onClick={() => { setLearningMode(id); setDrawerOpen(false); }} type="button">
              <div className="drawer-mode-icon"><Icon size={22} /></div>
              <span className="drawer-mode-label">{title}</span>
              {learningMode === id && <div className="drawer-active-dot" />}
            </button>
          ))}
        </div>
      </div>

      <nav className="bottom-nav">
        {MODES.slice(0, BOTTOM_VISIBLE).map(({ id, icon: Icon, short }) => (
          <button key={id} className={`bottom-nav-item ${learningMode === id ? 'active' : ''}`}
            onClick={() => setLearningMode(id)} type="button">
            <Icon size={22} /><span>{short}</span>
          </button>
        ))}
        <button className={`bottom-nav-item ${extraActive ? 'active' : ''}`}
          onClick={() => setDrawerOpen(p => !p)} type="button">
          <ChevronUp size={22} style={{ transform: drawerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }} />
          <span>Ещё</span>
        </button>
      </nav>
    </>
  );
};
export default Header;