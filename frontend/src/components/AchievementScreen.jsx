import React from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import { Target, Award, Trophy, Crown, Flame, Gem, Bug, Zap, Calendar, Hand, Check, ArrowLeft } from 'lucide-react';
import './AchievementScreen.css';

const BADGE_MAP = {
  'first_question': { icon: Target, nameKey: 'badges.first_question', color: '#5c7cfa' },
  'known_10': { icon: Award, nameKey: 'badges.known_10', color: '#69db7c' },
  'known_50': { icon: Trophy, nameKey: 'badges.known_50', color: '#ffd43b' },
  'known_100': { icon: Trophy, nameKey: 'badges.known_100', color: '#ff922b' },
  'known_500': { icon: Crown, nameKey: 'badges.known_500', color: '#e64980' },
  'streak_3': { icon: Flame, nameKey: 'badges.streak_3', color: '#ff6b6b' },
  'streak_7': { icon: Flame, nameKey: 'badges.streak_7', color: '#ff922b' },
  'streak_30': { icon: Gem, nameKey: 'badges.streak_30', color: '#7950f2' },
  'bug_hunter': { icon: Bug, nameKey: 'badges.bug_hunter', color: '#20c997' },
  'blitz_master': { icon: Zap, nameKey: 'badges.blitz_master', color: '#fcc419' },
  'daily_login': { icon: Calendar, nameKey: 'badges.daily_login', color: '#a5d8ff' },
  'refer_friend': { icon: Hand, nameKey: 'badges.refer_friend', color: '#d6336c' },
};

function AchievementScreen({ onBack }) {
  const { t } = useTranslation();
  const { badges, isLoadingBadges, loadBadges } = useStore();

  React.useEffect(() => {
    if (!badges) loadBadges();
  }, [badges, loadBadges]);

  const allBadges = badges && badges.length > 0
    ? badges
    : Object.entries(BADGE_MAP).map(([key, badge]) => ({ key, nameKey: badge.nameKey, unlocked: false }));

  const unlockedSet = new Set(allBadges.filter(b => b.unlocked).map(b => b.key));
  const totalCount = Math.max(allBadges.length, Object.keys(BADGE_MAP).length);

  return (
    <div className="achievement-screen">
      <div className="achievement-header">
        <button className="back-btn" onClick={onBack} type="button">
          <ArrowLeft size={20} />
        </button>
        <h1>{t('achievements.title', 'Achievements')}</h1>
        <div className="achievement-count">
          {unlockedSet.size} / {totalCount}
        </div>
      </div>

      <div className="progress-bar-container">
        <div
          className="progress-fill"
          style={{ width: `${totalCount > 0 ? (unlockedSet.size / totalCount) * 100 : 0}%` }}
        />
      </div>

      <div className="badges-grid">
        {allBadges.map((badge) => {
          const key = badge.key;
          const meta = BADGE_MAP[key];
          const unlocked = !!badge.unlocked;
          return (
            <div
              key={key}
              className={`badge-card ${unlocked ? 'unlocked' : 'locked'}`}
              style={{ '--badge-color': meta?.color || '#5c7cfa' }}
            >
              <div className="badge-icon">{meta ? <meta.icon size={22} /> : <Award size={22} />}</div>
              <div className="badge-name">
                {unlocked
                  ? t(`badges.${key}`, badge.name || meta?.nameKey || key)
                  : t(`badges.${key}_locked`, `???`)
                }
              </div>
              {unlocked && (
                <div className="badge-check"><Check size={14} /></div>
              )}
            </div>
          );
        })}
        {isLoadingBadges && allBadges.length === 0 && (
          <div className="badge-name">{t('achievements.loading', 'Loading...')}</div>
        )}
      </div>
    </div>
  );
}

export default AchievementScreen;