import React from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import { Award, TrendingUp, Flame, Zap, ShieldCheck, BookOpen, Bug, Target, Star, RotateCcw } from 'lucide-react';
import './AchievementScreen.css';

const BADGE_MAP = {
  'first_question': { icon: '🎯', nameKey: 'badges.first_question', color: '#5c7cfa' },
  'known_10': { icon: '🏅', nameKey: 'badges.known_10', color: '#69db7c' },
  'known_50': { icon: '🏆', nameKey: 'badges.known_50', color: '#ffd43b' },
  'known_100': { icon: '🏆', nameKey: 'badges.known_100', color: '#ff922b' },
  'known_500': { icon: '👑', nameKey: 'badges.known_500', color: '#e64980' },
  'streak_3': { icon: '🔥', nameKey: 'badges.streak_3', color: '#ff6b6b' },
  'streak_7': { icon: '🔥', nameKey: 'badges.streak_7', color: '#ff922b' },
  'streak_30': { icon: '💎', nameKey: 'badges.streak_30', color: '#7950f2' },
  'bug_hunter': { icon: '🐛', nameKey: 'badges.bug_hunter', color: '#20c997' },
  'blitz_master': { icon: '⚡', nameKey: 'badges.blitz_master', color: '#fcc419' },
  'daily_login': { icon: '📅', nameKey: 'badges.daily_login', color: '#a5d8ff' },
  'refer_friend': { icon: '🤝', nameKey: 'badges.refer_friend', color: '#d6336c' },
};

function AchievementScreen({ onBack }) {
  const { t } = useTranslation();
  const { badges } = useStore();

  const [unlockedBadges, setUnlockedBadges] = React.useState([]);
  const [allBadges, setAllBadges] = React.useState(Object.entries(BADGE_MAP));

  React.useEffect(() => {
    if (badges) {
      setUnlockedBadges(badges);
    }
  }, [badges]);

  const unlockedSet = new Set(unlockedBadges.map(b => b.badge_key));

  return (
    <div className="achievement-screen">
      <div className="achievement-header">
        <button className="back-btn" onClick={onBack} type="button">
          <RotateCcw size={20} />
        </button>
        <h1>{t('achievements.title', 'Achievements')}</h1>
        <div className="achievement-count">
          {unlockedSet.size} / {allBadges.length}
        </div>
      </div>

      <div className="progress-bar-container">
        <div
          className="progress-fill"
          style={{ width: `${(unlockedSet.size / allBadges.length) * 100}%` }}
        />
      </div>

      <div className="badges-grid">
        {allBadges.map(([key, badge]) => {
          const unlocked = unlockedSet.has(key);
          return (
            <div
              key={key}
              className={`badge-card ${unlocked ? 'unlocked' : 'locked'}`}
              style={{ '--badge-color': badge.color }}
            >
              <div className="badge-icon">{badge.icon}</div>
              <div className="badge-name">
                {unlocked
                  ? t(`badges.${key}`, badge.nameKey)
                  : t(`badges.${key}_locked`, `???`)
                }
              </div>
              {unlocked && (
                <div className="badge-check">✓</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AchievementScreen;