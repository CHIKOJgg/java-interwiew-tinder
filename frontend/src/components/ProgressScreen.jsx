import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Flame, Target, TrendingUp, RotateCcw, Star, Award, Bookmark, Trophy,
  CheckCircle, XCircle, Search, ChevronDown, ChevronUp, Sparkles,
  BookOpen, Layers, AlertTriangle, Check, X
} from 'lucide-react';
import useStore, { readinessFromStats } from '../store/useStore';
import apiClient from '../api/client';
import './ProgressScreen.css';

const formatAnsweredDate = (isoString, isRu) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffHours < 1) return isRu ? 'только что' : 'just now';
  if (diffHours < 24) return isRu ? `${diffHours} ч. назад` : `${diffHours}h ago`;
  if (diffDays === 1) return isRu ? 'вчера' : 'yesterday';
  if (diffDays < 7) return isRu ? `${diffDays} дн. назад` : `${diffDays}d ago`;
  return date.toLocaleDateString(isRu ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' });
};

const ProgressScreen = ({ onBack, onReview, onUpgrade, onSavedClick }) => {
  const { t, i18n } = useTranslation();
  const isRu = i18n.language === 'ru';
  const { stats: storeStats, language: storeLanguage, canAccessMode, savedIds } = useStore();

  // Stack filter tab: 'Java' | 'Python' | 'all'
  const [selectedLang, setSelectedLang] = useState(storeLanguage || 'Java');
  const [statsData, setStatsData] = useState(storeStats);
  const [percentile, setPercentile] = useState(null);
  const [history, setHistory] = useState([]);
  const [topics, setTopics] = useState([]);
  const [period, setPeriod] = useState('7d');

  // Answered questions history state
  const [answerStatus, setAnswerStatus] = useState('all'); // 'all' | 'known' | 'unknown'
  const [topicFilter, setTopicFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [questionsList, setQuestionsList] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0, hasMore: false });
  const [summary, setSummary] = useState({ totalAnswered: 0, knownCount: 0, unknownCount: 0, accuracy: 0 });
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);
  const [aiExplanations, setAiExplanations] = useState({}); // { [id]: { loading: bool, text: string, error: string } }

  const historySectionRef = useRef(null);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load language-specific stats, percentile, history and topics
  useEffect(() => {
    let cancelled = false;

    apiClient.getStats(selectedLang).then(res => {
      if (!cancelled && res) {
        setStatsData(res);
        apiClient.getPercentile(res.known || 0).then(pRes => {
          if (!cancelled) setPercentile(pRes?.percentile ?? null);
        }).catch(() => { if (!cancelled) setPercentile(null); });
      }
    }).catch(() => {});

    apiClient.getStatsHistory(period, selectedLang).then(r => {
      if (!cancelled) setHistory(r.history || []);
    }).catch(() => { if (!cancelled) setHistory([]); });

    apiClient.getTopicStats(selectedLang).then(r => {
      if (!cancelled) setTopics(r.topics || []);
    }).catch(() => { if (!cancelled) setTopics([]); });

    return () => { cancelled = true; };
  }, [selectedLang, period]);

  // Load answered questions list
  const fetchQuestions = useCallback(async (offset = 0, isAppend = false) => {
    if (isAppend) setLoadingMore(true);
    else setLoadingQuestions(true);

    try {
      const res = await apiClient.getAnsweredQuestions({
        language: selectedLang,
        status: answerStatus,
        category: topicFilter || undefined,
        search: debouncedSearch || undefined,
        limit: 20,
        offset,
      });

      if (isAppend) {
        setQuestionsList(prev => [...prev, ...(res.questions || [])]);
      } else {
        setQuestionsList(res.questions || []);
      }
      setPagination(res.pagination || { total: 0, limit: 20, offset: 0, hasMore: false });
      if (res.summary) setSummary(res.summary);
    } catch {
      if (!isAppend) setQuestionsList([]);
    } finally {
      setLoadingQuestions(false);
      setLoadingMore(false);
    }
  }, [selectedLang, answerStatus, topicFilter, debouncedSearch]);

  useEffect(() => {
    fetchQuestions(0, false);
  }, [fetchQuestions]);

  const handleLoadMore = () => {
    if (pagination.hasMore && !loadingMore) {
      const nextOffset = pagination.offset + pagination.limit;
      fetchQuestions(nextOffset, true);
    }
  };

  const handleTopicClick = (topicName) => {
    if (topicFilter === topicName) {
      setTopicFilter(null);
    } else {
      setTopicFilter(topicName);
      if (historySectionRef.current) {
        historySectionRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const toggleQuestionExpanded = (id) => {
    setExpandedQuestionId(prev => (prev === id ? null : id));
  };

  const requestAiExplanation = async (question) => {
    const qId = question.id;
    if (aiExplanations[qId]?.text) return; // already loaded

    setAiExplanations(prev => ({
      ...prev,
      [qId]: { loading: true, text: null, error: null }
    }));

    try {
      const response = await apiClient.getExplanation(qId);
      let text = response?.explanation;
      if (typeof text === 'object' && text !== null) text = JSON.stringify(text);

      setAiExplanations(prev => ({
        ...prev,
        [qId]: { loading: false, text: text || question.shortAnswer || 'Разбор доступен.', error: null }
      }));
    } catch (err) {
      setAiExplanations(prev => ({
        ...prev,
        [qId]: {
          loading: false,
          text: question.shortAnswer || null,
          error: err?.message || 'Не удалось загрузить разбор от ИИ'
        }
      }));
    }
  };

  const answered = (statsData?.known || 0) + (statsData?.unknown || 0);
  const accuracy = answered > 0
    ? Math.round(((statsData?.known || 0) / answered) * 100)
    : (statsData?.accuracy || 0);
  const coverage = (statsData?.totalQuestions || 0) > 0
    ? Math.round(((statsData?.totalSeen || 0) / statsData.totalQuestions) * 100)
    : 0;
  const { readiness, tier: readinessTier } = readinessFromStats(statsData || storeStats);

  const bars = [
    { label: t('progress.known', 'Known'), value: statsData?.known || 0, color: '#51cf66' },
    { label: t('progress.unknown', 'Weak'), value: statsData?.unknown || 0, color: '#ff6b6b' },
  ];
  const maxVal = Math.max(statsData?.known || 0, statsData?.unknown || 0, 1);

  // Stack comparison data
  const javaStats = statsData?.byLanguage?.Java || { known: 0, unknown: 0, totalSeen: 0, accuracy: 0 };
  const pythonStats = statsData?.byLanguage?.Python || { known: 0, unknown: 0, totalSeen: 0, accuracy: 0 };

  return (
    <div className="progress-screen">
      <div className="progress-header">
        <button className="progress-back" onClick={onBack} type="button">←</button>
        <h2>{t('progress.title', 'Your progress')}</h2>
      </div>

      <div className="progress-scroll">
        {/* Language selector tabs: Java | Python | All */}
        <div className="lang-tabs-container">
          <button
            type="button"
            className={`lang-tab ${selectedLang === 'Java' ? 'active' : ''}`}
            onClick={() => { setSelectedLang('Java'); setTopicFilter(null); }}
          >
            ☕ {t('progress.stack_java', 'Java')}
          </button>
          <button
            type="button"
            className={`lang-tab ${selectedLang === 'Python' ? 'active' : ''}`}
            onClick={() => { setSelectedLang('Python'); setTopicFilter(null); }}
          >
            🐍 {t('progress.stack_python', 'Python')}
          </button>
          <button
            type="button"
            className={`lang-tab ${selectedLang === 'all' ? 'active' : ''}`}
            onClick={() => { setSelectedLang('all'); setTopicFilter(null); }}
          >
            🌐 {t('progress.stack_all', 'All Stacks')}
          </button>
        </div>

        {/* Dual Stack Comparison Card (Java vs Python) */}
        <div className="progress-card stack-comparison-card">
          <div className="comparison-header">
            <Layers size={18} />
            <h4>{t('progress.dual_comparison_title', 'Stack Comparison')}</h4>
          </div>
          <div className="stack-comparison-grid">
            <div
              className={`stack-mini-card ${selectedLang === 'Java' ? 'active-mini-card' : ''}`}
              onClick={() => setSelectedLang('Java')}
            >
              <div className="stack-mini-title">☕ Java</div>
              <div className="stack-mini-stat">
                <span className="stack-mini-acc">{javaStats.accuracy}%</span>
                <span className="stack-mini-sub">{t('progress.accuracy_rate', 'Accuracy')}</span>
              </div>
              <div className="stack-mini-detail">
                <span>{t('progress.total_answered', 'Answered')}: <strong>{javaStats.totalSeen}</strong></span>
                <span>✅ {javaStats.known} · ❌ {javaStats.unknown}</span>
              </div>
            </div>

            <div
              className={`stack-mini-card ${selectedLang === 'Python' ? 'active-mini-card' : ''}`}
              onClick={() => setSelectedLang('Python')}
            >
              <div className="stack-mini-title">🐍 Python</div>
              <div className="stack-mini-stat">
                <span className="stack-mini-acc">{pythonStats.accuracy}%</span>
                <span className="stack-mini-sub">{t('progress.accuracy_rate', 'Accuracy')}</span>
              </div>
              <div className="stack-mini-detail">
                <span>{t('progress.total_answered', 'Answered')}: <strong>{pythonStats.totalSeen}</strong></span>
                <span>✅ {pythonStats.known} · ❌ {pythonStats.unknown}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hero: interview readiness */}
        <div className="readiness-hero">
          <div className="readiness-ring" style={{ '--p': readiness }}>
            <span className="readiness-pct">{readiness}%</span>
          </div>
          <div className="readiness-meta">
            <div className="readiness-title">{t('header.readiness', 'Readiness')} ({selectedLang})</div>
            <div className={`readiness-tier-badge tier-${readinessTier}`}>{t(`progress.readiness_tier_${readinessTier}`)}</div>
            <p className="readiness-sub">
              {t('progress.readiness_sub', 'Mix of your accuracy ({{accuracy}}%) and how much you\'ve learned ({{known}} questions). Keep going — it grows as you practice.',
                { accuracy, known: statsData?.known || 0 })}
            </p>
          </div>
        </div>

        {/* Hero: percentile + accuracy + streak */}
        <div className="progress-hero">
          <div className="hero-stat">
            <TrendingUp size={20} />
            <div className="hero-value">
              {percentile !== null ? `${percentile}%` : '—'}
            </div>
            <div className="hero-label">
              {t('progress.percentile', 'know more than others')}
            </div>
          </div>
          <div className="hero-stat">
            <Target size={20} />
            <div className="hero-value">{accuracy}%</div>
            <div className="hero-label">{t('progress.accuracy', 'accuracy')}</div>
          </div>
          <div className="hero-stat">
            <Flame size={20} />
            <div className="hero-value">{statsData?.streak || 0}</div>
            <div className="hero-label">
              {t('progress.streak', 'day streak')}{statsData?.longestStreak ? ` · ${statsData.longestStreak}` : ''}
            </div>
          </div>
        </div>

        {percentile !== null && percentile >= 70 && (
          <div className="progress-brag">
            <Trophy size={18} /> {t('progress.brag', 'You know more than {{p}}% of learners. Share your result!', { p: percentile })}
          </div>
        )}

        {/* Known / Weak overview bars */}
        <div className="progress-card">
          <h3>{t('progress.overview', 'Overview')} ({selectedLang})</h3>
          {bars.map(b => (
            <div className="bar-row" key={b.label}>
              <span className="bar-label">{b.label}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(b.value / maxVal) * 100}%`, background: b.color }} />
              </div>
              <span className="bar-num">{b.value}</span>
            </div>
          ))}
          <div className="coverage-row">
            <span>{t('progress.coverage', 'Deck coverage')}: <strong>{coverage}%</strong> ({statsData?.totalSeen || 0}/{statsData?.totalQuestions || 0})</span>
          </div>
        </div>

        {/* Progress History Chart */}
        {history.length > 0 && (
          <div className="progress-card">
            <div className="period-tabs">
              <button className={period === '7d' ? 'active' : ''} onClick={() => setPeriod('7d')}>7 {t('progress.days', 'days')}</button>
              <button className={period === '30d' ? 'active' : ''} onClick={() => setPeriod('30d')}>30 {t('progress.days', 'days')}</button>
            </div>
            <div className="history-bars">
              {history.map((h, i) => {
                const maxH = Math.max(...history.map(x => (x.known || 0) + (x.unknown || 0)), 1);
                return (
                  <div key={i} className="history-bar-col">
                    <div className="history-bar-stack">
                      <div className="history-bar" style={{ height: `${((h.known || 0) / maxH) * 100}%`, background: '#51cf66' }} />
                      <div className="history-bar" style={{ height: `${((h.unknown || 0) / maxH) * 100}%`, background: '#ff6b6b' }} />
                    </div>
                    <span className="history-date">{new Date(h.day).toLocaleDateString(isRu ? 'ru-RU' : 'en', { day: 'numeric', month: 'short' })}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Topic Accuracy Breakdown with Strong / Weak Tags */}
        {topics.length > 0 && (
          <div className="progress-card">
            <div className="card-title-row">
              <h3>{t('progress.topic_accuracy', 'Accuracy by Topic')}</h3>
              <span className="topics-hint">{isRu ? 'Нажмите на тему для фильтра' : 'Click topic to filter'}</span>
            </div>
            <div className="topics-list">
              {topics.map(topic => {
                const isSelected = topicFilter === topic.name;
                const isStrong = topic.accuracy >= 75 && topic.answered >= 1;
                const isWeak = topic.accuracy < 50 && topic.answered >= 1;

                return (
                  <div
                    className={`topic-accuracy-row ${isSelected ? 'topic-selected' : ''}`}
                    key={topic.name}
                    onClick={() => handleTopicClick(topic.name)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="topic-meta">
                      <span className="topic-name">{topic.name}</span>
                      {isStrong && (
                        <span className="topic-badge strong">
                          <Check size={11} /> {t('progress.topic_strong_tag', 'Strong topic')}
                        </span>
                      )}
                      {isWeak && (
                        <span className="topic-badge weak">
                          <AlertTriangle size={11} /> {t('progress.topic_weak_tag', 'Needs practice')}
                        </span>
                      )}
                    </div>
                    <div className="topic-bar-track">
                      <div
                        className="topic-bar-fill"
                        style={{
                          width: `${topic.accuracy}%`,
                          background: topic.accuracy >= 75 ? '#51cf66' : topic.accuracy >= 50 ? '#fcc419' : '#ff6b6b'
                        }}
                      />
                    </div>
                    <div className="topic-stats-text">
                      <strong>{topic.accuracy}%</strong>
                      <span className="topic-sub">{topic.known}/{topic.answered}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Answered Questions History (Review Section) ─── */}
        <div className="progress-card answers-history-card" ref={historySectionRef}>
          <div className="card-title-row">
            <div>
              <h3>📜 {t('progress.answers_history', 'Answer History')}</h3>
              <p className="card-subtitle">{t('progress.answers_history_desc', 'Review questions you answered correctly and inspect mistakes.')}</p>
            </div>
          </div>

          {/* Active topic filter pill */}
          {topicFilter && (
            <div className="active-topic-banner">
              <span>{t('progress.filter_by_topic_hint', { topic: topicFilter })}</span>
              <button
                type="button"
                className="clear-topic-btn"
                onClick={() => setTopicFilter(null)}
              >
                <X size={14} /> {t('progress.clear_topic_filter', 'Clear')}
              </button>
            </div>
          )}

          {/* Status filter tabs: All | Known | Mistakes */}
          <div className="history-filter-tabs">
            <button
              type="button"
              className={`history-filter-tab ${answerStatus === 'all' ? 'active' : ''}`}
              onClick={() => setAnswerStatus('all')}
            >
              {t('progress.filter_all', 'All')} ({summary.totalAnswered || 0})
            </button>
            <button
              type="button"
              className={`history-filter-tab known ${answerStatus === 'known' ? 'active' : ''}`}
              onClick={() => setAnswerStatus('known')}
            >
              <CheckCircle size={14} /> {t('progress.filter_known', 'Known')} ({summary.knownCount || 0})
            </button>
            <button
              type="button"
              className={`history-filter-tab unknown ${answerStatus === 'unknown' ? 'active' : ''}`}
              onClick={() => setAnswerStatus('unknown')}
            >
              <XCircle size={14} /> {t('progress.filter_unknown', 'Mistakes')} ({summary.unknownCount || 0})
            </button>
          </div>

          {/* Search box */}
          <div className="history-search-row">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="history-search-input"
              placeholder={t('progress.search_answers_placeholder', 'Search answered questions...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>

          {/* Questions list */}
          {loadingQuestions ? (
            <div className="history-loading">
              <div className="history-skeleton-card" />
              <div className="history-skeleton-card" />
            </div>
          ) : questionsList.length === 0 ? (
            <div className="history-empty">
              <BookOpen size={36} className="empty-icon" />
              <p className="empty-text">{t('progress.no_answers_found', 'No answered questions in this section yet')}</p>
              <p className="empty-sub">{t('progress.no_answers_cta', 'Start practicing to build your answer history!')}</p>
            </div>
          ) : (
            <div className="history-questions-list">
              {questionsList.map(item => {
                const isExpanded = expandedQuestionId === item.id;
                const isCorrect = item.status === 'known';
                const aiData = aiExplanations[item.id];

                return (
                  <div
                    key={item.id}
                    className={`history-question-item ${isCorrect ? 'item-known' : 'item-unknown'} ${isExpanded ? 'expanded' : ''}`}
                  >
                    <div className="history-item-header" onClick={() => toggleQuestionExpanded(item.id)}>
                      <div className="item-badge-row">
                        <span className={`status-pill ${isCorrect ? 'status-known' : 'status-unknown'}`}>
                          {isCorrect ? <Check size={12} /> : <X size={12} />}
                          {isCorrect ? t('progress.status_known', 'Known') : t('progress.status_unknown', 'Mistake')}
                        </span>
                        <span className="lang-pill">{item.language === 'Python' ? '🐍 Python' : '☕ Java'}</span>
                        {item.difficulty && (
                          <span className={`diff-pill diff-${item.difficulty.toLowerCase()}`}>
                            {item.difficulty}
                          </span>
                        )}
                        {item.category && (
                          <span className="category-pill">{item.category}</span>
                        )}
                        <span className="date-pill">{formatAnsweredDate(item.answeredAt, isRu)}</span>
                      </div>

                      <div className="question-text-row">
                        <p className="question-title">{item.question}</p>
                        <button type="button" className="expand-chevron" aria-label="Toggle details">
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="history-item-body">
                        {item.shortAnswer && (
                          <div className="short-answer-box">
                            <span className="short-answer-label">{t('card.short_answer', 'Short answer:')}</span>
                            <p className="short-answer-text">{item.shortAnswer}</p>
                          </div>
                        )}

                        {aiData?.loading && (
                          <div className="ai-loading-box">
                            <Sparkles size={16} className="spin-icon" />
                            <span>{isRu ? 'ИИ анализирует ответ...' : 'AI is analyzing answer...'}</span>
                          </div>
                        )}

                        {aiData?.text && (
                          <div className="ai-explanation-box">
                            <div className="ai-header">
                              <Sparkles size={14} />
                              <span>{t('explanation.title', 'Explanation')}</span>
                            </div>
                            <div className="ai-content">
                              {typeof aiData.text === 'string' ? aiData.text : JSON.stringify(aiData.text)}
                            </div>
                          </div>
                        )}

                        <div className="item-actions-row">
                          {!aiData?.text && (
                            <button
                              type="button"
                              className="action-btn ai-btn"
                              onClick={() => requestAiExplanation(item)}
                              disabled={aiData?.loading}
                            >
                              <Sparkles size={14} /> {t('progress.explain_ai', '✨ Explain with AI')}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {pagination.hasMore && (
                <button
                  type="button"
                  className="load-more-btn"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? t('common.loading', 'Loading...') : t('progress.load_more', 'Load more')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Review CTA (Pro) */}
        <div className="progress-card review-cta">
          <div className="cta-icon"><RotateCcw size={22} /></div>
          <div className="cta-text">
            <h4>{t('review.title', 'Mistakes review')}</h4>
            <p>{t('review.cta_desc', 'Rehearse the questions you keep getting wrong until they stick.')}</p>
          </div>
          {canAccessMode('review') ? (
            <button className="cta-btn" onClick={onReview} type="button">{t('review.start', 'Review')}</button>
          ) : (
            <button className="cta-btn pro" onClick={onUpgrade} type="button">
              <Star size={14} /> PRO
            </button>
          )}
        </div>

        {/* Saved questions */}
        <div className="progress-card saved-cta" onClick={onSavedClick}>
          <div className="cta-icon"><Bookmark size={22} /></div>
          <div className="cta-text">
            <h4>{t('saved.title', 'Saved questions')}</h4>
            <p>{t('progress.saved_desc', 'Questions you bookmarked to review later.')}</p>
          </div>
          <span className="saved-badge">{Object.values(savedIds).filter(Boolean).length}</span>
        </div>

        {/* Upgrade prompt */}
        <div className="progress-card upgrade-cta" onClick={onUpgrade}>
          <Award size={20} />
          <span>{t('progress.go_pro', 'Unlock all modes, mistakes review & deep analytics with Pro')}</span>
        </div>
      </div>
    </div>
  );
};

export default ProgressScreen;
