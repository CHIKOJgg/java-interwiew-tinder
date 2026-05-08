import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
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
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error">
        <AlertCircle size={48} />
        <p>{error}</p>
        <button onClick={fetchMetrics}>Retry</button>
      </div>
    );
  }

  const { overview, activity, topFailedQuestions, jobs } = metrics;

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <button className="back-button" onClick={onBack}>← Back</button>
        <h1>System Admin</h1>
      </div>

      <div className="metrics-grid">
        <div className="metric-card highlight">
          <div className="metric-icon"><TrendingUp size={20} /></div>
          <div className="metric-info">
            <span className="metric-label">Monthly Revenue</span>
            <span className="metric-value">${overview.monthlyRevenue}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon"><Users size={20} /></div>
          <div className="metric-info">
            <span className="metric-label">Active Subs</span>
            <span className="metric-value">{overview.activeSubscribers}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon"><Zap size={20} /></div>
          <div className="metric-info">
            <span className="metric-label">AI usage (Month)</span>
            <span className="metric-value">{activity.aiCallsThisMonth}</span>
          </div>
        </div>
      </div>

      <section className="admin-section">
        <h3>User Activity</h3>
        <div className="activity-stats">
          <div className="stat-item">
            <span className="stat-value">{activity.dau}</span>
            <span className="stat-label">DAU (24h)</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{activity.wau}</span>
            <span className="stat-label">WAU (7d)</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{activity.mau}</span>
            <span className="stat-label">MAU (30d)</span>
          </div>
        </div>
      </section>

      <section className="admin-section moderation-section">
        <h3>Reported Questions ({reports?.length || 0})</h3>
        <div className="reports-list">
          {!reports || reports.length === 0 ? (
            <p className="no-reports">No pending reports.</p>
          ) : (
            reports.map((q) => (
              <div key={q.id} className="report-item">
                <div className="report-header-info">
                  <span className="report-q-id">#{q.id}</span>
                  <span className="report-count-badge">{q.report_count} flags</span>
                  {q.is_active === false && <span className="report-hidden-badge">Hidden</span>}
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
                      }}>Save & Approve</button>
                      <button onClick={() => setEditingQuestion(null)} className="btn-secondary">Cancel</button>
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
                      {q.reports.length > 3 && <div className="report-reason-item">...and {q.reports.length - 3} more</div>}
                    </div>
                    <div className="report-actions">
                      <button onClick={async () => { await apiClient.approveReport(q.id); fetchMetrics(); }} className="btn-success">Approve</button>
                      <button onClick={() => setEditingQuestion(q.id)} className="btn-secondary">Edit</button>
                      <button onClick={async () => { await apiClient.deleteQuestion(q.id); fetchMetrics(); }} className="btn-danger">Hide</button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="admin-section">
        <h3>Top Failed Questions</h3>
        <div className="questions-list">
          {topFailedQuestions.map((q, i) => (
            <div key={i} className="question-item">
              <span className="q-rank">#{i+1}</span>
              <p className="q-text">{q.question_text}</p>
              <span className="q-count">{q.fail_count} fails</span>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-section">
        <h3>AI Job Queue</h3>
        <div className="jobs-status">
          <div className={`job-pill ${jobs.pending ? 'active' : ''}`}>
            Pending: {jobs.pending || 0}
          </div>
          <div className="job-pill">
            Completed: {jobs.completed || 0}
          </div>
          <div className={`job-pill ${jobs.failed ? 'error' : ''}`}>
            Failed: {jobs.failed || 0}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminPanel;
