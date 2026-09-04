import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Flame, Sparkles, Bookmark, BookmarkCheck, ChevronDown, ChevronUp, Play, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import './TopQuestionsScreen.css';

const LANGUAGES = ['Java', 'Python', 'JavaScript', 'Go'];

const difficultyColors = {
  Junior: 'var(--color-junior, #40c057)',
  Middle: 'var(--color-middle, #fab005)',
  Senior: 'var(--color-senior, #fa5252)',
};

const TopQuestionsScreen = ({ onBack, onPractice }) => {
  const { t } = useTranslation();
  const {
    language: defaultLang,
    topQuestions,
    isLoadingTopQuestions,
    topStats,
    loadTopQuestions,
    startTopPractice,
    toggleSave,
    savedIds,
    loadExplanation
  } = useStore();

  const [selectedLang, setSelectedLang] = useState(defaultLang || 'Java');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    loadTopQuestions(selectedLang, selectedCategory);
  }, [selectedLang, selectedCategory, loadTopQuestions]);

  const categories = useMemo(() => {
    const set = new Set();
    topQuestions.forEach(q => { if (q.category) set.add(q.category); });
    return Array.from(set);
  }, [topQuestions]);

  const filteredQuestions = useMemo(() => {
    let list = topQuestions;
    if (selectedCategory) {
      list = list.filter(q => q.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item =>
        (item.question && item.question.toLowerCase().includes(q)) ||
        (item.shortAnswer && item.shortAnswer.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q))
      );
    }
    return list;
  }, [topQuestions, selectedCategory, searchQuery]);

  const handleStartPractice = () => {
    startTopPractice();
    if (onPractice) onPractice();
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <div className="top-questions-screen">
      <div className="top-header">
        <button className="top-back" onClick={onBack} type="button" aria-label={t('common.back', 'Back')}>
          <ArrowLeft size={22} />
        </button>
        <div className="top-header-title">
          <h2>
            <Flame size={20} className="flame-icon" />
            {t('top.title', 'Top Interview Questions')}
          </h2>
          <span className="top-count-pill">{topQuestions.length}</span>
        </div>
      </div>

      <p className="top-subtitle">
        {t('top.desc', 'Curated high-frequency questions most often asked in real tech interviews.')}
      </p>

      {/* Language Selector */}
      <div className="top-lang-tabs">
        {LANGUAGES.map(lang => (
          <button
            key={lang}
            type="button"
            className={`top-lang-tab ${selectedLang === lang ? 'active' : ''}`}
            onClick={() => { setSelectedLang(lang); setSelectedCategory(null); }}
          >
            {lang}
          </button>
        ))}
      </div>

      {/* Quick Practice Banner */}
      <div className="top-practice-card">
        <div className="top-practice-info">
          <h3>{t('top.practice_title', 'Drill in Swipe Mode')}</h3>
          <p>{t('top.practice_desc', 'Train your recall with rapid Tinder-style cards.')}</p>
        </div>
        <button className="top-practice-btn" onClick={handleStartPractice} type="button">
          <Play size={16} fill="currentColor" />
          {t('top.start_drill', 'Start')}
        </button>
      </div>

      {/* Search Input */}
      <div className="top-search-box">
        <Search size={16} className="top-search-icon" />
        <input
          type="text"
          className="top-search-input"
          placeholder={t('top.search_placeholder', 'Search top questions...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="top-search-clear" onClick={() => setSearchQuery('')} type="button">×</button>
        )}
      </div>

      {/* Categories Filter Pills */}
      {categories.length > 0 && (
        <div className="top-cat-pills">
          <button
            type="button"
            className={`top-cat-pill ${selectedCategory === null ? 'active' : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            {t('common.all', 'All')}
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              className={`top-cat-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(prev => prev === cat ? null : cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Questions List */}
      <div className="top-list">
        {isLoadingTopQuestions ? (
          <div className="top-loading">
            <div className="top-skeleton-card" />
            <div className="top-skeleton-card" />
            <div className="top-skeleton-card" />
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="top-empty">
            <Flame size={36} />
            <p>{t('top.empty', 'No matching questions found.')}</p>
          </div>
        ) : (
          filteredQuestions.map((q, idx) => {
            const isSaved = !!savedIds[q.id];
            const isExpanded = expandedId === q.id;
            const rank = q.topRank || idx + 1;
            const isTop10 = rank <= 10;

            return (
              <div className={`top-card ${isExpanded ? 'expanded' : ''}`} key={q.id || idx}>
                <div className="top-card-header" onClick={() => toggleExpand(q.id)}>
                  <div className={`top-rank-badge ${isTop10 ? 'top-tier' : ''}`}>
                    {isTop10 && <Flame size={12} className="rank-flame" />}
                    #{rank}
                  </div>
                  <div className="top-card-meta">
                    <span className="top-badge-cat">{q.category}</span>
                    {q.difficulty && (
                      <span
                        className="top-badge-diff"
                        style={{ background: difficultyColors[q.difficulty] || '#868e96' }}
                      >
                        {q.difficulty}
                      </span>
                    )}
                  </div>
                  <button className="top-expand-btn" type="button" aria-label="Toggle answer">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>

                <div className="top-card-question" onClick={() => toggleExpand(q.id)}>
                  <h3>{q.question}</h3>
                </div>

                {isExpanded && (
                  <div className="top-card-body">
                    {q.shortAnswer && (
                      <div className="top-card-answer">
                        <strong>{t('top.answer_label', 'Answer')}:</strong>
                        <p>{q.shortAnswer}</p>
                      </div>
                    )}

                    <div className="top-card-actions">
                      <button
                        className="top-explain-btn"
                        onClick={() => loadExplanation(q.id)}
                        type="button"
                      >
                        <Sparkles size={14} />
                        {t('card.explain_ai', 'Explain with AI')}
                      </button>

                      <button
                        className={`top-save-btn ${isSaved ? 'saved' : ''}`}
                        onClick={() => toggleSave(q.id)}
                        type="button"
                      >
                        {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                        {isSaved ? t('saved.saved', 'Saved') : t('saved.save', 'Save')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TopQuestionsScreen;
