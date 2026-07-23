import { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Zap, BookOpen, CheckCircle, Target, AlertTriangle, ChevronRight, Send, Star } from 'lucide-react';
import './SystemDesignMode.css';

const DIFFICULTY_ICONS = { junior: '🌱', middle: '🔥', senior: '💎' };
const DIFFICULTY_COLORS = { junior: '#69db7c', middle: '#ffd43b', senior: '#ff6b6b' };
const diffKey = (d) => (d || 'Middle').toLowerCase();

const TopicCard = ({ topic, onSelect }) => {
  const { t } = useTranslation();
  const progress = topic.progress || {};
  const isDone = progress.status === 'completed';
  const dk = diffKey(topic.difficulty);

  return (
    <button className="sd-topic-card" onClick={() => onSelect(topic.id)} type="button">
      <div className="sd-topic-card-header">
        <span className="sd-topic-difficulty" style={{ background: DIFFICULTY_COLORS[dk] || '#868e96' }}>
          {DIFFICULTY_ICONS[dk] || '📋'} {topic.difficulty || 'Middle'}
        </span>
        {isDone && <span className="sd-topic-badge-done"><CheckCircle size={14} /> {t('sd.done')}</span>}
      </div>
      <h3 className="sd-topic-title">{topic.title}</h3>
      <p className="sd-topic-desc">{topic.description}</p>
      <div className="sd-topic-card-footer">
        {isDone && progress.score != null && (
          <span className="sd-topic-score">Score: {progress.score}/100</span>
        )}
        {!isDone && <span className="sd-topic-start"><ChevronRight size={16} /> {t('sd.start_practice')}</span>}
      </div>
    </button>
  );
};

const TopicDetail = ({ topic, onBack, onEvaluate }) => {
  const { t } = useTranslation();
  const [answer, setAnswer] = useState('');
  const tData = topic.topic;
  const dk = diffKey(tData.difficulty);

  return (
    <div className="sd-detail">
      <button className="sd-back" onClick={onBack} type="button"><ArrowLeft size={20} /> {t('common.back')}</button>
      <div className="sd-detail-header">
        <h2>{tData.title}</h2>
        <span className="sd-detail-badge" style={{ background: DIFFICULTY_COLORS[dk] }}>
          {DIFFICULTY_ICONS[dk]} {tData.difficulty}
        </span>
      </div>
      <p className="sd-detail-desc">{tData.description}</p>

      <div className="sd-detail-section">
        <h4><Target size={16} /> {t('sd.requirements')}</h4>
        <ul>{tData.requirements?.map((r, i) => <li key={i}>{r}</li>)}</ul>
      </div>

      <div className="sd-detail-section">
        <h4><AlertTriangle size={16} /> {t('sd.constraints')}</h4>
        <ul>{tData.constraints?.map((c, i) => <li key={i}>{c}</li>)}</ul>
      </div>

      <div className="sd-detail-section">
        <h4><BookOpen size={16} /> {t('sd.expected_components')}</h4>
        <div className="sd-components-chips">
          {tData.expected_components?.map((c, i) => <span key={i} className="sd-chip">{c}</span>)}
        </div>
      </div>

      <div className="sd-answer-area">
        <h4>{t('sd.your_answer')}</h4>
        <textarea
          className="sd-textarea"
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder={t('sd.answer_placeholder')}
          rows={8}
        />
        <button
          className="sd-submit-btn"
          onClick={() => onEvaluate(tData.id, answer)}
          disabled={answer.trim().length < 10}
          type="button"
        >
          <Send size={16} /> {t('sd.evaluate')}
        </button>
      </div>
    </div>
  );
};

