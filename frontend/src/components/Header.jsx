import React from 'react';
import { TrendingUp, Settings, Layout, GraduationCap } from 'lucide-react';
import useStore from '../store/useStore';
import './Header.css';

const Header = ({ onSettingsClick }) => {
  const { stats, learningMode, setLearningMode } = useStore();
  const progress =
    stats.totalQuestions > 0 ? (stats.known / stats.totalQuestions) * 100 : 0;

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-top">
          <div className="header-title">
            <TrendingUp size={24} />
            <h1>Java Interview Tinder</h1>
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
            </div>
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
