import React from 'react';
import { BookmarkCheck, Sparkles, Bookmark, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import './SavedQuestions.css';

const difficultyColors = {
  Junior: 'var(--color-junior)',
  Middle: 'var(--color-middle)',
  Senior: 'var(--color-senior)',
};

const SavedQuestions = ({ onBack }) => {
  const { t } = useTranslation();
  const { savedQuestions, savedIds, toggleSave, loadExplanation } = useStore();

  return (
    <div className="saved-screen">
      <div className="saved-header">
        <button className="saved-back" onClick={onBack} type="button"><ArrowLeft size={22} /></button>
        <h2>{t('saved.title', 'Saved questions')}</h2>
        <span className="saved-count-pill">{savedQuestions.length}</span>
      </div>

      <div className="saved-scroll">
        {savedQuestions.length === 0 ? (
          <div className="saved-empty">
            <Bookmark size={40} />
            <p>{t('saved.empty', 'No saved questions yet. Tap the bookmark on any card to save it for later.')}</p>
          </div>
        ) : (
          savedQuestions.map((q) => {
            const saved = !!savedIds[q.id];
            return (
              <div className="saved-card" key={q.id}>
                <div className="saved-card-badges">
                  <span className="saved-cat">{q.category}</span>
                  <span
                    className="saved-diff"
                    style={{ background: difficultyColors[q.difficulty] || '#868e96' }}
                  >
                    {q.difficulty}
                  </span>
                </div>
                <h3 className="saved-q">{q.question}</h3>
                {q.shortAnswer && <p className="saved-a">{q.shortAnswer}</p>}

                <div className="saved-actions">
                  <button
                    className="saved-explain"
                    onClick={() => loadExplanation(q.id)}
                    type="button"
                  >
                    <Sparkles size={14} /> {t('card.explain_ai', 'Explain with AI')}
                  </button>
                  <button
                    className={`saved-remove ${saved ? 'saved' : ''}`}
                    onClick={() => toggleSave(q.id)}
                    type="button"
                  >
                    {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                    {t('saved.remove', 'Remove')}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SavedQuestions;
