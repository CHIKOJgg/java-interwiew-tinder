import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import apiClient from '../api/client';
import { TrendingUp, Users, Briefcase, Clock, ArrowLeft, RefreshCw, DollarSign } from 'lucide-react';
import './MarketTrends.css';

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
      setError(err?.message || t('trends.error_generic', 'Failed to load market trends'));
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
          <div className="analyze-error">⚠️ {error}</div>
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
                    <span key={i} className="skill-tag">{skill}</span>
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
                    <span key={i} className="company-tag">{company}</span>
                  ))}
                </div>
              </div>
            )}

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