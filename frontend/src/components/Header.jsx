import React, { useCallback } from 'react';
import { TrendingUp, Settings, Layout, GraduationCap, Bug, Zap, Mic, Link, Braces, FileText, Star } from 'lucide-react';
import useStore from '../store/useStore';
import './Header.css';

const LANG_LABELS = { Java: '☕ Java', Python: '🐍 Python', TypeScript: '🔷 TS' };
const MODES = [
  { id: 'swipe',           icon: Layout,        title: 'Карточки' },
  { id: 'test',            icon: GraduationCap, title: 'Тест' },
  { id: 'bug-hunting',     icon: Bug,           title: 'Охота на баги' },
  { id: 'blitz',           icon: Zap,           title: 'Блиц' },
  { id: 'mock-interview',  icon: Mic,           title: 'Мок-интервью' },
  { id: 'concept-linker',  icon: Link,          title: 'Связи понятий' },
  { id: 'code-completion', icon: Braces,        title: 'Код' },
];

const Header = ({ onSettingsClick, onResumeClick, onSubscriptionClick, onLanguageChange }) => {
  const { stats, categoryStats, selectedCategories, learningMode, setLearningMode, language, user } = useStore();

  const progress     = stats.totalQuestions > 0 ? (stats.known / stats.totalQuestions) * 100 : 0;
  const hasCatFilter = selectedCategories.length > 0 && (categoryStats?.total || 0) > 0;
  const catProgress  = hasCatFilter ? (categoryStats.known / categoryStats.total) * 100 : 0;
  const topicLabel   = selectedCategories.length === 1 ? selectedCategories[0] : `${selectedCategories.length} тем`;

  const handleLangChange = useCallback((e) => onLanguageChange?.(e.target.value), [onLanguageChange]);

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-top">
          <div className="header-title">
            <TrendingUp size={22} />
            <h1>Interview Tinder</h1>
            <select className="lang-select" value={language} onChange={handleLangChange}>
              {Object.entries(LANG_LABELS).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>
          <div className="header-actions">
            <div className="mode-switcher">
              {MODES.map(({ id, icon: Icon, title }) => (
                <button key={id} className={`mode-button ${learningMode === id ? 'active' : ''}`}
                  onClick={() => setLearningMode(id)} title={title}>
                  <Icon size={18} />
                </button>
              ))}
            </div>
            <button className={`settings-button ${user?.plan && user.plan !== 'free' ? 'premium-badge' : ''}`}
              onClick={onSubscriptionClick} title="Подписка">
              <Star size={20} fill={user?.plan && user.plan !== 'free' ? '#ffd43b' : 'none'} />
            </button>
            <button className="settings-button" onClick={onResumeClick} title="Резюме"><FileText size={20} /></button>
            <button className="settings-button" onClick={onSettingsClick} title="Категории"><Settings size={20} /></button>
          </div>
        </div>

        <div className="stats-container">
          <div className="stats-row">
            <span className="stats-text">
              Изучено: <strong>{stats.known}</strong>/{stats.totalQuestions}
              {user?.plan && user.plan !== 'free' && (
                <span className="plan-badge"> • {user.plan === 'admin' ? '👑' : '⭐'} {user.plan}</span>
              )}
            </span>
            {/* §3 — topic counter */}
            {hasCatFilter && (
              <span className="topic-counter" title={selectedCategories.join(', ')}>
                {topicLabel}: <strong>{categoryStats.known}</strong>/{categoryStats.total}
              </span>
            )}
          </div>
          {/* Global progress bar */}
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          {/* Topic-scoped progress bar (§3) */}
          {hasCatFilter && (
            <div className="progress-bar topic-bar">
              <div className="progress-fill topic-fill" style={{ width: `${catProgress}%` }} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
