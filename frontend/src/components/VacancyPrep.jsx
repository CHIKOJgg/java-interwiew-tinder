import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import { FileText, Target, Sparkles, Loader2, ArrowLeft, Bookmark, BookmarkCheck, Share2, Check, AlertCircle } from 'lucide-react';
import './VacancyPrep.css';

export default function VacancyPrep({ onBack }) {
  const { t } = useTranslation();
  const { prepareVacancy, setLearningMode } = useStore();

  const [vacancyText, setVacancyText] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savedQuestions, setSavedQuestions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jit_vacancy_saved') || '{}'); } catch { return {}; }
  });
  const [shareState, setShareState] = useState(null);

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
    setLearningMode('swipe');
    setShareState(t('vacancy.topic_selected', `Тема «${topic}» выбрана для дальнейшей практики`));
  };

  const toggleSave = (index, question) => {
    const key = `${index}:${question}`;
    setSavedQuestions(current => {
      const next = { ...current, [key]: !current[key] };
      try { localStorage.setItem('jit_vacancy_saved', JSON.stringify(next)); } catch { /* local cache is optional */ }
      return next;
    });
  };

  const handleShare = async () => {
    const text = [
      t('vacancy.title', 'Vacancy Prep'),
      ...(result?.questions || []).map((question, index) => `${index + 1}. ${typeof question === 'string' ? question : question.question}`),
    ].join('\n');
    try {
      if (navigator.share) await navigator.share({ title: t('vacancy.title', 'Vacancy Prep'), text });
      else await navigator.clipboard.writeText(text);
      setShareState(t('vacancy.shared', 'Результат скопирован'));
    } catch (err) {
      if (err?.name !== 'AbortError') setShareState(t('vacancy.share_error', 'Не удалось поделиться результатом'));
    }
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
                <AlertCircle size={16} /> {error}
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
                  {result.questions.map((q, i) => {
                    const questionText = typeof q === 'string' ? q : q.question;
                    const key = `${i}:${questionText}`;
                    const isSaved = !!savedQuestions[key];
                    return (
                    <div key={i} className="question-item">
                      <span className="question-num">{i + 1}.</span>
                      <span className="question-text">{questionText}</span>
                      <button className={`question-save ${isSaved ? 'saved' : ''}`} title={t('vacancy.save', 'Save question')} onClick={() => toggleSave(i, questionText)} type="button">
                        {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                      </button>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="vacancy-actions">
              <button className="analyze-btn" onClick={() => { setVacancyText(''); setResult(null); }}>
                <ArrowLeft size={20} />
                <span>{t('vacancy.new_vacancy', 'Analyze Another Vacancy')}</span>
              </button>
              <button className="analyze-btn analyze-btn--secondary" onClick={handleShare} type="button">
                <Share2 size={20} />
                <span>{t('vacancy.share', 'Share Results')}</span>
              </button>
            </div>
            {shareState && <div className="share-status"><Check size={15} /> {shareState}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
