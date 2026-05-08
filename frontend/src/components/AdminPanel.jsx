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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getAdminMetrics();
      setMetrics(data);
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
