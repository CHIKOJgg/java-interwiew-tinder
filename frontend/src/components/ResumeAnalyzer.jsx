import React, { useState } from 'react';
import useStore from '../store/useStore';
import { FileText, Search, Star, AlertCircle, ListChecks, Loader2, Sparkles } from 'lucide-react';
import './ResumeAnalyzer.css';

const ResumeAnalyzer = ({ onBack }) => {
  const {
    analyzeResume,
    isAnalyzingResume,
    resumeData,
    clearResumeData
  } = useStore();

  const [resumeText, setResumeText] = useState('');

  const [analyzeError, setAnalyzeError] = useState(null);

  const handleAnalyze = async () => {
    if (!resumeText.trim() || isAnalyzingResume) return;
    setAnalyzeError(null);
    try {
      const result = await analyzeResume(resumeText);
      // Guard: if the AI returned an object missing key fields, show an error
      // instead of rendering empty template cards.
      if (!result || !result.skills || !result.experienceLevel) {
        setAnalyzeError('Не удалось распознать резюме. Попробуйте ещё раз или упростите текст.');
        clearResumeData();
      }
    } catch (err) {
      console.error('analyzeResume failed:', err);
      setAnalyzeError(err?.message?.includes('rate')
        ? 'Превышен лимит запросов. Подождите минуту и попробуйте снова.'
        : 'Ошибка анализа. Проверьте подключение и попробуйте ещё раз.');
    }
  };

  return (
    <div className="resume-analyzer">
      <div className="analyzer-container">
        <div className="analyzer-header">
          <button className="back-btn" onClick={onBack}>← Назад</button>
          <h2>AI Resume Analyzer</h2>
          <p className="subtitle">Вставьте текст вашего резюме для персонализации обучения</p>
        </div>

        {!resumeData ? (
          <div className="analyzer-input-section">
            <div className="input-group">
              <label htmlFor="resume-input">Текст резюме</label>
              <textarea
                id="resume-input"
                placeholder="Вставьте сюда текст вашего резюме (опыт работы, навыки, проекты)..."
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                rows={12}
              />
            </div>
            <button
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={!resumeText.trim() || isAnalyzingResume}
            >
              {isAnalyzingResume ? (
                <>
                  <Loader2 className="spinner" size={20} />
                  <span>Анализируем резюме... (~15–30с)</span>
                </>
              ) : (
                <>
                  <Search size={20} />
                  <span>Проанализировать</span>
                </>
              )}
            </button>
            {analyzeError && (
              <div className="analyze-error">
                ⚠️ {analyzeError}
              </div>
            )}
          </div>
        ) : (
          <div className="analyzer-results-section">
            <div className="results-grid">
              <div className="result-card level-card">
                <div className="card-icon"><Star size={24} /></div>
                <div className="card-info">
                  <h3>Уровень</h3>
                  <div className="level-badge">{resumeData.experienceLevel || "—"}</div>
                </div>
              </div>

              <div className="result-card skills-card">
                <div className="card-header">
                  <ListChecks size={20} />
                  <h3>Ключевые навыки</h3>
                </div>
                <div className="skills-list">
                  {resumeData.skills?.map((skill, i) => (
                    <span key={i} className="skill-tag">{skill}</span>
                  ))}
                </div>
              </div>

              <div className="result-card analysis-card">
                <div className="analysis-section">
                  <h3 className="section-title strengths">
                    <Sparkles size={18} />
                    Сильные стороны
                  </h3>
                  <ul>
                    {resumeData.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>

                <div className="analysis-section">
                  <h3 className="section-title improvement">
                    <AlertCircle size={18} />
                    Что подтянуть
                  </h3>
                  <ul>
                    {resumeData.improvementAreas?.map((area, i) => <li key={i}>{area}</li>)}
                  </ul>
                </div>
              </div>

              <div className="result-card questions-card">
                <div className="card-header">
                  <FileText size={20} />
                  <h3>Рекомендуемые вопросы</h3>
                </div>
                <div className="suggested-questions">
                  {resumeData.suggestedQuestions?.map((q, i) => (
                    <div key={i} className="suggested-q-item">{q}</div>
                  ))}
                </div>
              </div>
            </div>

            <button className="reset-analyzer-btn" onClick={() => { setResumeText(''); clearResumeData(); }}>
              Проанализировать другое резюме
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeAnalyzer;