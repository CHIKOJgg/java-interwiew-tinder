import React, { useState, useEffect, useCallback } from 'react';
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
  const { setSelectedCategories, setSelectedDifficulties, setSelectedCompany, selectedDifficulties: savedDiffs, selectedCompany: savedCompany, user } = useStore();
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setLocalSelected] = useState([]);
  const [selectedDifficulties, setLocalDifficulties] = useState(savedDiffs || []);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setLocalCompany] = useState(savedCompany || null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const cached = loadCategoriesCache();
    if (cached) {
      setCategories(cached.categories || []);
      if (cached.companies) setCompanies(cached.companies);
      if (cached.prefs?.selectedCategories?.length) setLocalSelected(cached.prefs.selectedCategories);
      if (cached.prefs?.selectedCompany) setLocalCompany(cached.prefs.selectedCompany);
      setLoading(false);
      // Refresh cache in background — don't block UI
      Promise.all([
        api.getCategories(),
        api.getCompanies().catch(() => null),
        api.getPreferences().catch(() => null),
      ]).then(([categoriesData, companiesData, prefsData]) => {
        const cats = categoriesData?.categories || [];
        setCategories(cats);
        saveCategoriesCache({ categories: cats, companies: companiesData?.companies || [], prefs: prefsData || {} });
      }).catch(() => {});
    } else {
      loadData();
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriesData, companiesData, prefsData] = await Promise.all([
        api.getCategories(),
        api.getCompanies().catch(() => null),
        api.getPreferences().catch(() => null),
      ]);

      const cats = categoriesData?.categories || [];
      setCategories(cats);
      if (companiesData?.companies) setCompanies(companiesData.companies);
      if (prefsData?.selectedCategories?.length) setLocalSelected(prefsData.selectedCategories);
      if (prefsData?.selectedCompany) setLocalCompany(prefsData.selectedCompany);
      saveCategoriesCache({ categories: cats, companies: companiesData?.companies || [], prefs: prefsData || {} });
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  // useCallback so the reference is stable — avoids re-renders
  const toggleCategory = useCallback((categoryName) => {
    setLocalSelected((prev) =>
      prev.includes(categoryName)
        ? prev.filter((c) => c !== categoryName)
        : [...prev, categoryName]
    );
  }, []);

  const selectAll = () => setLocalSelected(categories.map((c) => c.name));
  const deselectAll = () => setLocalSelected([]);

  const toggleDifficulty = useCallback((diff) => {
    setLocalDifficulties((prev) =>
      prev.includes(diff) ? prev.filter((d) => d !== diff) : [...prev, diff]
    );
  }, []);

  const showPopup = (message) => {
    if (window.Telegram?.WebApp?.showPopup) {
      window.Telegram.WebApp.showPopup({ title: '', message, buttons: [{ type: 'ok' }] });
    } else {
      window.alert(message);
    }
  };

  const handleSave = async () => {
    if (selectedCategories.length === 0) {
      showPopup(t('category.select_at_least_one', 'Please select at least one category'));
      return;
    }
      try {
        setSaving(true);
        await api.updatePreferences(selectedCategories, undefined, selectedCompany);
        setSelectedCategories(selectedCategories);
        setSelectedDifficulties(selectedDifficulties);
        setSelectedCompany(selectedCompany || null);
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

  // ── Empty state — language has no questions yet (e.g. TypeScript) ──
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

  return (
    <div className="category-selection">
      <div className="category-header">
        <button className="back-btn-absolute" onClick={onBack || onComplete}>
          <ArrowLeft size={24} />
        </button>
        <h1>{t('common.choose_topics')}</h1>
        <p>{t('common.choose_topics_desc', 'Select categories for study')}</p>
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

      <div className="categories-grid">
        {categories.map((category) => {
          const isSelected = selectedCategories.includes(category.name);
          return (
            <CategoryCard
              key={category.name}
              category={category}
              isSelected={isSelected}
              onToggle={toggleCategory}
            />
          );
        })}
      </div>

      <div className="category-footer">
        <div className="selected-count">
          {t('common.selected')}: {selectedCategories.length} / {categories.length}
        </div>
        <button
          className="start-button"
          onClick={handleSave}
          disabled={selectedCategories.length === 0 || saving}
        >
          {saving ? t('common.saving') : t('common.done')}
        </button>
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
