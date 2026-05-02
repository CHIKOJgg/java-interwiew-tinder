import React, { useState, useCallback } from 'react';
import {
  TrendingUp, Settings, Layout, GraduationCap, Bug,
  Zap, Mic, Link, Braces, FileText, Star, ChevronUp, X
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

// First 4 modes always visible in the bottom bar; rest in the drawer
const BOTTOM_VISIBLE = 4;

const Header = ({ onSettingsClick, onResumeClick, onSubscriptionClick, onLanguageChange }) => {
  const { stats, learningMode, setLearningMode, language, user } = useStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const progress = stats.totalQuestions > 0
    ? (stats.known / stats.totalQuestions) * 100
    : 0;

  const handleLangChange = useCallback((e) => {
    onLanguageChange?.(e.target.value);
  }, [onLanguageChange]);

  const activeMode = MODES.find(m => m.id === learningMode) || MODES[0];
  const ActiveIcon = activeMode.icon;

  const handleModeSelect = (id) => {
    setLearningMode(id);
    setDrawerOpen(false);
  };

  const isPremium = user?.plan && user.plan !== 'free';

  return (
    <>
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="header">
        <div className="header-content">
          <div className="header-top">
            {/* Title + Language */}
            <div className="header-title">
              <TrendingUp size={20} className="header-logo" />
              <h1>Interview Tinder</h1>
              <select
                className="lang-select"
                value={language}
                onChange={handleLangChange}
              >
                {Object.entries(LANG_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </div>

            {/* Right action buttons */}
            <div className="header-actions">
              <button
                className={`action-btn ${isPremium ? 'premium' : ''}`}
                onClick={onSubscriptionClick}
                title="Подписка"
              >
                <Star size={18} fill={isPremium ? '#ffd43b' : 'none'} />
              </button>
              <button className="action-btn" onClick={onResumeClick} title="Резюме">
                <FileText size={18} />
              </button>
              <button className="action-btn" onClick={onSettingsClick} title="Категории">
                <Settings size={18} />
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="stats-container">
            <div className="stats-text">
              Изучено: <strong>{stats.known}</strong> / {stats.totalQuestions}
              {isPremium && (
                <span className="plan-badge">
                  {' '}· {user.plan === 'admin' ? '👑 Admin' : '⭐ Pro'}
                </span>
              )}
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </header>

      {/* ── Mode drawer overlay ──────────────────────────────────── */}
      {drawerOpen && (
        <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
      )}

      {/* ── Mode drawer sheet ────────────────────────────────────── */}
      <div className={`mode-drawer ${drawerOpen ? 'open' : ''}`}>
        <div className="drawer-handle" />
        <div className="drawer-header">
          <span>Режим обучения</span>
          <button className="drawer-close" onClick={() => setDrawerOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="drawer-modes">
          {MODES.map(({ id, icon: Icon, title }) => (
            <button
              key={id}
              className={`drawer-mode-btn ${learningMode === id ? 'active' : ''}`}
              onClick={() => handleModeSelect(id)}
            >
              <div className="drawer-mode-icon">
                <Icon size={22} />
              </div>
              <span className="drawer-mode-label">{title}</span>
              {learningMode === id && <div className="drawer-active-dot" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bottom navigation bar ────────────────────────────────── */}
      <nav className="bottom-nav">
        {MODES.slice(0, BOTTOM_VISIBLE).map(({ id, icon: Icon, short }) => (
          <button
            key={id}
            className={`bottom-nav-item ${learningMode === id ? 'active' : ''}`}
            onClick={() => setLearningMode(id)}
          >
            <Icon size={22} />
            <span>{short}</span>
          </button>
        ))}

        {/* "More" button opens drawer for the other 3 modes */}
        <button
          className={`bottom-nav-item ${MODES.slice(BOTTOM_VISIBLE).some(m => m.id === learningMode) ? 'active' : ''}`}
          onClick={() => setDrawerOpen(prev => !prev)}
        >
          <ChevronUp
            size={22}
            style={{ transform: drawerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }}
          />
          <span>Ещё</span>
        </button>
      </nav>
    </>
  );
};

export default Header;