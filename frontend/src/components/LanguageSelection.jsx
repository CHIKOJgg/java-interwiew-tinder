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
  const { t } = useTranslation();
  const { switchLanguage, language: currentLang } = useStore();
  // RU+EN fallback: all 7 languages stay visible. Feed/demo top up scarce RU
  // pools (Go/TS/Rust/React/Kotlin ~3 RU each) with EN so the deck never empties.
  const visibleLanguages = languages;

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
