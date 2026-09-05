import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Menu, GraduationCap, Bug,
  Zap, Mic, Link, Braces, X, ChevronUp, Lock, Flame, SlidersHorizontal,
  Layers, CheckSquare, Cpu, Compass,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore, { readinessFromStats } from '../store/useStore';
import './Header.css';

const MODES = [
  { id: 'swipe', icon: Layers, titleKey: 'modes.swipe', shortKey: 'modes.swipe' },
  { id: 'test', icon: CheckSquare, titleKey: 'modes.test', shortKey: 'modes.test' },
  { id: 'system-design', icon: Cpu, titleKey: 'modes.system_design', shortKey: 'modes.system_design' },
  { id: 'bug-hunting', icon: Bug, titleKey: 'modes.bug_hunting', shortKey: 'modes.bug_hunting' },
  { id: 'blitz', icon: Zap, titleKey: 'modes.blitz', shortKey: 'modes.blitz' },
  { id: 'mock-interview', icon: Mic, titleKey: 'modes.mock_interview', shortKey: 'modes.mock_interview' },
  { id: 'concept-linker', icon: Link, titleKey: 'modes.concept_linker', shortKey: 'modes.concept_linker' },
  { id: 'code-completion', icon: Braces, titleKey: 'modes.code_completion', shortKey: 'modes.code_completion' },
  { id: 'track', icon: Compass, titleKey: 'modes.track_mode', shortKey: 'modes.track_mode' },
];
const BOTTOM_VISIBLE = 4;

const Header = ({ onSettingsClick, onProgressClick, onTrackClick, onTopClick, onFilterClick }) => {
  const { t } = useTranslation();
  const {
    stats,
    learningMode,
    setLearningMode,
    canAccessMode,
    requestPaywall,
    todaySeen,
    dailyGoal,
    dailyDone,
    selectedCategories,
    selectedFrameworks,
    selectedTopics,
    selectedDifficulties,
    filterOnlyTop,
  } = useStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeFiltersCount =
    (selectedCategories?.length || 0) +
    (selectedFrameworks?.length || 0) +
    (selectedTopics?.length || 0) +
    (selectedDifficulties?.length || 0) +
    (filterOnlyTop ? 1 : 0);

  const progress = stats.totalQuestions > 0 ? (stats.known / stats.totalQuestions) * 100 : 0;
  const { readiness } = readinessFromStats(stats);
  // The slim bar tracks today's goal (answers today vs dailyGoal), not overall
  // readiness — otherwise it looks "empty" at the start of every day.
  const dailyProgress = dailyGoal > 0 ? Math.min(100, (todaySeen / dailyGoal) * 100) : 0;

  const extraActive = MODES.slice(BOTTOM_VISIBLE).some(m => m.id === learningMode);

  return (
    <>
      <header className="header">
        <div className="header-content">
          <div className="header-top">
            <div className="header-title">
              <TrendingUp size={20} className="header-logo" />
              <span className="header-brand">Prep-It</span>
            </div>
            <div className="header-actions">
              <button
                className={`action-btn filter-btn ${activeFiltersCount > 0 ? 'has-active' : ''}`}
                onClick={onFilterClick}
                type="button"
                aria-label={t('common.filters', 'Filters')}
                title={t('common.filters', 'Filters')}
              >
                <SlidersHorizontal size={20} />
                {activeFiltersCount > 0 && <span className="filter-badge">{activeFiltersCount}</span>}
              </button>
              <button
                className="action-btn"
                onClick={onSettingsClick}
                type="button"
                aria-label={t('header.settings')}
                title={t('header.settings')}
              >
                <Menu size={26} />
              </button>
            </div>
          </div>

          {/* Calm, minimal stats: one slim progress line + a tiny info row */}
          <div className="stats-container" onClick={onProgressClick} title={t('header.open_progress', 'Open progress')} style={{ cursor: 'pointer' }}>
            <div className="progress-bar slim"><div className="progress-fill" style={{ width: `${dailyProgress}%` }} /></div>
            <div className="stats-mini">
              <span className="readiness-mini"><strong>{readiness}%</strong></span>
              {stats.streak > 0 && (
                <span className="streak-mini" title={`Longest: ${stats.longestStreak} days`}>{stats.streak}</span>
              )}
              <span className={`daily-mini ${dailyDone ? 'done' : ''}`}>
                {dailyDone ? t('header.daily_done') : t('header.daily', { done: todaySeen, goal: dailyGoal })}
              </span>
            </div>
          </div>
        </div>
      </header>

      {drawerOpen && <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />}

      <div className={`mode-drawer ${drawerOpen ? 'open' : ''}`}>
        <div className="drawer-handle" onClick={() => setDrawerOpen(false)} role="button" tabIndex={0} aria-label="Close" />
        <div className="drawer-header">
          <span>{t('header.learning_mode')}</span>
          <button className="drawer-close" onClick={() => setDrawerOpen(false)} type="button"><X size={18} /></button>
        </div>
        <div className="drawer-modes">
          <button
            className="drawer-mode-btn"
            style={{ gridColumn: '1 / -1', background: 'var(--cream)', border: '2px solid var(--ink)' }}
            onClick={() => { setDrawerOpen(false); onTopClick?.(); }}
            type="button"
          >
            <div className="drawer-mode-icon"><Flame size={22} color="#ff6b4a" /></div>
            <span className="drawer-mode-label" style={{ fontWeight: 800 }}>{t('top.title', 'Top Questions')}</span>
            <span className="pro-tag" style={{ background: 'var(--lime)', color: 'var(--ink)' }}>HOT</span>
          </button>
          {MODES.map(({ id, icon: Icon, titleKey }) => {
            const locked = !canAccessMode(id);
            return (
              <button key={id} className={`drawer-mode-btn ${learningMode === id ? 'active' : ''} ${locked ? 'locked' : ''}`}
                onClick={() => {
                  if (id === 'track') { setDrawerOpen(false); onTrackClick?.(); return; }
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
              onClick={() => locked ? requestPaywall(id) : setLearningMode(id)} type="button"
              title={t(shortKey)}>
              <div className="nav-icon-wrap"><Icon size={22} />{locked && <Lock size={11} className="nav-lock" />}</div>
              <span>{t(shortKey)}</span>
              {locked && <span className="pro-tag small">PRO</span>}
            </button>
          );
        })}
        <button className={`bottom-nav-item ${extraActive ? 'active' : ''}`}
          onClick={() => setDrawerOpen(p => !p)} type="button"
          title={t('header.more')}>
          <ChevronUp size={22} style={{ transform: drawerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }} />
          <span>{t('header.more')}</span>
        </button>
      </nav>
    </>
  );
};
export default Header;
