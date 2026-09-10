import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Search, ChevronDown, ChevronUp,
  AlertTriangle, BookOpen, Sparkles, Layers,
} from 'lucide-react';
import { ABBREVIATIONS, ABBREVIATION_CATEGORIES } from '../data/abbreviations';
import useStore from '../store/useStore';
import './AbbreviationGlossary.css';

export default function AbbreviationGlossary({ onBack, onPractice }) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const { setLearningMode } = useStore();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ABBREVIATIONS.filter((item) => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        item.id.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.interviewTrap.toLowerCase().includes(q)
      );
    });
  }, [search, selectedCategory]);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handlePractice = () => {
    setLearningMode('test');
    if (onPractice) {
      onPractice();
    }
  };

  return (
    <div className="glossary-screen">
      {/* Header */}
      <div className="glossary-header">
        <button className="glossary-back-btn" onClick={onBack} type="button" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div className="glossary-title-group">
          <h1>
            <BookOpen size={20} className="glossary-title-icon" />
            {isEn ? 'IT Abbreviations & Concepts' : 'Справочник IT-аббревиатур'}
          </h1>
          <span className="glossary-count-badge">
            {filteredItems.length} {isEn ? 'terms' : 'терминов'}
          </span>
        </div>
      </div>

      {/* Subheader / Hero description */}
      <div className="glossary-intro">
        <p>
          {isEn
            ? 'Key acronyms frequently asked on tech interviews (DIP, DI, IoC, SOLID, ACID, CAP, CQRS). Tap any term to reveal the interview trap.'
            : 'Главные аббревиатуры и термины собеседований (DIP, DI, IoC, SOLID, ACID, CAP, CQRS). Нажмите на карточку, чтобы узнать подвох от интервьюера.'}
        </p>
      </div>

      {/* Search Input */}
      <div className="glossary-search-box">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isEn ? 'Search acronym, e.g. DIP, ACID, CORS...' : 'Поиск: например, DIP, ACID, CORS...'}
          className="glossary-search-input"
        />
        {search && (
          <button className="search-clear-btn" onClick={() => setSearch('')} type="button">
            ✕
          </button>
        )}
      </div>

      {/* Category Filter Chips */}
      <div className="glossary-categories">
        {ABBREVIATION_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`glossary-cat-chip ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {isEn ? cat.labelEn : cat.labelRu}
          </button>
        ))}
      </div>

      {/* List of Acronyms */}
      <div className="glossary-list">
        {filteredItems.length === 0 ? (
          <div className="glossary-empty">
            <p>{isEn ? 'No abbreviations matched your search.' : 'Ничего не найдено по вашему запросу.'}</p>
            <button className="glossary-reset-btn" onClick={() => { setSearch(''); setSelectedCategory('all'); }}>
              {isEn ? 'Reset filters' : 'Сбросить фильтры'}
            </button>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className={`glossary-card ${isExpanded ? 'expanded' : ''}`}
                onClick={() => toggleExpand(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleExpand(item.id); }}
              >
                <div className="glossary-card-top">
                  <div className="glossary-badge-wrapper">
                    <span className="glossary-badge">{item.id}</span>
                    <span className="glossary-full-name">{item.name}</span>
                  </div>
                  <div className="glossary-expand-arrow">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                <p className="glossary-summary">{item.summary}</p>

                {isExpanded && (
                  <div className="glossary-details">
                    <div className="glossary-trap-box">
                      <div className="trap-header">
                        <AlertTriangle size={16} className="trap-icon" />
                        <span>{isEn ? 'Interview Trap & Tricky Question' : 'Подвох на собеседовании'}</span>
                      </div>
                      <p className="trap-body">{item.interviewTrap}</p>
                    </div>

                    {item.related && item.related.length > 0 && (
                      <div className="glossary-related">
                        <span className="related-label">{isEn ? 'Related terms:' : 'Связанные понятия:'}</span>
                        <div className="related-chips">
                          {item.related.map((rel) => (
                            <button
                              key={rel}
                              type="button"
                              className="related-chip"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSearch(rel);
                                setExpandedId(rel);
                              }}
                            >
                              {rel}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Floating or Bottom Practice CTA */}
      <div className="glossary-footer">
        <button className="glossary-practice-btn" onClick={handlePractice} type="button">
          <Sparkles size={18} />
          <span>{isEn ? 'Practice Abbreviations in Quiz' : 'Тренировать в квиз-режиме'}</span>
        </button>
      </div>
    </div>
  );
}
