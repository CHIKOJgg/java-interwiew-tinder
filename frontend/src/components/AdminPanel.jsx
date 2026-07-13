import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useTranslation } from 'react-i18next';
import './AdminPanel.css';
import { 
  Users, 
  Zap, 
  CreditCard, 
  BarChart3, 
  TrendingUp, 
  AlertCircle,
  Loader2,
  ChevronRight
} from 'lucide-react';

const AdminPanel = ({ onBack }) => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState(null);
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      const [metricsData, reportsData] = await Promise.all([
        apiClient.getAdminMetrics(),
        apiClient.getAdminReports().catch(() => ({ reports: [] }))
      ]);
      setMetrics(metricsData);
      setReports(reportsData.reports || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-loading">
        <Loader2 className="spinner" />
        <p>{t('admin.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error">
        <AlertCircle size={48} />
        <p>{error}</p>
        <button onClick={fetchMetrics}>{t('admin.retry')}</button>
      </div>
    );
  }

  const { overview, activity, topFailedQuestions, jobs } = metrics;

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <button className="back-button" onClick={onBack}>← {t('admin.back')}</button>
        <h1>{t('admin.title')}</h1>
      </div>

      <div className="metrics-grid">
        <div className="metric-card highlight">
          <div className="metric-icon"><TrendingUp size={20} /></div>
          <div className="metric-info">
            <span className="metric-label">{t('admin.revenue')}</span>
            <span className="metric-value">${overview.monthlyRevenue}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon"><Users size={20} /></div>
          <div className="metric-info">
            <span className="metric-label">{t('admin.active_subs')}</span>
            <span className="metric-value">{overview.activeSubscribers}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon"><Zap size={20} /></div>
          <div className="metric-info">
            <span className="metric-label">{t('admin.ai_usage')}</span>
            <span className="metric-value">{activity.aiCallsThisMonth}</span>
          </div>
        </div>
      </div>

      <section className="admin-section">
        <h3>{t('admin.user_activity')}</h3>
        <div className="activity-stats">
          <div className="stat-item">
            <span className="stat-value">{activity.dau}</span>
            <span className="stat-label">{t('admin.dau')}</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{activity.wau}</span>
            <span className="stat-label">{t('admin.wau')}</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{activity.mau}</span>
            <span className="stat-label">{t('admin.mau')}</span>
          </div>
        </div>
      </section>

      <section className="admin-section moderation-section">
        <h3>{t('admin.reports')} ({reports?.length || 0})</h3>
        <div className="reports-list">
          {!reports || reports.length === 0 ? (
            <p className="no-reports">{t('admin.no_reports')}</p>
          ) : (
            reports.map((q) => (
              <div key={q.id} className="report-item">
                <div className="report-header-info">
                  <span className="report-q-id">#{q.id}</span>
                  <span className="report-count-badge">{q.report_count} {t('admin.flags')}</span>
                  {q.is_active === false && <span className="report-hidden-badge">{t('admin.hidden')}</span>}
                </div>
                
                {editingQuestion === q.id ? (
                  <div className="report-edit-form">
                    <textarea id={`edit-q-${q.id}`} defaultValue={q.question_text} rows={3} />
                    <textarea id={`edit-a-${q.id}`} defaultValue={q.short_answer} rows={3} />
                    <div className="report-actions">
                      <button onClick={async () => {
                        const newQ = document.getElementById(`edit-q-${q.id}`).value;
                        const newA = document.getElementById(`edit-a-${q.id}`).value;
                        await apiClient.updateQuestion(q.id, newQ, newA);
                        setEditingQuestion(null);
                        fetchMetrics();
                      }}>{t('admin.save_approve')}</button>
                      <button onClick={() => setEditingQuestion(null)} className="btn-secondary">{t('admin.cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="report-q-text">{q.question_text}</p>
                    <div className="report-reasons">
                      {q.reports.slice(0, 3).map((r, i) => (
                        <div key={i} className="report-reason-item">
                          <strong>{r.reason}</strong> {r.comment && `- ${r.comment}`}
                        </div>
                      ))}
                      {q.reports.length > 3 && <div className="report-reason-item">...and {q.reports.length - 3} {t('admin.more')}</div>}
                    </div>
                    <div className="report-actions">
                      <button onClick={async () => { await apiClient.approveReport(q.id); fetchMetrics(); }} className="btn-success">{t('admin.approve')}</button>
                      <button onClick={() => setEditingQuestion(q.id)} className="btn-secondary">{t('admin.edit')}</button>
                      <button onClick={async () => { await apiClient.deleteQuestion(q.id); fetchMetrics(); }} className="btn-danger">{t('admin.hide')}</button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="admin-section">
        <h3>{t('admin.top_failed')}</h3>
        <div className="questions-list">
          {topFailedQuestions.map((q, i) => (
            <div key={i} className="question-item">
              <span className="q-rank">#{i+1}</span>
              <p className="q-text">{q.question_text}</p>
              <span className="q-count">{q.fail_count} {t('admin.fails')}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-section">
        <h3>{t('admin.job_queue')}</h3>
        <div className="jobs-status">
          <div className={`job-pill ${jobs.pending ? 'active' : ''}`}>
            {t('admin.pending')}: {jobs.pending || 0}
          </div>
          <div className="job-pill">
            {t('admin.completed')}: {jobs.completed || 0}
          </div>
          <div className={`job-pill ${jobs.failed ? 'error' : ''}`}>
            {t('admin.failed')}: {jobs.failed || 0}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminPanel;
