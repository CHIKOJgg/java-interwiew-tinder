import React from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import { Coffee, Terminal, FileCode, Hash, Shield, Atom, Braces, Check } from 'lucide-react';
import './LanguageSelection.css';

const languages = [
  { id: 'Java', name: 'Java', icon: Coffee, color: '#f89820' },
  { id: 'Python', name: 'Python', icon: Terminal, color: '#3776ab' },
  { id: 'TypeScript', name: 'TypeScript', icon: FileCode, color: '#3178c6' },
  { id: 'Go', name: 'Go', icon: Hash, color: '#00ADD8' },
  { id: 'Rust', name: 'Rust', icon: Shield, color: '#CE422B' },
  { id: 'React', name: 'React', icon: Atom, color: '#61DAFB' },
  { id: 'Kotlin', name: 'Kotlin', icon: Braces, color: '#7F52FF' },
];

const LanguageSelection = ({ onSelect }) => {
  const { t, i18n } = useTranslation();
  const { switchLanguage, language: currentLang } = useStore();
  // Audit 2026-09-02: DB has only 2 languages with >=100 RU questions (Java 584, Python 408)
  // Hide empty languages when interface is RU to avoid "No questions" dead-end.
  const visibleLanguages = i18n.language === 'ru'
    ? languages.filter(l => ['Java', 'Python'].includes(l.id))
    : languages;

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
        {visibleLanguages.map((lang) => (
          <button
            key={lang.id}
            className={`language-card ${currentLang === lang.id ? 'active' : ''}`}
            onClick={() => handleSelect(lang.id)}
            style={{ '--lang-color': lang.color }}
          >
            <span className="language-emoji"><lang.icon size={24} /></span>
            <span className="language-name">{lang.name}</span>
            {currentLang === lang.id && <span className="active-badge"><Check size={14} /></span>}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSelection;
