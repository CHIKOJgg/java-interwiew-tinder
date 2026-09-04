import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Check, ArrowLeft, Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SkeletonGrid } from './Skeleton';
import api from '../api/client';
import useStore from '../store/useStore';
import './CategorySelection.css';

const DIFFICULTIES = ['Junior', 'Middle', 'Senior'];

const CACHE_KEY = 'jit_categories_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function loadCategoriesCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL) return null;
    return parsed.data;
  } catch { return null; }
}

function saveCategoriesCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data })); } catch { /* ignore */ }
}

const CategorySelection = ({ onComplete, onBack }) => {
  const { t } = useTranslation();
  const {
    setSelectedCategories,
    setSelectedDifficulties,
    setSelectedCompany,
    setSelectedFrameworks,
    setSelectedTopics,
    setTopicSearchQuery,
    selectedDifficulties: savedDiffs,
    selectedCompany: savedCompany,
    selectedFrameworks: savedFrameworks,
    selectedTopics: savedTopics,
    topicSearchQuery: savedSearch,
    user
  } = useStore();

  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'frameworks' | 'topics'
  const [searchQuery, setSearchQuery] = useState(savedSearch || '');
  const [categories, setCategories] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedCategories, setLocalCategories] = useState([]);
  const [selectedFrameworks, setLocalFrameworks] = useState(savedFrameworks || []);
  const [selectedTopics, setLocalTopics] = useState(savedTopics || []);
  const [selectedDifficulties, setLocalDifficulties] = useState(savedDiffs || []);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setLocalCompany] = useState(savedCompany || null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const applyData = (filtersData, companiesData, prefsData) => {
    if (filtersData?.categories) setCategories(filtersData.categories);
    if (filtersData?.frameworks) setFrameworks(filtersData.frameworks);
    if (filtersData?.topics) setTopics(filtersData.topics);
    if (companiesData?.companies) setCompanies(companiesData.companies);
    if (prefsData?.selectedCategories?.length) setLocalCategories(prefsData.selectedCategories);
    if (prefsData?.selectedFrameworks?.length) setLocalFrameworks(prefsData.selectedFrameworks);
    if (prefsData?.selectedTopics?.length) setLocalTopics(prefsData.selectedTopics);
    if (prefsData?.selectedCompany) setLocalCompany(prefsData.selectedCompany);
  };

  useEffect(() => {
    const cached = loadCategoriesCache();
    if (cached) {
      setCategories(cached.categories || []);
      setFrameworks(cached.frameworks || []);
      setTopics(cached.topics || []);
      if (cached.companies) setCompanies(cached.companies);
      if (cached.prefs?.selectedCategories?.length) setLocalCategories(cached.prefs.selectedCategories);
      if (cached.prefs?.selectedFrameworks?.length) setLocalFrameworks(cached.prefs.selectedFrameworks);
      if (cached.prefs?.selectedTopics?.length) setLocalTopics(cached.prefs.selectedTopics);
      if (cached.prefs?.selectedCompany) setLocalCompany(cached.prefs.selectedCompany);
      setLoading(false);

      // Refresh cache in background
      Promise.all([
        api.getFilters().catch(() => api.getCategories()),
        api.getCompanies().catch(() => null),
        api.getPreferences().catch(() => null),
      ]).then(([filtersData, companiesData, prefsData]) => {
        applyData(filtersData, companiesData, prefsData);
        saveCategoriesCache({
          categories: filtersData?.categories || [],
          frameworks: filtersData?.frameworks || [],
          topics: filtersData?.topics || [],
          companies: companiesData?.companies || [],
          prefs: prefsData || {}
        });
      }).catch(() => {});
    } else {
      loadData();
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [filtersData, companiesData, prefsData] = await Promise.all([
        api.getFilters().catch(() => api.getCategories()),
        api.getCompanies().catch(() => null),
        api.getPreferences().catch(() => null),
      ]);

      applyData(filtersData, companiesData, prefsData);
      saveCategoriesCache({
        categories: filtersData?.categories || [],
        frameworks: filtersData?.frameworks || [],
        topics: filtersData?.topics || [],
        companies: companiesData?.companies || [],
        prefs: prefsData || {}
      });
    } catch (error) {
      console.error('Error loading filters:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get current list based on active tab
  const currentItems = useMemo(() => {
    let list = [];
    if (activeTab === 'categories') list = categories;
    else if (activeTab === 'frameworks') list = frameworks;
    else if (activeTab === 'topics') list = topics;

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(item => item.name && item.name.toLowerCase().includes(q));
  }, [activeTab, categories, frameworks, topics, searchQuery]);

  const toggleItem = useCallback((name) => {
    if (activeTab === 'categories') {
      setLocalCategories(prev =>
        prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
      );
    } else if (activeTab === 'frameworks') {
      setLocalFrameworks(prev =>
        prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]
      );
    } else if (activeTab === 'topics') {
      setLocalTopics(prev =>
        prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]
      );
    }
  }, [activeTab]);

  const selectAll = () => {
    const itemNames = currentItems.map(i => i.name);
    if (activeTab === 'categories') {
      setLocalCategories(prev => Array.from(new Set([...prev, ...itemNames])));
    } else if (activeTab === 'frameworks') {
      setLocalFrameworks(prev => Array.from(new Set([...prev, ...itemNames])));
    } else if (activeTab === 'topics') {
      setLocalTopics(prev => Array.from(new Set([...prev, ...itemNames])));
    }
  };

  const deselectAll = () => {
    const itemNames = new Set(currentItems.map(i => i.name));
    if (activeTab === 'categories') {
      setLocalCategories(prev => prev.filter(name => !itemNames.has(name)));
    } else if (activeTab === 'frameworks') {
      setLocalFrameworks(prev => prev.filter(name => !itemNames.has(name)));
    } else if (activeTab === 'topics') {
      setLocalTopics(prev => prev.filter(name => !itemNames.has(name)));
    }
  };

  const toggleDifficulty = useCallback((diff) => {
    setLocalDifficulties(prev =>
      prev.includes(diff) ? prev.filter(d => d !== diff) : [...prev, diff]
    );
  }, []);

  const showPopup = (message) => {
    if (window.Telegram?.WebApp?.showPopup) {
      window.Telegram.WebApp.showPopup({ title: '', message, buttons: [{ type: 'ok' }] });
    } else {
      window.alert(message);
    }
  };

  const handleResetFilters = () => {
    setLocalCategories([]);
    setLocalFrameworks([]);
    setLocalTopics([]);
    setLocalDifficulties([]);
    setLocalCompany(null);
    setSearchQuery('');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.updatePreferences(selectedCategories, undefined, selectedCompany, selectedFrameworks, selectedTopics);
      setSelectedCategories(selectedCategories);
      setSelectedFrameworks(selectedFrameworks);
      setSelectedTopics(selectedTopics);
      setSelectedDifficulties(selectedDifficulties);
      setSelectedCompany(selectedCompany || null);
      setTopicSearchQuery(searchQuery);
      onComplete();
    } catch (error) {
      console.error('Error saving preferences:', error);
      showPopup(t('category.save_error', 'Error saving preferences'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="category-selection">
        <div className="category-header">
          <h1>{t('common.choose_topics')}</h1>
        </div>
        <SkeletonGrid count={8} />
      </div>
    );
  }

  // Empty state — language has no questions yet (e.g. TypeScript)
  if (!loading && categories.length === 0) {
    return (
      <div className="category-selection" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, padding: 24 }}>
        <Inbox size={48} />
        <h2 style={{ textAlign: 'center' }}>{t('category.empty_title', 'No questions for this language yet')}</h2>
        <p style={{ textAlign: 'center', opacity: 0.6 }}>{t('category.empty_desc', 'Please choose another language or check back later.')}</p>
        <button
          className="start-button"
          onClick={onBack || onComplete}
          style={{ marginTop: 8 }}
        >
          {t('common.back')}
        </button>
      </div>
    );
  }

  const isCurrentItemSelected = (name) => {
    if (activeTab === 'categories') return selectedCategories.includes(name);
    if (activeTab === 'frameworks') return selectedFrameworks.includes(name);
    if (activeTab === 'topics') return selectedTopics.includes(name);
    return false;
  };

  return (
    <div className="category-selection">
      <div className="category-header">
        <button className="back-btn-absolute" onClick={onBack || onComplete}>
          <ArrowLeft size={24} />
        </button>
        <h1>{t('common.choose_topics')}</h1>
        <p>{t('common.choose_topics_desc', 'Select categories, frameworks, and topics for study')}</p>
      </div>

      <div className="filter-search-box">
        <input
          type="text"
          className="filter-search-input"
          placeholder={t('common.search_placeholder', 'Search topics, frameworks...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="filter-tabs">
        <button
          type="button"
          className={`filter-tab ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          {t('common.categories', 'Categories')}
          {selectedCategories.length > 0 && (
            <span className="filter-tab-badge">{selectedCategories.length}</span>
          )}
        </button>
        <button
          type="button"
          className={`filter-tab ${activeTab === 'frameworks' ? 'active' : ''}`}
          onClick={() => setActiveTab('frameworks')}
        >
          {t('common.frameworks', 'Frameworks')}
          {selectedFrameworks.length > 0 && (
            <span className="filter-tab-badge">{selectedFrameworks.length}</span>
          )}
        </button>
        <button
          type="button"
          className={`filter-tab ${activeTab === 'topics' ? 'active' : ''}`}
          onClick={() => setActiveTab('topics')}
        >
          {t('common.topics', 'Topics')}
          {selectedTopics.length > 0 && (
            <span className="filter-tab-badge">{selectedTopics.length}</span>
          )}
        </button>
      </div>

      <div className="category-actions">
        <button onClick={selectAll} className="action-btn">{t('common.all')}</button>
        <button onClick={deselectAll} className="action-btn">{t('common.none')}</button>
      </div>

      <div className="difficulty-filter">
        <span className="difficulty-filter-label">{t('category.difficulty', 'Difficulty')}:</span>
        <div className="difficulty-chips">
          {DIFFICULTIES.map((diff) => {
            const active = selectedDifficulties.includes(diff);
            return (
              <button
                key={diff}
                className={`difficulty-chip diff-${diff} ${active ? 'active' : ''}`}
                onClick={() => toggleDifficulty(diff)}
                type="button"
              >
                {active && <Check size={14} />}
                {t(`difficulty.${diff}`, diff)}
              </button>
            );
          })}
        </div>
        {selectedDifficulties.length > 0 && (
          <button className="difficulty-clear" onClick={() => setLocalDifficulties([])} type="button">
            {t('common.clear', 'Clear')}
          </button>
        )}
      </div>

      {companies.length > 0 && (
        <div className="company-filter">
          <span className="difficulty-filter-label">{t('category.company', 'Company')}:</span>
          <div className="company-chips">
            {companies.map(c => (
              <button
                key={c.name}
                className={`company-chip ${selectedCompany === c.name ? 'active' : ''}`}
                onClick={() => setLocalCompany(prev => prev === c.name ? null : c.name)}
                type="button"
              >
                {c.name}
              </button>
            ))}
          </div>
          {selectedCompany && (
            <button className="difficulty-clear" onClick={() => setLocalCompany(null)} type="button">
              {t('common.clear', 'Clear')}
            </button>
          )}
        </div>
      )}

      {currentItems.length === 0 ? (
        <div className="empty-filter-state">
          {searchQuery
            ? t('common.no_matching_filters', 'No items matching your search')
            : t('common.no_items_in_tab', 'No items available in this section')}
        </div>
      ) : (
        <div className="categories-grid">
          {currentItems.map((item) => {
            const isSelected = isCurrentItemSelected(item.name);
            return (
              <CategoryCard
                key={item.name}
                category={item}
                isSelected={isSelected}
                onToggle={toggleItem}
              />
            );
          })}
        </div>
      )}

      <div className="category-footer">
        <div className="selected-count">
          {activeTab === 'categories' && `${t('common.selected')}: ${selectedCategories.length} / ${categories.length}`}
          {activeTab === 'frameworks' && `${t('common.selected')}: ${selectedFrameworks.length} / ${frameworks.length}`}
          {activeTab === 'topics' && `${t('common.selected')}: ${selectedTopics.length} / ${topics.length}`}
        </div>
        <div className="filter-footer-btns">
          <button
            type="button"
            className="filter-reset-btn"
            onClick={handleResetFilters}
            title={t('common.reset_filters', 'Reset all filters')}
          >
            {t('common.reset', 'Reset')}
          </button>
          <button
            className="start-button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? t('common.saving') : t('common.apply', 'Apply')}
          </button>
        </div>
      </div>
    </div>
  );
};

// Separate component prevents re-render of the whole grid on every toggle.
// Uses pointer events only (no onTouchEnd + onClick double-fire).
const CategoryCard = React.memo(({ category, isSelected, onToggle }) => {
  const { t } = useTranslation();
  const handlePointerUp = (e) => {
    // Only fire for primary button / touch
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    onToggle(category.name);
  };

  return (
    <div
      className={`category-card ${isSelected ? 'selected' : ''}`}
      onPointerUp={handlePointerUp}
      style={{ touchAction: 'manipulation', cursor: 'pointer' }}
    >
      <div className="category-checkbox" style={{ pointerEvents: 'none' }}>
        {isSelected && <Check size={20} />}
      </div>
      <div className="category-info" style={{ pointerEvents: 'none' }}>
        <div className="category-name">{category.name}</div>
        <div className="category-count">{category.count} {t('common.questions')}</div>
      </div>
    </div>
  );
});

export default CategorySelection;
