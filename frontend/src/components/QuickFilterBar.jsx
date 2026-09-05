import React from 'react';
import { SlidersHorizontal, X, Flame, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import './QuickFilterBar.css';

const DIFFICULTIES = ['Junior', 'Middle', 'Senior'];

const QuickFilterBar = ({ onOpenFilters }) => {
  const { t } = useTranslation();
  const {
    selectedDifficulties,
    setSelectedDifficulties,
    selectedCategories,
    setSelectedCategories,
    selectedFrameworks,
    setSelectedFrameworks,
    selectedTopics,
    setSelectedTopics,
    filterOnlyTop,
    setFilterOnlyTop,
    loadQuestions,
  } = useStore();

  const handleDifficultyClick = (diff) => {
    if (!diff) {
      // "All" selected -> clear difficulty filter
      if (!selectedDifficulties || selectedDifficulties.length === 0) return;
      setSelectedDifficulties([]);
      loadQuestions(false);
      return;
    }

    const current = selectedDifficulties || [];
    let updated;
    if (current.includes(diff)) {
      updated = current.filter((d) => d !== diff);
    } else {
      updated = [diff]; // Single select for quick toggling
    }
    setSelectedDifficulties(updated);
    loadQuestions(false);
  };

  const removeCategory = (cat) => {
    const updated = (selectedCategories || []).filter((c) => c !== cat);
    setSelectedCategories(updated);
    loadQuestions(false);
  };

  const removeFramework = (fw) => {
    const updated = (selectedFrameworks || []).filter((f) => f !== fw);
    setSelectedFrameworks(updated);
    loadQuestions(false);
  };

  const removeTopic = (top) => {
    const updated = (selectedTopics || []).filter((t) => t !== top);
    setSelectedTopics(updated);
    loadQuestions(false);
  };

  const removeTopFilter = () => {
    setFilterOnlyTop(false);
    loadQuestions(false);
  };

  const clearAllFilters = () => {
    setSelectedDifficulties([]);
    setSelectedCategories([]);
    setSelectedFrameworks([]);
    setSelectedTopics([]);
    setFilterOnlyTop(false);
    loadQuestions(false);
  };

  const hasSpecificDiff = (selectedDifficulties || []).length > 0;
  const activePillsCount =
    (selectedCategories || []).length +
    (selectedFrameworks || []).length +
    (selectedTopics || []).length +
    (filterOnlyTop ? 1 : 0);

  return (
    <div className="quick-filter-bar">
      <div className="quick-filter-scroll">
        {/* Quick TOP 100 Toggle */}
        <button
          type="button"
          className={`quick-top100-chip ${filterOnlyTop ? 'active' : ''}`}
          onClick={() => {
            const next = !filterOnlyTop;
            setFilterOnlyTop(next);
            loadQuestions(false);
          }}
          title={t('top.title', 'Top 100 Questions')}
        >
          <Flame size={13} className="quick-flame-icon" />
          <span>{t('top.top_100_chip', 'Top 100')}</span>
        </button>

        {/* Difficulty Selector */}
        <div className="quick-diff-group">
          <button
            type="button"
            className={`quick-diff-chip ${!hasSpecificDiff ? 'active' : ''}`}
            onClick={() => handleDifficultyClick(null)}
          >
            {t('common.all', 'All')}
          </button>
          {DIFFICULTIES.map((diff) => {
            const active = (selectedDifficulties || []).includes(diff);
            return (
              <button
                key={diff}
                type="button"
                className={`quick-diff-chip diff-${diff.toLowerCase()} ${active ? 'active' : ''}`}
                onClick={() => handleDifficultyClick(diff)}
              >
                {diff}
              </button>
            );
          })}
        </div>

        {/* Divider if active filter pills exist */}
        {(activePillsCount > 0 || hasSpecificDiff) && <div className="quick-filter-divider" />}

        {/* Active Filter Pills with (X) Dismiss */}
        {filterOnlyTop && (
          <span className="active-filter-pill pill-top">
            <Flame size={12} className="pill-icon" /> Top
            <button
              type="button"
              className="pill-remove-btn"
              onClick={removeTopFilter}
              aria-label="Remove Top filter"
            >
              <X size={12} />
            </button>
          </span>
        )}

        {(selectedFrameworks || []).map((fw) => (
          <span key={`fw-${fw}`} className="active-filter-pill pill-framework">
            ⚡ {fw}
            <button
              type="button"
              className="pill-remove-btn"
              onClick={() => removeFramework(fw)}
              aria-label={`Remove ${fw}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}

        {(selectedTopics || []).map((top) => (
          <span key={`top-${top}`} className="active-filter-pill pill-topic">
            💡 {top}
            <button
              type="button"
              className="pill-remove-btn"
              onClick={() => removeTopic(top)}
              aria-label={`Remove ${top}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}

        {(selectedCategories || []).map((cat) => (
          <span key={`cat-${cat}`} className="active-filter-pill pill-category">
            {cat}
            <button
              type="button"
              className="pill-remove-btn"
              onClick={() => removeCategory(cat)}
              aria-label={`Remove ${cat}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}

        {/* Full Filters Button */}
        <button
          type="button"
          className="quick-open-filter-btn"
          onClick={onOpenFilters}
          title={t('common.filters', 'Filter by category, framework, topic')}
        >
          <SlidersHorizontal size={13} />
          <span>{t('common.filters', 'Filters')}</span>
          {activePillsCount > 0 && <span className="quick-filter-count">{activePillsCount}</span>}
        </button>

        {/* Reset button if multiple filters are set */}
        {(activePillsCount > 0 || hasSpecificDiff) && (
          <button
            type="button"
            className="quick-clear-btn"
            onClick={clearAllFilters}
            title={t('common.reset_filters', 'Clear all filters')}
          >
            <RotateCcw size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

export default QuickFilterBar;
