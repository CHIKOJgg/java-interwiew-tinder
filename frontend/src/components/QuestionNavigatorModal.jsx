import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X, Search, Sparkles, Filter, ChevronRight, CheckCircle2,
  HelpCircle, BookmarkCheck, ArrowUpDown, Flame, Play, BookOpen
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import apiClient from '../api/client';
import './QuestionNavigatorModal.css';

const DIFFICULTIES = ['Junior', 'Middle', 'Senior'];

const difficultyColors = {
  Junior: 'var(--green, #22c55e)',
  Middle: 'var(--accent, #ffd93d)',
  Senior: 'var(--purple, #a855f7)',
};

const QuestionNavigatorModal = ({ isOpen, onClose, onSelectQuestion }) => {
  const { t } = useTranslation();
  const {
    language,
    questions: storeQuestions,
    currentIndex,
    selectedDifficulties,
    setSelectedDifficulties,
    difficultyCounts,
    loadFilterCounts,
    jumpToQuestion,
    loadQuestions,
    savedIds,
  } = useStore();

  const [activeDiff, setActiveDiff] = useState(
    selectedDifficulties?.length === 1 ? selectedDifficulties[0] : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoriesList, setCategoriesList] = useState([]);
  const [feedQuestions, setFeedQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);

  // Load filter counts on mount
  useEffect(() => {
    if (isOpen) {
      loadFilterCounts().catch(() => {});
      apiClient.getCategories().then(res => {
        if (res?.categories) {
          setCategoriesList(res.categories);
        }
      }).catch(() => {});
    }
  }, [isOpen, language, loadFilterCounts]);

  // Fetch questions based on active difficulty and category
  const fetchQuestionsList = useCallback(async () => {
    try {
      setLoading(true);
      const diffParams = activeDiff ? [activeDiff] : [];
      const catParams = selectedCategory ? [selectedCategory] : [];
      const res = await apiClient.getQuestionsFeed(60, 'swipe', {
        difficulties: diffParams,
        categories: catParams,
        search: searchQuery.trim() || undefined,
        cursor: 0,
      });
      if (res?.questions) {
        setFeedQuestions(res.questions);
      }
    } catch (err) {
      console.error('Error fetching questions for navigator:', err);
    } finally {
      setLoading(false);
    }
  }, [activeDiff, selectedCategory, searchQuery]);

  useEffect(() => {
    if (isOpen) {
      if (!searchQuery) {
        fetchQuestionsList();
        return;
      }
      const timer = setTimeout(() => {
        fetchQuestionsList();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeDiff, selectedCategory, searchQuery, fetchQuestionsList]);

  // Combined questions list
  const displayQuestions = useMemo(() => {
    const list = feedQuestions.length > 0 ? feedQuestions : storeQuestions;
    if (!searchQuery.trim() && !activeDiff && !selectedCategory) {
      return list;
    }
    const q = searchQuery.toLowerCase().trim();
    return list.filter(item => {
      const matchDiff = !activeDiff || item.difficulty === activeDiff;
      const matchCat = !selectedCategory || item.category === selectedCategory;
      const matchText = !q ||
        (item.question && item.question.toLowerCase().includes(q)) ||
        (item.shortAnswer && item.shortAnswer.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q));
      return matchDiff && matchCat && matchText;
    });
  }, [feedQuestions, storeQuestions, searchQuery, activeDiff, selectedCategory]);

  if (!isOpen) return null;

  const handleDiffClick = (diff) => {
    setActiveDiff(prev => (prev === diff ? null : diff));
  };

  const handleStartDrill = (diff) => {
    const newDiffs = diff ? [diff] : [];
    setSelectedDifficulties(newDiffs);
    loadQuestions(false);
    onClose();
  };

  const handleQuestionClick = (q) => {
    jumpToQuestion(q.id, q);
    if (onSelectQuestion) {
      onSelectQuestion(q);
    }
    onClose();
  };

  const totalCount =
    (difficultyCounts?.Junior || 0) +
    (difficultyCounts?.Middle || 0) +
    (difficultyCounts?.Senior || 0) ||
    difficultyCounts?.total ||
    displayQuestions.length;

  return (
    <div className="navigator-overlay" onClick={onClose}>
      <div className="navigator-modal" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="navigator-header">
          <div className="navigator-header-title">
            <div className="navigator-icon-wrap">
              <BookOpen size={20} className="nav-icon" />
            </div>
            <div>
              <h3>{t('navigator.title', 'Навигатор по вопросам')}</h3>
              <p className="navigator-subtitle">
                {language} · {t('navigator.questions_count', { count: totalCount, defaultValue: `${totalCount} вопросов` })}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="navigator-close-btn"
            onClick={onClose}
            aria-label={t('common.cancel', 'Закрыть')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="navigator-search-row">
          <div className="navigator-search-box">
            <Search size={16} className="nav-search-icon" />
            <input
              type="text"
              className="navigator-search-input"
              placeholder={t('navigator.search_placeholder', 'Поиск по вопросам, терминам, темам...')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                className="nav-clear-search-btn"
                onClick={() => setSearchQuery('')}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Level / Difficulty Filter Tabs */}
        <div className="navigator-diff-tabs">
          <button
            type="button"
            className={`nav-diff-tab ${activeDiff === null ? 'active' : ''}`}
            onClick={() => handleDiffClick(null)}
          >
            <span>{t('common.all_short', 'Все')}</span>
            <span className="diff-count-badge">{totalCount}</span>
          </button>
          {DIFFICULTIES.map(diff => {
            const count = difficultyCounts?.[diff] || 0;
            const isActive = activeDiff === diff;
            return (
              <button
                key={diff}
                type="button"
                className={`nav-diff-tab diff-${diff.toLowerCase()} ${isActive ? 'active' : ''}`}
                onClick={() => handleDiffClick(diff)}
              >
                <span className="diff-dot" style={{ background: difficultyColors[diff] }} />
                <span>{diff}</span>
                {count > 0 && <span className="diff-count-badge">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Optional Category Pills */}
        {categoriesList.length > 0 && (
          <div className="navigator-category-scroll">
            <button
              type="button"
              className={`nav-cat-pill ${selectedCategory === null ? 'active' : ''}`}
              onClick={() => setSelectedCategory(null)}
            >
              {t('common.all_short', 'Все темы')}
            </button>
            {categoriesList.slice(0, 15).map(cat => (
              <button
                key={cat.name}
                type="button"
                className={`nav-cat-pill ${selectedCategory === cat.name ? 'active' : ''}`}
                onClick={() => setSelectedCategory(prev => prev === cat.name ? null : cat.name)}
              >
                <span>{cat.name}</span>
                {cat.count > 0 && <span className="cat-count">{cat.count}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Questions List */}
        <div className="navigator-list">
          {loading ? (
            <div className="navigator-loading">
              <div className="nav-spinner" />
              <p>{t('common.loading', 'Загрузка вопросов...')}</p>
            </div>
          ) : displayQuestions.length === 0 ? (
            <div className="navigator-empty">
              <HelpCircle size={40} className="empty-icon" />
              <h4>{t('navigator.no_questions', 'Вопросов не найдено')}</h4>
              <p>{t('navigator.no_questions_desc', 'Попробуйте изменить параметры поиска или уровень сложности')}</p>
            </div>
          ) : (
            displayQuestions.map((q, idx) => {
              const isSaved = !!savedIds[q.id];
              const isCurrent = storeQuestions[currentIndex]?.id === q.id;
              const isExpanded = expandedQuestionId === q.id;

              return (
                <div
                  key={q.id || idx}
                  className={`nav-question-card ${isCurrent ? 'current-question' : ''}`}
                  onClick={() => handleQuestionClick(q)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="nav-q-meta">
                    <span className="nav-q-index">#{idx + 1}</span>
                    <span
                      className="nav-diff-badge"
                      style={{
                        borderColor: difficultyColors[q.difficulty] || 'var(--ink)',
                        color: difficultyColors[q.difficulty] || 'var(--ink)'
                      }}
                    >
                      {q.difficulty}
                    </span>
                    <span className="nav-cat-badge">{q.category}</span>
                    {q.is_top && <span className="nav-top-badge">TOP</span>}
                    {isSaved && <BookmarkCheck size={14} className="nav-saved-icon" />}
                  </div>

                  <div className="nav-q-text">{q.question}</div>

                  {q.shortAnswer && (
                    <div
                      className={`nav-q-answer ${isExpanded ? 'expanded' : ''}`}
                      onClick={e => {
                        e.stopPropagation();
                        setExpandedQuestionId(prev => (prev === q.id ? null : q.id));
                      }}
                      title="Кликните, чтобы показать/скрыть подсказку"
                    >
                      <span className="answer-label">{t('card.short_answer', 'Ответ')}:</span>{' '}
                      {isExpanded ? q.shortAnswer : `${q.shortAnswer.slice(0, 85)}...`}
                    </div>
                  )}

                  <div className="nav-q-action">
                    <button
                      type="button"
                      className="nav-open-btn"
                      onClick={e => {
                        e.stopPropagation();
                        handleQuestionClick(q);
                      }}
                    >
                      <span>{t('navigator.open_question', 'Изучить')}</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Drill CTA */}
        <div className="navigator-footer">
          <button
            type="button"
            className="nav-drill-btn"
            onClick={() => handleStartDrill(activeDiff)}
          >
            <Play size={16} fill="currentColor" />
            <span>
              {activeDiff
                ? t('navigator.drill_level', { level: activeDiff, defaultValue: `Тренировать только ${activeDiff}` })
                : t('navigator.drill_all', 'Тренировать все уровни')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionNavigatorModal;
