import React, { useState, useEffect } from 'react';
import useStore from '../store/useStore';
import { Link, CheckCircle2, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import './ConceptLinker.css';

const ConceptLinker = () => {
  const { 
    questions, 
    currentIndex, 
    isLoadingQuestions,
    hasMoreQuestions,
    loadQuestions 
  } = useStore();

  const [terms, setTerms] = useState([]);
  const [definitions, setDefinitions] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [selectedDef, setSelectedDef] = useState(null);
  const [matches, setMatches] = useState([]); // Array of { termId, defId }
  const [wrongMatch, setWrongMatch] = useState(null); // { termId, defId }
  const [isLevelComplete, setIsLevelComplete] = useState(false);

  // Initialize a "level" with 5 questions
  useEffect(() => {
    if (questions.length > 0) {
      const levelQuestions = questions.slice(currentIndex, currentIndex + 5);
      
      const newTerms = levelQuestions.map(q => ({
        id: q.id,
        text: q.question.length > 50 ? q.question.substring(0, 50) + '...' : q.question
      }));

      const newDefs = levelQuestions.map(q => ({
        id: q.id,
        text: q.shortAnswer
      })).sort(() => Math.random() - 0.5);

      setTerms(newTerms);
      setDefinitions(newDefs);
      setMatches([]);
      setIsLevelComplete(false);
    }
  }, [questions, currentIndex]);

  const handleTermClick = (termId) => {
    if (isLevelComplete || matches.some(m => m.termId === termId)) return;
    setSelectedTerm(termId);
    if (selectedDef) checkMatch(termId, selectedDef);
  };

  const handleDefClick = (defId) => {
    if (isLevelComplete || matches.some(m => m.defId === defId)) return;
    setSelectedDef(defId);
    if (selectedTerm) checkMatch(selectedTerm, defId);
  };

  const checkMatch = (termId, defId) => {
    if (termId === defId) {
      const newMatches = [...matches, { termId, defId }];
      setMatches(newMatches);
      setSelectedTerm(null);
      setSelectedDef(null);
      
      if (newMatches.length === terms.length) {
        setIsLevelComplete(true);
      }
    } else {
      setWrongMatch({ termId, defId });
      setTimeout(() => {
        setWrongMatch(null);
        setSelectedTerm(null);
        setSelectedDef(null);
      }, 1000);
    }
  };

  if (isLoadingQuestions && terms.length === 0) {
    return (
      <div className="linker-loading">
        <Loader2 className="spinner" size={48} />
        <p>Подготовка пазла...</p>
      </div>
    );
  }

  if (!hasMoreQuestions()) return null;

  return (
    <div className="concept-linker-mode">
      <div className="linker-container">
        <div className="linker-header">
          <div className="linker-badge">
            <Link size={16} />
            <span>Concept Linker</span>
          </div>
          <div className="level-progress">
            {matches.length} / {terms.length} найдено
          </div>
        </div>

        <div className="linker-grid">
          <div className="terms-column">
            <h3>Термины</h3>
            {terms.map(term => {
              const isMatched = matches.some(m => m.termId === term.id);
              const isSelected = selectedTerm === term.id;
              const isWrong = wrongMatch?.termId === term.id;

              return (
                <div 
                  key={term.id}
                  className={`linker-item term-item ${isMatched ? 'matched' : ''} ${isSelected ? 'selected' : ''} ${isWrong ? 'wrong' : ''}`}
                  onClick={() => handleTermClick(term.id)}
                >
                  {term.text}
                </div>
              );
            })}
          </div>

          <div className="defs-column">
            <h3>Определения</h3>
            {definitions.map(def => {
              const isMatched = matches.some(m => m.defId === def.id);
              const isSelected = selectedDef === def.id;
              const isWrong = wrongMatch?.defId === def.id;

              return (
                <div 
                  key={def.id}
                  className={`linker-item def-item ${isMatched ? 'matched' : ''} ${isSelected ? 'selected' : ''} ${isWrong ? 'wrong' : ''}`}
                  onClick={() => handleDefClick(def.id)}
                >
                  {def.text}
                </div>
              );
            })}
          </div>
        </div>

        {isLevelComplete && (
          <div className="level-complete-overlay">
            <div className="complete-card">
              <Sparkles size={48} className="sparkles-icon" />
              <h2>Все связи установлены!</h2>
              <p>Вы отлично разбираетесь в этих концепциях.</p>
              <button className="next-level-btn" onClick={() => loadQuestions()}>
                <span>Следующий набор</span>
                <RefreshCw size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConceptLinker;
