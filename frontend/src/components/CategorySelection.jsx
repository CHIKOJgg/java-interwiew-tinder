import React, { useState, useEffect } from 'react';
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

      // Загружаем доступные категории
      const categoriesData = await api.getCategories();
      setCategories(categoriesData.categories || []);

      // Загружаем сохраненные предпочтения
      try {
        const prefsData = await api.getPreferences();
        if (
          prefsData.selectedCategories &&
          prefsData.selectedCategories.length > 0
        ) {
          setSelectedCategories(prefsData.selectedCategories);
        }
      } catch (error) {
        console.log('No saved preferences, using defaults');
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryName) => {
    console.log('🔘 Category clicked:', categoryName);
    setSelectedCategories((prev) => {
      if (prev.includes(categoryName)) {
        console.log('   ➖ Removing category');
        return prev.filter((c) => c !== categoryName);
      } else {
        console.log('   ➕ Adding category');
        return [...prev, categoryName];
      }
    });
  };

  const selectAll = () => {
    setSelectedCategories(categories.map((c) => c.name));
  };

  const deselectAll = () => {
    setSelectedCategories([]);
  };

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
        <div className="spinner"></div>
        <p>Загрузка категорий...</p>
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
        <button onClick={selectAll} className="action-btn">
          Выбрать все
        </button>
        <button onClick={deselectAll} className="action-btn">
          Снять все
        </button>
      </div>

      <div className="categories-grid">
        {categories.map((category) => {
          const isSelected = selectedCategories.includes(category.name);

          return (
            <div
              key={category.name}
              className={`category-card ${isSelected ? 'selected' : ''}`}
              onClick={() => toggleCategory(category.name)}
            >
              <div className="category-checkbox">
                {isSelected && <Check size={20} />}
              </div>
              <div className="category-info">
                <div className="category-name">{category.name}</div>
                <div className="category-count">{category.count} вопросов</div>
              </div>
            </div>
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

export default CategorySelection;
