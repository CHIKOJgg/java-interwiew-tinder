import React, { useState, useEffect, useCallback } from 'react';
import useStore from '../store/useStore';
import apiClient from '../api/client';
import { useTranslation } from 'react-i18next';
import { Check, Star, Shield, Zap, ArrowLeft, X, Clock, ChevronDown, ChevronUp, Users, AlertCircle, Copy, CheckCircle } from 'lucide-react';
import './SubscriptionPlans.css';

// ─── Plan config ──────────────────────────────────────────────────────
const PLAN_ICONS = { free: Zap, pro: Star, admin: Shield };
const PLAN_COLORS = { free: '#adb5bd', pro: '#ffd43b', admin: '#748ffc' };

// ─── Admin Panel ──────────────────────────────────────────────────────
const AdminPanel = () => {
  const { t } = useTranslation();
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
        {t('header.admin')} Panel
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

          <h3><Users size={14} /> {t('subscription.users', 'Users')} ({users.length})</h3>
          {loading ? <p>{t('common.loading')}</p> : (
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
  const { t } = useTranslation();
  if (!status || status.plan === 'free') return null;

  const isAdmin = status.plan === 'admin' || status.is_admin;
  const expires = status.expires_at ? new Date(status.expires_at).toLocaleDateString('ru-RU') : null;
  const isCancelled = status.is_cancelled;

  return (
    <div className={`status-banner ${isAdmin ? 'admin' : 'pro'} ${isCancelled ? 'cancelled' : ''}`}>
      <div className="status-info">
        {isAdmin ? <Shield size={18} /> : <Star size={18} />}
        <div>
          <strong>{isAdmin ? `👑 ${t('subscription.admin')} — Unlimited` : `⭐ ${t('subscription.pro')} ${t('subscription.active')}`}</strong>
          {expires && !isAdmin && (
            <span className="expires-at">
              <Clock size={12} /> {isCancelled ? t('subscription.expires') : t('subscription.renewable')} {expires}
            </span>
          )}
          {isCancelled && <span className="cancelled-tag">{t('subscription.cancelled')}</span>}
        </div>
      </div>
      {!isAdmin && !isCancelled && (
        <button className="cancel-btn" onClick={onCancel}>
          <X size={14} /> {t('common.cancel')}
        </button>
      )}
    </div>
  );
};


// ─── TON Payment Modal ────────────────────────────────────────────────
const TonModal = ({ invoice, onCheck, onCancel, polling }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(null);

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!invoice) return null;

  return (
    <div className="ton-modal-overlay">
      <div className="ton-modal">
        <button className="ton-modal-close" onClick={onCancel}><X size={20} /></button>
        <div className="ton-modal-header">
          <div className="ton-icon-large">💎</div>
          <h2>{t('subscription.ton_title', 'Payment via TON')}</h2>
          <p>{t('subscription.ton_desc', 'Send exact amount to address below')}</p>
        </div>

        <div className="ton-modal-body">
          <div className="ton-field">
            <label>Сумма</label>
            <div className="ton-value-row">
              <span className="ton-amount-val">{invoice.amountTon} TON</span>
              <button onClick={() => handleCopy(invoice.amountTon.toString(), 'amount')}>
                {copied === 'amount' ? <CheckCircle size={16} color="#51cf66" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div className="ton-field">
            <label>Адрес кошелька</label>
            <div className="ton-value-row address">
              <span className="ton-address-val">{invoice.address}</span>
              <button onClick={() => handleCopy(invoice.address, 'address')}>
                {copied === 'address' ? <CheckCircle size={16} color="#51cf66" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div className="ton-field">
            <label>Комментарий (ОБЯЗАТЕЛЬНО)</label>
            <div className="ton-value-row comment">
              <span className="ton-comment-val">{invoice.comment}</span>
              <button onClick={() => handleCopy(invoice.comment, 'comment')}>
                {copied === 'comment' ? <CheckCircle size={16} color="#51cf66" /> : <Copy size={16} />}
              </button>
            </div>
            <p className="ton-warning">Без комментария платеж не будет зачислен автоматически!</p>
          </div>
        </div>

        <div className="ton-modal-footer">
          <button className="ton-check-btn" disabled={polling} onClick={onCheck}>
            {polling ? t('common.loading') : t('subscription.ton_check', 'I paid, check now')}
          </button>
          <p className="ton-poll-hint">{t('subscription.ton_poll_hint', 'We check every 30 seconds')}</p>
        </div>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────
const SubscriptionPlans = ({ onBack }) => {
  const { t } = useTranslation();
  const { user, login } = useStore();
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null); // planId being purchased
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [toast, setToast] = useState(null);           // { text, type }
  const [polling, setPolling] = useState(false);      // polling after invoice send
  const [tonInvoice, setTonInvoice] = useState(null); // Active TON invoice
  const [tonPolling, setTonPolling] = useState(false);

  const isAdmin = user?.plan === 'admin' || user?.is_admin;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansRes, statusRes] = await Promise.all([
        apiClient.getPlans(),
        apiClient.getBillingInfo(),
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

  useEffect(() => {
    fetchAll();
    // Check for ?success=true (Stripe redirect — kept for compatibility)
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setShowSuccess(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [fetchAll]);

  // Toast helper
  const showToast = (text, type = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Poll /api/billing/info every 3 s for up to 60 s after Stars invoice is sent.
  // When plan changes from 'free', show success screen.
  useEffect(() => {
    if (!polling) return;
    let checks = 0;
    const MAX_CHECKS = 20; // 60 s total
    const interval = setInterval(async () => {
      checks++;
      try {
        const info = await apiClient.getBillingInfo();
        if (info.plan && info.plan !== 'free') {
          clearInterval(interval);
          setPolling(false);
          setStatus(info);
          setShowSuccess(true);
          if (window.Telegram?.WebApp?.initData) {
            login(window.Telegram.WebApp.initData).catch(() => { });
          }
        }
      } catch { }
      if (checks >= MAX_CHECKS) {
        clearInterval(interval);
        setPolling(false);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [polling, login]);

  // Stars: primary payment — sends invoice to Telegram chat, then polls
  const handleSubscribeStars = async (planId, interval = 'monthly') => {
    if (purchasing || polling) return;
    try {
      setPurchasing(planId);
      await apiClient.sendStarsInvoice(planId, interval);
      setPurchasing(null);
      setPolling(true);
      showToast('Проверьте чат Telegram — счёт отправлен. Оплатите там, и план активируется автоматически.', 'info');
    }
    catch (e) {
      setPurchasing(null);
      showToast(`Ошибка Stars: ${e.message}`, 'error');
    }
  };

  // TON: creates invoice and shows modal
  const handleSubscribeTon = async (planId, interval = 'monthly') => {
    if (purchasing || polling || tonPolling) return;
    try {
      setPurchasing(planId);
      const invoice = await apiClient.createTonInvoice(planId, interval);
      setTonInvoice(invoice);
      setPurchasing(null);
    } catch (e) {
      setPurchasing(null);
      showToast(`Ошибка TON: ${e.message}`, 'error');
    }
  };

  const handleCheckTon = async () => {
    if (tonPolling) return;
    setTonPolling(true);
    try {
      const res = await apiClient.checkTonPayment();
      if (res.fulfilled) {
        setTonInvoice(null);
        setShowSuccess(true);
        await fetchAll();
        if (window.Telegram?.WebApp?.initData) {
          login(window.Telegram.WebApp.initData).catch(() => { });
        }
      } else {
        showToast('Платеж пока не найден. Подождите 30-60 секунд после отправки.', 'info');
      }
    } catch (e) {
      showToast(`Ошибка проверки: ${e.message}`, 'error');
    } finally {
      setTonPolling(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelConfirm) { setCancelConfirm(true); return; }
    try {
      await apiClient.deleteSubscription();
      setCancelConfirm(false);
      await fetchAll();
      if (window.Telegram?.WebApp?.initData) {
        await login(window.Telegram.WebApp.initData).catch(() => { });
      }
    } catch (e) {
      alert(`Ошибка отмены: ${e.message}`);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await apiClient.getBillingHistory();
      setHistory(res.history || []);
      setShowHistory(true);
    } catch { }
  };

  if (loading) {
    return (
      <div className="subscription-container">
        <div className="sub-header">
          <button className="back-btn" onClick={onBack}><ArrowLeft size={22} /></button>
          <h1>{t('header.subscription')}</h1>
        </div>
        <div className="sub-loading">{t('common.loading')}</div>
      </div>
    );
  }

  const currentPlanId = status?.plan_id || status?.plan || 'free';

  return (
    <div className="subscription-container">
      <div className="sub-header">
        <button className="back-btn" onClick={onBack}><ArrowLeft size={22} /></button>
        <h1>{t('header.subscription')}</h1>
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

      <TonModal
        invoice={tonInvoice}
        polling={tonPolling}
        onCheck={handleCheckTon}
        onCancel={() => setTonInvoice(null)}
      />

      {showSuccess && (
        <div className="success-celebration">
          <div className="confetti-wrap">✨ 🎊 💎 🎊 ✨</div>
          <h2>{t('subscription.success_title', 'Welcome to Pro!')}</h2>
          <p>{t('subscription.success_desc', 'Your subscription is active. All features unlocked.')}</p>
          <button onClick={() => setShowSuccess(false)}>{t('common.done')}</button>
        </div>
      )}
      {/* Toast notification */}
      {toast && (
        <div className={`billing-toast ${toast.type}`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <Star size={16} fill="#ffd43b" />}
          {toast.text}
        </div>
      )}

      {/* Polling indicator */}
      {polling && (
        <div className="polling-indicator">
          <span className="pulse-dot" />
          Ожидание подтверждения оплаты из Telegram...
        </div>
      )}

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

                <h2 className="plan-name">{t(`subscription.${plan.id}`)}</h2>
                <div className="plan-price">
                  {plan.price_monthly === 0
                    ? <span className="free-tag">{t('subscription.free')}</span>
                    : <><span className="price-amount">${plan.price_monthly}</span><span className="price-period">/{t('subscription.monthly_short', 'mo')}</span></>
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

                {/* ── Pro plan: active subscription info or purchase buttons ── */}
                {isCurrent && plan.id === 'pro' && status?.expires_at && (
                  <p className="renewal-info">
                    <Clock size={12} />
                    {status.is_cancelled
                      ? `Доступ до ${new Date(status.expires_at).toLocaleDateString('ru-RU')}`
                      : `Продление ${new Date(status.expires_at).toLocaleDateString('ru-RU')}`
                    }
                  </p>
                )}

                <div className="plan-actions">
                  {isCurrent ? (
                    <button className="subscribe-btn current" disabled>✓ {t('subscription.current')}</button>
                  ) : plan.id === 'free' ? (
                    <button className="subscribe-btn" disabled={isBuying}
                      onClick={() => handleSubscribeStars(plan.id)}>
                      {t('subscription.select_free', 'Select Free')}
                    </button>
                  ) : (
                    <>
                      {/* Primary CTA: Stars */}
                      <button
                        id={`stars-btn-${plan.id}`}
                        className="stars-btn primary"
                        disabled={isBuying || polling}
                        onClick={() => handleSubscribeStars(plan.id, 'monthly')}
                      >
                        <Star size={16} fill="#ffd43b" />
                        {isBuying ? t('common.saving') : polling ? t('subscription.processing') : `450 Stars / ${t('subscription.monthly')}`}
                      </button>
                      <button
                        className="stars-btn yearly"
                        disabled={isBuying || polling}
                        onClick={() => handleSubscribeStars(plan.id, 'yearly')}
                      >
                        <Star size={14} fill="#ffd43b" /> 3000 Stars / {t('subscription.yearly')} ({t('subscription.discount', 'discount')} 44%)
                      </button>

                      {/* TON Payment Option */}
                      <button
                        className="ton-btn-mini"
                        disabled={isBuying || polling || tonPolling}
                        onClick={() => handleSubscribeTon(plan.id, 'monthly')}
                      >
                        💎 {t('subscription.pay_ton', 'Pay via TON')}
                      </button>
                    </>
                  )}
                </div>
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
          {t('subscription.history', 'Payment History')}
        </button>
        {showHistory && (
          <div className="history-list">
            {history.length === 0
              ? <p className="no-history">История пуста</p>
              : history.map((h, i) => (
                <div key={i} className="history-item">
                  <div className="history-main">
                    <span className={`plan-tag ${h.plan_id}`}>{h.plan_name || h.plan_id}</span>
                    <span className="history-provider">{h.payment_provider === 'stripe' ? '💳 Card' : '⭐ Stars'}</span>
                  </div>
                  <div className="history-meta">
                    <span className="history-status">{h.status}</span>
                    <span className="history-date">{new Date(h.created_at).toLocaleDateString('ru-RU')}</span>
                  </div>
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
