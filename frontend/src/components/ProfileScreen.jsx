import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import apiClient from '../api/client';
import { User, CheckCircle2, Download, Trophy, Flame, Settings, ArrowLeft, Edit2, Save, X, Mail, Phone, Globe } from 'lucide-react';
import './ProfileScreen.css';

function ProfileScreen({ onBack, onSettingsClick }) {
  const { t } = useTranslation();
  const { user, stats } = useStore();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.first_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    setDisplayName(user?.first_name || '');
    setUsername(user?.username || '');
  }, [user]);

  const handleSave = async () => {
    try {
      const res = await apiClient.updateProfile({ first_name: displayName, username });
      if (res?.user?.first_name) {
        useStore.setState({ user: { ...useStore.getState().user, first_name: res.user.first_name, username: res.user.username } });
      }
      setSaveStatus('saved');
      setEditing(false);
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (e) {
      setSaveStatus('error');
    }
  };

  const plan = user?.plan;
  const streak = stats?.streak;
  const progress = stats?.totalQuestions > 0 ? (stats.known / stats.totalQuestions) * 100 : 0;
  const planLabel = plan === 'pro' ? 'Pro' : plan === 'annual_pro' ? 'Annual Pro' : plan === 'pro_max' ? 'Pro Max' : 'Free';
  const planColor = plan === 'pro' || plan === 'annual_pro' ? 'var(--amber)' : plan === 'pro_max' ? '#7048e8' : 'var(--ink-soft)';

  return (
    <div className="profile-screen">
      <div className="profile-header">
        <button className="back-btn" onClick={onBack} type="button">
          <ArrowLeft size={20} />
        </button>
        <h1>{t('profile.title', 'Profile')}</h1>
        <button className="settings-btn" onClick={onSettingsClick} type="button" aria-label={t('header.settings', 'Settings')}>
          <Settings size={20} />
        </button>
      </div>

      <div className="profile-avatar-section">
        <div className="profile-avatar">
          <User size={48} />
        </div>
        <div className="profile-name-section">
          {editing ? (
            <div className="profile-edit-row">
              <input className="profile-input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" maxLength={64} />
              <button className="icon-btn" onClick={handleSave} type="button" aria-label="Save"><Save size={16} /></button>
              <button className="icon-btn" onClick={() => { setEditing(false); setDisplayName(user?.first_name || ''); }} type="button" aria-label="Cancel"><X size={16} /></button>
            </div>
          ) : (
            <div className="profile-name-row">
              <span className="profile-name">{user?.first_name || user?.username || 'User'}</span>
              <button className="icon-btn" onClick={() => setEditing(true)} type="button" aria-label="Edit"><Edit2 size={14} /></button>
            </div>
          )}
          {username && <span className="profile-username">@{username}</span>}
          <span className="profile-plan" style={{ color: planColor }}>{planLabel}</span>
        </div>
      </div>

      <div className="profile-stats">
        <div className="profile-stat">
          <Trophy size={18} />
          <span className="profile-stat-val">{stats?.known || 0}</span>
          <span className="profile-stat-lbl">{t('profile.known')}</span>
        </div>
        <div className="profile-stat">
          <Flame size={18} />
          <span className="profile-stat-val">{streak || 0}</span>
          <span className="profile-stat-lbl">{t('profile.streak')}</span>
        </div>
        <div className="profile-stat">
          <CheckCircle2 size={18} />
          <span className="profile-stat-val">{stats?.accuracy || 0}%</span>
          <span className="profile-stat-lbl">{t('profile.accuracy')}</span>
        </div>
        <div className="profile-stat">
          <Mail size={18} />
          <span className="profile-stat-val">{stats?.totalQuestions || 0}</span>
          <span className="profile-stat-lbl">{t('profile.total')}</span>
        </div>
      </div>

      <div className="profile-progress">
        <div className="profile-progress-label">
          <span>{t('profile.readiness')}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="profile-menu">
        <div className="menu-item" onClick={onSettingsClick}>
          <Settings size={18} />
          <span>{t('header.settings')}</span>
        </div>
        <div className="menu-item" onClick={() => {/* export */}}>
          <Download size={18} />
          <span>{t('header.export')}</span>
        </div>
      </div>

      {saveStatus === 'saved' && <div className="profile-toast">{t('profile.saved', 'Saved!')}</div>}
      {saveStatus === 'error' && <div className="profile-toast profile-toast--error">{t('profile.save_error', 'Save failed')}</div>}
    </div>
  );
}

export default ProfileScreen;
