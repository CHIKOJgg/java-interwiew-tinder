import React from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import './LanguageSelection.css';

const languages = [
  { id: 'Java', name: 'Java', emoji: '☕', color: '#f89820' },
  { id: 'Python', name: 'Python', emoji: '🐍', color: '#3776ab' },
  { id: 'TypeScript', name: 'TypeScript', emoji: '🟦', color: '#3178c6' },
];

const LanguageSelection = ({ onSelect }) => {
  const { t } = useTranslation();
  const { switchLanguage, language: currentLang } = useStore();

  const handleSelect = async (langId) => {
    await switchLanguage(langId);
    onSelect(langId);
  };

  return (
    <div className="language-selection">
      <div className="language-header">
        <h1>{t('language.title', 'Choose Language')}</h1>
        <p>{t('language.subtitle', 'Select your primary tech stack')}</p>
      </div>

      <div className="language-grid">
        {languages.map((lang) => (
          <button
            key={lang.id}
            className={`language-card ${currentLang === lang.id ? 'active' : ''}`}
            onClick={() => handleSelect(lang.id)}
            style={{ '--lang-color': lang.color }}
          >
            <span className="language-emoji">{lang.emoji}</span>
            <span className="language-name">{lang.name}</span>
            {currentLang === lang.id && <span className="active-badge">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSelection;
