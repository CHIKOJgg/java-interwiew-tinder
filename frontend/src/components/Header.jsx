import React from 'react';
import { TrendingUp } from 'lucide-react';
import useStore from '../store/useStore';
import './Header.css';

const Header = () => {
  const stats = useStore((state) => state.stats);
  const progress = stats.totalQuestions > 0 
    ? (stats.known / stats.totalQuestions) * 100 
    : 0;

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-title">
          <TrendingUp size={24} />
          <h1>Java Interview Tinder</h1>
        </div>
        <div className="stats-container">
          <div className="stats-text">
            Изучено: <strong>{stats.known}</strong> / {stats.totalQuestions}
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
