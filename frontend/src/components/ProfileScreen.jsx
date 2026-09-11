import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import apiClient from '../api/client';
import { User, CheckCircle2, Download, Trophy, Flame, Settings, ArrowLeft, Edit2, Save, X, BookOpen, Phone, Globe, Laptop, Copy, Check } from 'lucide-react';
import './ProfileScreen.css';

function ProfileScreen({ onBack, onSettingsClick, onExportClick }) {
  const { t } = useTranslation();
  const { user, stats } = useStore();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.first_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [saveStatus, setSaveStatus] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncData, setSyncData] = useState(null); // { code, syncToken, expiresAt }
  const [copiedType, setCopiedType] = useState(null); // 'code' | 'link' | null
  const [showSyncModal, setShowSyncModal] = useState(false);

  useEffect(() => {
    setDisplayName(user?.first_name || '');
    setUsername(user?.username || '');
  }, [user]);

  const handleGenerateSync = async () => {
    setShowSyncModal(true);
    if (syncData && syncData.expiresAt > Date.now()) return;
    setSyncLoading(true);
    try {
      const res = await apiClient.createSyncCode();
      setSyncData({
        code: res.code,
        syncToken: res.syncToken,
        expiresAt: Date.now() + (res.expiresInSeconds || 900) * 1000,
      });
    } catch (e) {
      // ignore
    } finally {
      setSyncLoading(false);
    }
  };

  const copyCode = () => {
    if (!syncData?.code) return;
    navigator.clipboard?.writeText(syncData.code);
    setCopiedType('code');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const copyLink = () => {
    if (!syncData?.syncToken) return;
    const link = `${window.location.origin}/?sync_token=${syncData.syncToken}`;
    navigator.clipboard?.writeText(link);
    setCopiedType('link');
    setTimeout(() => setCopiedType(null), 2000);
  };

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
          <BookOpen size={18} />
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
        <div className="menu-item" onClick={handleGenerateSync}>
          <Laptop size={18} />
          <span>{t('profile.sync_pc', 'Синхронизация с ПК')}</span>
        </div>
        <div className="menu-item" onClick={onSettingsClick}>
          <Settings size={18} />
          <span>{t('header.settings')}</span>
        </div>
        <div className="menu-item" onClick={onExportClick} role="button" tabIndex={0}>
          <Download size={18} />
          <span>{t('header.export')}</span>
        </div>
      </div>

      {showSyncModal && (
        <div className="sync-card" style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 14,
          background: 'var(--surface, #fff)',
          border: '1.5px solid var(--border, #e0e0e0)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 16 }}>
              <Laptop size={20} color="var(--primary, #2b8a3e)" />
              <span>{t('profile.sync_pc_title', 'Вход на компьютере')}</span>
            </div>
            <button
              onClick={() => setShowSyncModal(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              type="button"
            >
              <X size={18} />
            </button>
          </div>

          <p style={{ fontSize: 13, color: 'var(--ink-soft, #666)', lineHeight: 1.4, marginBottom: 16 }}>
            {t('profile.sync_pc_desc', 'Откройте сайт на ПК и введите этот 6-значный код на экране входа. Прогресс, цели и серия синхронизируются мгновенно.')}
          </p>

          {syncLoading ? (
            <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 14, color: 'var(--ink-soft)' }}>
              {t('common.loading', 'Генерация кода…')}
            </div>
          ) : syncData ? (
            <div>
              <div style={{
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: 8,
                textAlign: 'center',
                padding: '12px 16px',
                background: 'var(--bg-subtle, #f8f9fa)',
                borderRadius: 10,
                border: '1.5px dashed var(--border, #ccc)',
                color: 'var(--ink, #111)',
                marginBottom: 12,
                userSelect: 'all',
              }}>
                {syncData.code}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={copyCode}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border, #ccc)',
                    background: 'var(--surface, #fff)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {copiedType === 'code' ? <Check size={15} color="#2b8a3e" /> : <Copy size={15} />}
                  {copiedType === 'code' ? t('common.copied', 'Скопировано!') : t('profile.copy_code', 'Скопировать код')}
                </button>

                <button
                  type="button"
                  onClick={copyLink}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border, #ccc)',
                    background: 'var(--surface, #fff)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {copiedType === 'link' ? <Check size={15} color="#2b8a3e" /> : <Globe size={15} />}
                  {copiedType === 'link' ? t('common.copied', 'Скопировано!') : t('profile.copy_link', 'Копировать ссылку')}
                </button>
              </div>

              <div style={{ fontSize: 11, textAlign: 'center', color: 'var(--ink-subtle, #999)', marginTop: 10 }}>
                ⏳ {t('profile.sync_code_expires', 'Код действует 15 минут')}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {saveStatus === 'saved' && <div className="profile-toast">{t('profile.saved', 'Saved!')}</div>}
      {saveStatus === 'error' && <div className="profile-toast profile-toast--error">{t('profile.save_error', 'Save failed')}</div>}
    </div>
  );
}

export default ProfileScreen;
