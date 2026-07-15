import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TrendingUp, Settings, GraduationCap, Bug,
  Zap, Mic, Link, Braces, FileText, Star, ChevronUp, X, ShieldCheck, HelpCircle,
  MoreVertical, Globe, Languages, Lock,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore, { readinessFromStats } from '../store/useStore';
import './Header.css';

const LANG_LABELS = { Java: '☕ Java', Python: '🐍 Python', TypeScript: '🔷 TS' };
const MODES = [
  { id: 'swipe', icon: GraduationCap, titleKey: 'modes.swipe', shortKey: 'modes.swipe' },
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
  const { stats, learningMode, setLearningMode, language, user, canAccessMode, requestPaywall, todaySeen, dailyGoal, dailyDone } = useStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const progress = stats.totalQuestions > 0 ? (stats.known / stats.totalQuestions) * 100 : 0;
  const { readiness } = readinessFromStats(stats);
  const isPremium = user?.plan && user.plan !== 'free';

  const handleLang = useCallback((lng) => {
    if (lng !== language) onLanguageChange?.(lng);
    setMenuOpen(false);
  }, [language, onLanguageChange]);

  const toggleAppLanguage = (lng) => {
    if (lng !== i18n.language) i18n.changeLanguage(lng);
  };

  const closeMenu = () => setMenuOpen(false);
  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const extraActive = MODES.slice(BOTTOM_VISIBLE).some(m => m.id === learningMode);

  const menuItem = (label, Icon, onClick, opts = {}) => (
    <button
      type="button"
      className={`menu-item ${opts.highlight ? 'highlight' : ''}`}
      onClick={() => { setMenuOpen(false); onClick(); }}
    >
      <Icon size={18} />
      <span>{label}</span>
      {opts.tag && <span className="menu-item-tag">{opts.tag}</span>}
    </button>
  );

  return (
    <>
      <header className="header">
        <div className="header-content">
          <div className="header-top">
            <div className="header-title">
              <TrendingUp size={18} className="header-logo" />
            </div>
            <div className="header-actions">
              <div className="more-wrap" ref={menuRef}>
                <button
                  className={`action-btn ${menuOpen ? 'active' : ''}`}
                  onClick={() => setMenuOpen(o => !o)}
                  type="button"
                  aria-label={t('header.more')}
                >
                  <MoreVertical size={20} />
                </button>
                {menuOpen && (
                  <div className="more-menu">
                    <div className="menu-section">
                      <div className="menu-section-title"><Globe size={14} /> {t('header.study_lang')}</div>
                      <div className="menu-row">
                        {Object.entries(LANG_LABELS).map(([id, lbl]) => (
                          <button
                            key={id}
                            type="button"
                            className={`menu-chip ${language === id ? 'active' : ''}`}
                            onClick={() => handleLang(id)}
                          >{lbl}</button>
                        ))}
                      </div>
                    </div>
                    <div className="menu-section">
                      <div className="menu-section-title"><Languages size={14} /> {t('header.interface_lang')}</div>
                      <div className="menu-row">
                        <button type="button" className={`menu-chip ${i18n.language === 'ru' ? 'active' : ''}`} onClick={() => toggleAppLanguage('ru')}>RU</button>
                        <button type="button" className={`menu-chip ${i18n.language === 'en' ? 'active' : ''}`} onClick={() => toggleAppLanguage('en')}>EN</button>
                      </div>
                    </div>
                    <div className="menu-list">
                      {menuItem(t('header.subscription'), Star, onSubscriptionClick, { highlight: !isPremium, tag: isPremium ? 'PRO' : null })}
                      {menuItem(t('header.resume'), FileText, onResumeClick)}
                      {menuItem(t('header.help'), HelpCircle, onHelpClick)}
                      {menuItem(t('header.settings'), Settings, onSettingsClick)}
                      {user?.plan === 'admin' && menuItem(t('header.admin'), ShieldCheck, onAdminClick)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Calm, minimal stats: one slim progress line + a tiny info row */}
          <div className="stats-container" onClick={onProgressClick} title={t('header.open_progress', 'Open progress')} style={{ cursor: 'pointer' }}>
            <div className="progress-bar slim"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
            <div className="stats-mini">
              <span className="readiness-mini"><strong>{readiness}%</strong></span>
              {stats.streak > 0 && (
                <span className="streak-mini" title={`Longest: ${stats.longestStreak} days`}>🔥 {stats.streak}</span>
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
