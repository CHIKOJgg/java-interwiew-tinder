import React, { useState, useEffect, useCallback } from 'react';
import useStore from '../store/useStore';
import apiClient from '../api/client';
import { Check, Star, Shield, Zap, ArrowLeft, X, Clock, ChevronDown, ChevronUp, Users, AlertCircle } from 'lucide-react';
import './SubscriptionPlans.css';

// ─── Plan config ──────────────────────────────────────────────────────
const PLAN_ICONS = { free: Zap, pro: Star, admin: Shield };
const PLAN_COLORS = { free: '#adb5bd', pro: '#ffd43b', admin: '#748ffc' };

// ─── Admin Panel ──────────────────────────────────────────────────────
const AdminPanel = () => {
  const { user } = useStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [targetId, setTargetId] = useState('');
  const [planId, setPlanId] = useState('pro');
  const [months, setMonths] = useState(12);
  const [grantMsg, setGrantMsg] = useState('');
  const [open, setOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getAdminUsers();
      setUsers(res.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (open) fetchUsers(); }, [open, fetchUsers]);

  const handleGrant = async () => {
    if (!targetId.trim()) return;
    try {
      await apiClient.grantPlan(targetId.trim(), planId, parseInt(months));
      setGrantMsg(`✅ Plan ${planId} granted to ${targetId}`);
      setTargetId('');
      fetchUsers();
    } catch (e) {
      setGrantMsg(`❌ Error: ${e.message}`);
    }
  };

  return (
    <div className="admin-panel">
      <button className="admin-toggle" onClick={() => setOpen(o => !o)}>
        <Shield size={16} />
        Admin Panel
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="admin-content">
          <h3>Grant Subscription</h3>
          <div className="admin-grant-form">
            <input
              className="admin-input"
              placeholder="Telegram User ID"
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
            />
            <select className="admin-select" value={planId} onChange={e => setPlanId(e.target.value)}>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
            </select>
            <select className="admin-select" value={months} onChange={e => setMonths(e.target.value)}>
              <option value={1}>1 month</option>
              <option value={3}>3 months</option>
              <option value={12}>12 months</option>
              <option value={0}>Lifetime</option>
            </select>
            <button className="admin-btn" onClick={handleGrant}>Grant</button>
          </div>
          {grantMsg && <p className="admin-msg">{grantMsg}</p>}

          <h3><Users size={14} /> Users ({users.length})</h3>
          {loading ? <p>Loading...</p> : (
            <div className="admin-users-table">
              <div className="admin-table-header">
                <span>ID</span><span>Name</span><span>Plan</span><span>Seen</span>
              </div>
              {users.slice(0, 20).map(u => (
                <div key={u.telegram_id} className="admin-table-row">
                  <span className="mono">{u.telegram_id}</span>
                  <span>{u.first_name || u.username || '—'}</span>
                  <span className={`plan-tag ${u.subscription_plan || 'free'}`}>{u.subscription_plan || 'free'}</span>
                  <span>{u.questions_seen}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Subscription status banner ───────────────────────────────────────
const StatusBanner = ({ status, onCancel }) => {
  if (!status || status.plan === 'free') return null;

  const isAdmin = status.plan === 'admin' || status.is_admin;
  const expires = status.expires_at ? new Date(status.expires_at).toLocaleDateString('ru-RU') : null;

  return (
    <div className={`status-banner ${isAdmin ? 'admin' : 'pro'}`}>
      <div className="status-info">
        {isAdmin ? <Shield size={18} /> : <Star size={18} />}
        <div>
          <strong>{isAdmin ? '👑 Admin — Unlimited' : `⭐ ${status.plan_name || 'Pro'} активен`}</strong>
          {expires && !isAdmin && <span className="expires-at"><Clock size={12} /> до {expires}</span>}
        </div>
      </div>
      {!isAdmin && (
        <button className="cancel-btn" onClick={onCancel}>
          <X size={14} /> Отменить
        </button>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────
const SubscriptionPlans = ({ onBack }) => {
  const { user, login } = useStore();
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const isAdmin = user?.plan === 'admin' || user?.is_admin;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansRes, statusRes] = await Promise.all([
        apiClient.getPlans(),
        apiClient.getSubscriptionStatus(),
      ]);
      setPlans(plansRes.plans || []);
      setStatus(statusRes);
    } catch (e) {
      setError('Не удалось загрузить данные о подписке.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSubscribe = async (planId) => {
    if (purchasing) return;
    try {
      setPurchasing(planId);
      await apiClient.subscribe(planId);
      // Re-fetch user data so plan badge updates in Header
      if (window.Telegram?.WebApp?.initData) {
        await login(window.Telegram.WebApp.initData).catch(() => {});
      }
      await fetchAll();
    } catch (e) {
      alert(`Ошибка: ${e.message}`);
    } finally {
      setPurchasing(null);
    }
  };

  const handleCancel = async () => {
    if (!cancelConfirm) { setCancelConfirm(true); return; }
    try {
      await apiClient.cancelSubscription();
      setCancelConfirm(false);
      if (window.Telegram?.WebApp?.initData) {
        await login(window.Telegram.WebApp.initData).catch(() => {});
      }
      await fetchAll();
    } catch (e) {
      alert(`Ошибка отмены: ${e.message}`);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await apiClient.getSubscriptionHistory();
      setHistory(res.history || []);
      setShowHistory(true);
    } catch {}
  };

  if (loading) {
    return (
      <div className="subscription-container">
        <div className="sub-header">
          <button className="back-btn" onClick={onBack}><ArrowLeft size={22} /></button>
          <h1>Подписка</h1>
        </div>
        <div className="sub-loading">Загрузка...</div>
      </div>
    );
  }

  const currentPlanId = status?.plan_id || status?.plan || 'free';

  return (
    <div className="subscription-container">
      <div className="sub-header">
        <button className="back-btn" onClick={onBack}><ArrowLeft size={22} /></button>
        <h1>Подписка</h1>
        {isAdmin && <span className="admin-crown">👑</span>}
      </div>

      {error && (
        <div className="sub-error">
          <AlertCircle size={16} /> {error}
          <button onClick={fetchAll}>Повторить</button>
        </div>
      )}

      <StatusBanner
        status={status}
        onCancel={handleCancel}
      />
      {cancelConfirm && (
        <div className="cancel-confirm">
          <AlertCircle size={16} />
          Точно отменить? Доступ сохранится до конца оплаченного периода.
          <div className="cancel-confirm-btns">
            <button className="confirm-yes" onClick={handleCancel}>Да, отменить</button>
            <button className="confirm-no" onClick={() => setCancelConfirm(false)}>Нет</button>
          </div>
        </div>
      )}

      {/* Admin gets full access — no need to show plans */}
      {!isAdmin && (
        <div className="plans-grid">
          {plans.map(plan => {
            const Icon = PLAN_ICONS[plan.id] || Star;
            const color = PLAN_COLORS[plan.id] || '#adb5bd';
            const isCurrent = currentPlanId === plan.id;
            const isBuying = purchasing === plan.id;
            const modes = plan.available_modes || [];
            const langs = plan.available_languages || [];

            return (
              <div key={plan.id} className={`plan-card ${isCurrent ? 'current' : ''} ${plan.id === 'pro' ? 'featured' : ''}`}>
                {plan.id === 'pro' && <div className="featured-badge">POPULAR</div>}

                <div className="plan-icon-wrap" style={{ background: `${color}22` }}>
                  <Icon size={28} color={color} fill={plan.id !== 'free' ? color : 'none'} />
                </div>

                <h2 className="plan-name">{plan.name}</h2>
                <div className="plan-price">
                  {plan.price_monthly === 0
                    ? <span className="free-tag">Бесплатно</span>
                    : <><span className="price-amount">${plan.price_monthly}</span><span className="price-period">/мес</span></>
                  }
                </div>

                <ul className="plan-features">
                  <li><Check size={14} color="#51cf66" /> {plan.requests_per_day || '∞'} вопросов/день</li>
                  {langs.length > 0 && (
                    <li><Check size={14} color="#51cf66" /> {langs.join(', ')}</li>
                  )}
                  {plan.ai_generations_per_month > 0 && (
                    <li><Check size={14} color="#51cf66" /> {plan.ai_generations_per_month} AI генераций/мес</li>
                  )}
                  {plan.resume_analysis_limit > 0 && (
                    <li><Check size={14} color="#51cf66" /> {plan.resume_analysis_limit} анализов резюме</li>
                  )}
                  {plan.interview_eval_limit > 0 && (
                    <li><Check size={14} color="#51cf66" /> {plan.interview_eval_limit} мок-интервью</li>
                  )}
                  {modes.length > 0 && (
                    <li><Check size={14} color="#51cf66" /> {modes.length} режимов обучения</li>
                  )}
                </ul>

                <button
                  className={`subscribe-btn ${isCurrent ? 'current' : plan.id === 'pro' ? 'pro' : ''}`}
                  disabled={isCurrent || isBuying}
                  onClick={() => !isCurrent && handleSubscribe(plan.id)}
                >
                  {isCurrent ? '✓ Текущий план' : isBuying ? 'Обработка...' : plan.price_monthly === 0 ? 'Выбрать' : 'Купить'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {isAdmin && (
        <div className="admin-unlimited-msg">
          <Shield size={48} color="#748ffc" />
          <h2>Admin — Unlimited Access</h2>
          <p>У вас полный доступ ко всем функциям, без ограничений.</p>
        </div>
      )}

      {/* History */}
      <div className="history-section">
        <button className="history-toggle" onClick={showHistory ? () => setShowHistory(false) : fetchHistory}>
          {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          История платежей
        </button>
        {showHistory && (
          <div className="history-list">
            {history.length === 0
              ? <p className="no-history">История пуста</p>
              : history.map((h, i) => (
                  <div key={i} className="history-item">
                    <span className={`plan-tag ${h.plan_id}`}>{h.plan_name || h.plan_id}</span>
                    <span className="history-status">{h.status}</span>
                    <span className="history-date">{new Date(h.created_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                ))
            }
          </div>
        )}
      </div>

      {/* Admin panel — only visible to admin users */}
      {isAdmin && <AdminPanel />}
    </div>
  );
};

export default SubscriptionPlans;
