import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import apiClient from '../api/client';
import { Check, Zap, Star, ShieldCheck, ArrowLeft } from 'lucide-react';
import './SubscriptionPlans.css';

const SubscriptionPlans = ({ onBack }) => {
  const { user, login } = useStore();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        // Fixed: was getSubscriptionPlans() which doesn't exist
        const response = await apiClient.getPlans();
        setPlans(response.plans || []);
      } catch (e) {
        console.error(e);
        setError('Не удалось загрузить планы подписки');
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleSubscribe = async (planId) => {
    try {
      setPurchasing(planId);
      // Fixed: was apiClient.subscribe() which didn't exist
      await apiClient.subscribe(planId);
      if (window.Telegram?.WebApp) {
        const initData = window.Telegram.WebApp.initData || '';
        await login(initData);
      }
      alert('Подписка успешно оформлена!');
      onBack();
    } catch (e) {
      alert('Ошибка оформления: ' + e.message);
    } finally {
      setPurchasing(null);
    }
  };

  const getIcon = (planId) => {
    if (planId === 'free') return <Zap size={24} color="#adb5bd" />;
    if (planId === 'pro') return <Star size={24} color="#ffd43b" />;
    return <ShieldCheck size={24} color="#748ffc" />;
  };

  if (loading) return <div className="plans-loading">Загрузка планов...</div>;
  if (error) return (
    <div className="plans-loading">
      <p>{error}</p>
      <button onClick={onBack} style={{ marginTop: 16 }}>← Назад</button>
    </div>
  );

  return (
    <div className="subscription-container">
      <div className="subscription-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={24} />
        </button>
        <h1>Upgrade Your Learning</h1>
        <p>Master Java faster with Pro features</p>
      </div>

      <div className="plans-grid">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`plan-card ${user?.plan === plan.id ? 'current' : ''} ${plan.id === 'pro' ? 'featured' : ''}`}
          >
            {plan.id === 'pro' && <div className="featured-badge">MOST POPULAR</div>}
            <div className="plan-icon">{getIcon(plan.id)}</div>
            <h2 className="plan-name">{plan.name}</h2>
            <div className="plan-price">
              <span className="amount">${plan.price_monthly}</span>
              <span className="period">/month</span>
            </div>

            <ul className="plan-features">
              <li><Check size={16} /> {plan.requests_per_day} swipes per day</li>
              <li><Check size={16} /> {plan.available_languages?.join(' & ')}</li>
              <li><Check size={16} /> {plan.available_modes?.length} learning modes</li>
              {plan.resume_analysis_limit > 0 && (
                <li><Check size={16} /> {plan.resume_analysis_limit} resume analyses</li>
              )}
              {plan.model_priority === 'quality' && (
                <li><Check size={16} /> Premium AI Models</li>
              )}
            </ul>

            <button
              className={`subscribe-button ${user?.plan === plan.id ? 'current' : ''}`}
              disabled={user?.plan === plan.id || purchasing !== null}
              onClick={() => handleSubscribe(plan.id)}
            >
              {user?.plan === plan.id
                ? 'Текущий план'
                : purchasing === plan.id
                  ? 'Обработка...'
                  : 'Выбрать план'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionPlans;
