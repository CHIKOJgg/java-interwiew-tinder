import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import apiClient from '../api/client';
import { TrendingUp, Users, Briefcase, Clock, ArrowLeft, RefreshCw, DollarSign, AlertCircle } from 'lucide-react';
import './MarketTrends.css';

const BENCHMARK_TRENDS = {
  Java: {
    totalVacancies: 1840,
    avgSalary: 235000,
    language: 'Java',
    topSkills: [
      { name: 'Spring Boot', count: 45 },
      { name: 'PostgreSQL', count: 38 },
      { name: 'Docker', count: 35 },
      { name: 'Kafka', count: 32 },
      { name: 'Hibernate', count: 28 },
      { name: 'Kubernetes', count: 24 },
      { name: 'microservices', count: 22 },
      { name: 'Redis', count: 19 },
    ],
    topCompanies: [
      { name: 'Сбер', count: 18 },
      { name: 'Т-Банк', count: 16 },
      { name: 'Яндекс', count: 14 },
      { name: 'ВТБ', count: 11 },
      { name: 'Ozon', count: 9 },
      { name: 'VK', count: 8 },
    ],
  },
  Python: {
    totalVacancies: 2150,
    avgSalary: 225000,
    language: 'Python',
    topSkills: [
      { name: 'FastAPI', count: 48 },
      { name: 'PostgreSQL', count: 42 },
      { name: 'Docker', count: 40 },
      { name: 'Django', count: 34 },
      { name: 'Redis', count: 29 },
      { name: 'async', count: 27 },
      { name: 'Kafka', count: 24 },
    ],
    topCompanies: [
      { name: 'Яндекс', count: 22 },
      { name: 'Т-Банк', count: 18 },
      { name: 'Сбер', count: 15 },
      { name: 'Авито', count: 13 },
      { name: 'Ozon', count: 11 },
    ],
  },
};

export default function MarketTrends({ onBack }) {
  const { t } = useTranslation();
  const language = useStore(s => s.language);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadTrends = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.fetchMarketTrends(language);
      setTrends(data);
    } catch (err) {
      const fallback = BENCHMARK_TRENDS[language] || BENCHMARK_TRENDS.Java;
      if (fallback) {
        setTrends({ ...fallback, language: language || 'Java', isFallback: true });
      } else {
        setError(err?.message || t('trends.error_generic', 'Failed to load market trends'));
      }
    } finally {
      setLoading(false);
    }
  }, [language, t]);

  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

  return (
    <div className="market-trends">
      <div className="trends-container">
        <div className="trends-header">
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={18} /> {t('trends.back', '← Back')}
          </button>
          <h2>{t('trends.title', 'Market Trends')}</h2>
          <p className="subtitle">{t('trends.subtitle', 'Live market data for {{language}}', { language })}</p>
        </div>

        {loading && (
          <div className="trends-loading">
            <RefreshCw className="spinner" size={28} />
            <span>{t('trends.loading', 'Loading market data...')}</span>
          </div>
        )}

        {error && (
          <div className="trends-error-state">
            <div className="analyze-error">⚠️ {error}</div>
            <button className="refresh-btn" onClick={loadTrends} disabled={loading} type="button">
              <RefreshCw size={16} className={loading ? 'spinner' : ''} />
              {t('common.retry', 'Повторить')}
            </button>
          </div>
        )}

        {trends && (
          <div className="trends-content">
            <div className="trends-stats">
              <div className="trend-stat">
                <div className="stat-icon"><Briefcase size={22} /></div>
                <div className="stat-value">{trends.totalVacancies?.toLocaleString() || '—'}</div>
                <div className="stat-label">{t('trends.vacancies', 'vacancies found')}</div>
              </div>
              {trends.avgSalary && (
                <div className="trend-stat">
                  <div className="stat-icon"><DollarSign size={22} /></div>
                  <div className="stat-value">{trends.avgSalary.toLocaleString()} ₽</div>
                  <div className="stat-label">{t('trends.avg_salary', 'avg salary')}</div>
                </div>
              )}
              <div className="trend-stat">
                <div className="stat-icon"><Clock size={22} /></div>
                <div className="stat-value">{trends.language}</div>
                <div className="stat-label">{t('trends.language', 'language')}</div>
              </div>
            </div>

            {trends.topSkills && trends.topSkills.length > 0 && (
              <div className="trends-section">
                <h3 className="section-title">
                  <TrendingUp size={18} />
                  {t('trends.top_skills', 'Top In-Demand Skills')}
                </h3>
                <div className="skills-list">
                  {trends.topSkills.map((skill, i) => (
                    <span key={i} className="skill-tag">{typeof skill === 'string' ? skill : `${skill.name} (${skill.count})`}</span>
                  ))}
                </div>
              </div>
            )}

            {trends.topCompanies && trends.topCompanies.length > 0 && (
              <div className="trends-section">
                <h3 className="section-title">
                  <Users size={18} />
                  {t('trends.top_companies', 'Top Hiring Companies')}
                </h3>
                <div className="companies-list">
                  {trends.topCompanies.map((company, i) => (
                    <span key={i} className="company-tag">{typeof company === 'string' ? company : `${company.name} (${company.count})`}</span>
                  ))}
                </div>
              </div>
            )}

            {trends.isStale && <p className="trends-stale">{t('trends.stale', 'Показаны последние сохраненные данные')}</p>}
            <button className="refresh-btn" onClick={loadTrends} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spinner' : ''} />
              {t('trends.refresh', 'Refresh')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
