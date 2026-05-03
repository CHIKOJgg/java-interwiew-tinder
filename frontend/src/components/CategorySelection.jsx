import React, { useState, useEffect, useCallback } from 'react';
import { Check } from 'lucide-react';
import api from '../api/client';
import './CategorySelection.css';

const CategorySelection = ({ onComplete }) => {
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
          setSelectedCategories(prefsData.selectedCategories);
        }
      } catch {
        // No saved preferences, use defaults
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  // useCallback so the reference is stable — avoids re-renders
  const toggleCategory = useCallback((categoryName) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((c) => c !== categoryName)
        : [...prev, categoryName]
    );
  }, []);

  const selectAll = () => setSelectedCategories(categories.map((c) => c.name));
  const deselectAll = () => setSelectedCategories([]);

  const handleSave = async () => {
    if (selectedCategories.length === 0) {
      alert('Выберите хотя бы одну категорию');
      return;
    }
    try {
      setSaving(true);
      await api.updatePreferences(selectedCategories);
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
      <div className="category-selection loading">
        <div className="spinner" />
        <p>Загрузка категорий...</p>
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
          ← Назад
        </button>
      </div>
    );
  }

  return (
    <div className="category-selection">
      <div className="category-header">
        <h1>Выберите темы</h1>
        <p>Отметьте категории вопросов для изучения</p>
      </div>

      <div className="category-actions">
        <button onClick={selectAll} className="action-btn">Выбрать все</button>
        <button onClick={deselectAll} className="action-btn">Снять все</button>
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

      <div className="category-footer">
        <div className="selected-count">
          Выбрано: {selectedCategories.length} / {categories.length}
        </div>
        <button
          className="start-button"
          onClick={handleSave}
          disabled={selectedCategories.length === 0 || saving}
        >
          {saving ? 'Сохранение...' : 'Начать изучение'}
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
        <div className="category-count">{category.count} вопросов</div>
      </div>
    </div>
  );
});

export default CategorySelection;
