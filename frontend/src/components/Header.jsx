import React from 'react';
import { TrendingUp, Settings, Layout, GraduationCap, Bug, Zap, Mic, Link, Braces, FileText } from 'lucide-react';
import useStore from '../store/useStore';
import './Header.css';

const LANG_LABELS = { Java: '☕ Java', Python: '🐍 Python', TypeScript: '🔷 TS' };

const Header = ({ onSettingsClick, onResumeClick }) => {
  const { stats, learningMode, setLearningMode, language, setLanguage, loadQuestions } = useStore();
  const progress = stats.totalQuestions > 0 ? (stats.known / stats.totalQuestions) * 100 : 0;

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
    loadQuestions();
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-top">
          <div className="header-title">
            <TrendingUp size={24} />
            <h1>Interview Tinder</h1>
            <select className="lang-select" value={language} onChange={handleLanguageChange}>
              {Object.entries(LANG_LABELS).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>
          <div className="header-actions">
            <div className="mode-switcher">
              <button
                className={`mode-button ${learningMode === 'swipe' ? 'active' : ''}`}
                onClick={() => setLearningMode('swipe')}
                title="Режим карточек"
              >
                <Layout size={18} />
              </button>
              <button
                className={`mode-button ${learningMode === 'test' ? 'active' : ''}`}
                onClick={() => setLearningMode('test')}
                title="Режим теста"
              >
                <GraduationCap size={18} />
              </button>
              <button
                className={`mode-button ${learningMode === 'bug-hunting' ? 'active' : ''}`}
                onClick={() => setLearningMode('bug-hunting')}
                title="Охота на баги"
              >
                <Bug size={18} />
              </button>
              <button
                className={`mode-button ${learningMode === 'blitz' ? 'active' : ''}`}
                onClick={() => setLearningMode('blitz')}
                title="Блиц-режим"
              >
                <Zap size={18} />
              </button>
              <button
                className={`mode-button ${learningMode === 'mock-interview' ? 'active' : ''}`}
                onClick={() => setLearningMode('mock-interview')}
                title="Мок-интервью"
              >
                <Mic size={18} />
              </button>
              <button
                className={`mode-button ${learningMode === 'concept-linker' ? 'active' : ''}`}
                onClick={() => setLearningMode('concept-linker')}
                title="Связи понятий"
              >
                <Link size={18} />
              </button>
              <button
                className={`mode-button ${learningMode === 'code-completion' ? 'active' : ''}`}
                onClick={() => setLearningMode('code-completion')}
                title="Завершение кода"
              >
                <Braces size={18} />
              </button>
            </div>
            {onResumeClick && (
              <button
                className="settings-button"
                onClick={onResumeClick}
                title="Анализ резюме"
              >
                <FileText size={20} />
              </button>
            )}
            {onSettingsClick && (
              <button
                className="settings-button"
                onClick={onSettingsClick}
                aria-label="Настройки категорий"
              >
                <Settings size={20} />
              </button>
            )}
          </div>
        </div>
        <div className="stats-container">
          <div className="stats-text">
            Изучено: <strong>{stats.known}</strong> / {stats.totalQuestions}
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
