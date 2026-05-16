import React, { useState, useEffect, useCallback } from 'react';
import { Check, Gift, Copy, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SkeletonGrid } from './Skeleton';
import api from '../api/client';
import useStore from '../store/useStore';
import './CategorySelection.css';

const CategorySelection = ({ onComplete }) => {
  const { t } = useTranslation();
  const { setSelectedCategories, user } = useStore();
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setLocalSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refStats, setRefStats] = useState({ total: 0, converted: 0, rewardDays: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const categoriesData = await api.getCategories();
      setCategories(categoriesData.categories || []);

      try {
        const prefsData = await api.getPreferences();
        if (prefsData.selectedCategories && prefsData.selectedCategories.length > 0) {
          setLocalSelected(prefsData.selectedCategories);
        }
      } catch {
        // No saved preferences, use defaults
      }

      try {
        const stats = await api.getReferralStats();
        setRefStats(stats);
      } catch (e) {
        console.error('Failed to load referral stats', e);
      }
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

  const handleSave = async () => {
    if (selectedCategories.length === 0) {
      alert('Выберите хотя бы одну категорию');
      return;
    }
    try {
      setSaving(true);
      await api.updatePreferences(selectedCategories);
      // Persist into store so Header topic counter can read them (§3)
      setSelectedCategories(selectedCategories);
      onComplete();
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Ошибка сохранения настроек');
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
        <div style={{ fontSize: 48 }}>📭</div>
        <h2 style={{ textAlign: 'center' }}>Вопросы для этого языка ещё не добавлены</h2>
        <p style={{ textAlign: 'center', opacity: 0.6 }}>Выберите другой язык или вернитесь позже — база вопросов пополняется.</p>
        <button
          className="start-button"
          onClick={onComplete}
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
        <h1>{t('common.choose_topics')}</h1>
        <p>{t('common.choose_topics_desc', 'Select categories for study')}</p>
      </div>

      <div className="category-actions">
        <button onClick={selectAll} className="action-btn">{t('common.all')}</button>
        <button onClick={deselectAll} className="action-btn">{t('common.none')}</button>
      </div>

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
      
      <div className="referral-section">
        <div className="referral-card">
          <div className="referral-title">
            <Gift className="gift-icon" size={20} />
            <h3>{t('referral.title')}</h3>
          </div>
          <p className="referral-text">{t('referral.desc')}</p>
          
          <div className="referral-link-box" onClick={() => {
            const link = `https://t.me/${window.Telegram?.WebApp?.initDataUnsafe?.receiver?.username || 'JavaInterviewTinderBot'}?start=${user?.telegram_id}`;
            navigator.clipboard.writeText(link);
            alert(t('referral.copied'));
          }}>
            <span className="ref-url">t.me/your_referral_link</span>
            <Copy size={16} />
          </div>

          <div className="referral-stats">
            <div className="ref-stat">
              <span className="ref-val">{refStats.total}</span>
              <span className="ref-lab">{t('referral.invited')}</span>
            </div>
            <div className="ref-stat">
              <span className="ref-val">{refStats.converted}</span>
              <span className="ref-lab">{t('referral.paid')}</span>
            </div>
            <div className="ref-stat highlight">
              <span className="ref-val">{refStats.rewardDays}</span>
              <span className="ref-lab">{t('referral.pro_days')}</span>
            </div>
          </div>
        </div>
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
