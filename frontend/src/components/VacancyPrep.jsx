import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import { FileText, Search, Target, Sparkles, Loader2, ArrowLeft, ArrowRight, Bookmark, Share2 } from 'lucide-react';
import './VacancyPrep.css';

export default function VacancyPrep({ onBack }) {
  const { t } = useTranslation();
  const { prepareVacancy, isAnalyzingResume } = useStore();

  const [vacancyText, setVacancyText] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!vacancyText.trim() || loading) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const data = await prepareVacancy(vacancyText);
      setResult(data);
    } catch (err) {
      setError(err?.message || t('vacancy.error_generic', 'Failed to analyze vacancy'));
    } finally {
      setLoading(false);
    }
  };

  const handleTopicClick = (topic) => {
    useStore.getState().setLearningMode('swipe');
  };

  return (
    <div className="vacancy-prep">
      <div className="vacancy-container">
        <div className="vacancy-header">
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={18} /> {t('vacancy.back', '← Back')}
          </button>
          <h2>{t('vacancy.title', 'Vacancy Prep')}</h2>
          <p className="subtitle">{t('vacancy.subtitle', 'Paste a job description and get AI-prepared interview questions')}</p>
        </div>

        {!result ? (
          <div className="vacancy-input-section">
            <div className="input-group">
              <label htmlFor="vacancy-input">{t('vacancy.label', 'Job description / vacancy text')}</label>
              <textarea
                id="vacancy-input"
                placeholder={t('vacancy.placeholder', 'Paste the full job posting here...')}
                value={vacancyText}
                onChange={(e) => setVacancyText(e.target.value)}
                rows={12}
              />
            </div>

            <button
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={!vacancyText.trim() || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="spinner" size={20} />
                  <span>{t('vacancy.preparing', 'Preparing...')}</span>
                </>
              ) : (
                <>
                  <Target size={20} />
                  <span>{t('vacancy.prepare', 'Prepare for this vacancy')}</span>
                </>
              )}
            </button>

            {error && (
              <div className="analyze-error">
                ⚠️ {error}
              </div>
            )}
          </div>
        ) : (
          <div className="vacancy-results-section">
            {result.suggestedTopTopics && result.suggestedTopTopics.length > 0 && (
              <div className="topics-section">
                <h3 className="section-title">
                  <Sparkles size={18} />
                  {t('vacancy.top_topics', 'Topics to focus on')}
                </h3>
                <div className="topics-list">
                  {result.suggestedTopTopics.map((topic, i) => (
                    <span key={i} className="topic-tag" onClick={() => handleTopicClick(topic)}>
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.questions && result.questions.length > 0 && (
              <div className="questions-section">
                <h3 className="section-title">
                  <FileText size={18} />
                  {t('vacancy.questions', 'Interview Questions')}
                  <span className="question-count">{result.questions.length}</span>
                </h3>
                <div className="questions-list">
                  {result.questions.map((q, i) => (
                    <div key={i} className="question-item">
                      <span className="question-num">{i + 1}.</span>
                      <span className="question-text">{q}</span>
                      <button className="question-save" title={t('vacancy.save', 'Save question')}>
                        <Bookmark size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="vacancy-actions">
              <button className="analyze-btn" onClick={() => { setVacancyText(''); setResult(null); }}>
                <ArrowLeft size={20} />
                <span>{t('vacancy.new_vacancy', 'Analyze Another Vacancy')}</span>
              </button>
              <button className="analyze-btn analyze-btn--secondary" onClick={() => { setVacancyText(''); setResult(null); }}>
                <Share2 size={20} />
                <span>{t('vacancy.share', 'Share Results')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}