const EvaluationResult = ({ evaluation, onBack, onTryAnother }) => {
  const { t } = useTranslation();
  const score = evaluation?.score || 0;
  const scoreColor = score >= 70 ? '#69db7c' : score >= 40 ? '#ffd43b' : '#ff6b6b';

  return (
    <div className="sd-result">
      <button className="sd-back" onClick={onBack} type="button"><ArrowLeft size={20} /> {t('common.back')}</button>

      <div className="sd-score-ring" style={{ borderColor: scoreColor }}>
        <span className="sd-score-value" style={{ color: scoreColor }}>{score}</span>
        <span className="sd-score-label">/100</span>
      </div>

      <div className="sd-result-section">
        <h4><CheckCircle size={16} color="#69db7c" /> {t('sd.strengths')}</h4>
        {evaluation.strengths?.length > 0 ? (
          <ul className="sd-strengths">{evaluation.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
        ) : <p className="sd-empty">{t('sd.no_feedback')}</p>}
      </div>

      <div className="sd-result-section">
        <h4><Target size={16} color="#ff6b6b" /> {t('sd.weaknesses')}</h4>
        {evaluation.weaknesses?.length > 0 ? (
          <ul className="sd-weaknesses">{evaluation.weaknesses.map((w, i) => <li key={i}>{w}</li>)}</ul>
        ) : <p className="sd-empty">{t('sd.no_feedback')}</p>}
      </div>

      {evaluation.missingComponents?.length > 0 && (
        <div className="sd-result-section">
          <h4><AlertTriangle size={16} color="#ffd43b" /> {t('sd.missing_components')}</h4>
          <div className="sd-components-chips missing">
            {evaluation.missingComponents.map((c, i) => <span key={i} className="sd-chip muted">{c}</span>)}
          </div>
        </div>
      )}

      {evaluation.suggestedArchitecture && (
        <div className="sd-result-section">
          <h4><Zap size={16} /> {t('sd.suggested_architecture')}</h4>
          <p className="sd-architecture">{evaluation.suggestedArchitecture}</p>
        </div>
      )}

      {evaluation.followUpQuestion && (
        <div className="sd-result-section follow-up">
          <h4><Star size={16} /> {t('sd.follow_up')}</h4>
          <p className="sd-followup">{evaluation.followUpQuestion}</p>
        </div>
      )}

      <button className="sd-try-another" onClick={onTryAnother} type="button">
        {t('sd.try_another')}
      </button>
    </div>
  );
};

const LimitBanner = () => {
  const { t } = useTranslation();
  const { sdLimitReached, closePaywall } = useStore();
  if (!sdLimitReached) return null;
  return (
    <div className="sd-limit-banner">
      <AlertTriangle size={16} />
      <span>{t('sd.limit_reached', { used: sdLimitReached.used, limit: sdLimitReached.limit })}</span>
    </div>
  );
};

const SystemDesignMode = () => {
  const { t } = useTranslation();
  const {
    sdTopics, sdCurrentTopic, sdEvaluation, sdIsEvaluating, sdScreen, sdError,
    loadSDTopics, loadSDTopicDetail, submitSDEvaluation, setSDScreen, sdLimitReached,
  } = useStore();
  const [difficultyFilter, setDifficultyFilter] = useState('');

  useEffect(() => { loadSDTopics(); }, []);

  const handleFilterChange = (diff) => {
    setDifficultyFilter(diff);
    loadSDTopics(diff || undefined);
  };

  const handleTopicSelect = (topicId) => loadSDTopicDetail(topicId);

  const handleEvaluate = async (topicId, answer) => {
    try {
      await submitSDEvaluation(topicId, answer);
    } catch { }
  };

  const handleBack = () => {
    if (sdScreen === 'result') setSDScreen('detail');
    else setSDScreen('list');
  };

  return (
    <div className="system-design-mode">
      <LimitBanner />
      {sdScreen === 'list' && (
        <div className="sd-list">
          <div className="sd-list-header">
            <h2>{t('sd.title')}</h2>
            <p className="sd-subtitle">{t('sd.subtitle')}</p>
          </div>

          <div className="sd-filter-bar">
            {['', 'Junior', 'Middle', 'Senior'].map(d => (
              <button
                key={d}
                className={`sd-filter-btn ${difficultyFilter === d ? 'active' : ''}`}
                onClick={() => handleFilterChange(d)}
                type="button"
              >
                {d ? (DIFFICULTY_ICONS[d.toLowerCase()] + ' ' + t(`difficulty.${d}`)) : t('common.all')}
              </button>
            ))}
          </div>

          {sdError && <p className="sd-error">{sdError}</p>}

          {sdTopics.length === 0 && !sdError && (
            <div className="sd-empty-state">
              <BookOpen size={48} />
              <p>{t('sd.no_topics')}</p>
            </div>
          )}

          <div className="sd-topics-grid">
            {sdTopics.map(topic => <TopicCard key={topic.id} topic={topic} onSelect={handleTopicSelect} />)}
          </div>
        </div>
      )}

      {sdScreen === 'detail' && sdCurrentTopic && (
        <TopicDetail
          topic={sdCurrentTopic}
          onBack={handleBack}
          onEvaluate={handleEvaluate}
        />
      )}

      {sdIsEvaluating && (
        <div className="sd-evaluating">
          <div className="sd-spinner" />
          <p>{t('sd.evaluating')}</p>
        </div>
      )}

      {sdScreen === 'result' && sdEvaluation && (
        <EvaluationResult
          evaluation={sdEvaluation}
          onBack={handleBack}
          onTryAnother={() => setSDScreen('list')}
        />
      )}
    </div>
  );
};

export default SystemDesignMode;