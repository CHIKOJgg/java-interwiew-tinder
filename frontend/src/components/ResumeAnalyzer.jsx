import React, { useState } from 'react';
import useStore from '../store/useStore';
import { useTranslation } from 'react-i18next';
import { FileText, Search, Star, AlertCircle, ListChecks, Loader2, Sparkles } from 'lucide-react';
import './ResumeAnalyzer.css';

const ResumeAnalyzer = ({ onBack }) => {
  const { t } = useTranslation();
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
        setAnalyzeError(t('resume.error_parse'));
        clearResumeData();
      }
    } catch (err) {
      console.error('analyzeResume failed:', err);
      setAnalyzeError(err?.message?.includes('rate')
        ? t('resume.error_rate')
        : t('resume.error_generic'));
    }
  };

  return (
    <div className="resume-analyzer">
      <div className="analyzer-container">
        <div className="analyzer-header">
          <button className="back-btn" onClick={onBack}>← {t('resume.back')}</button>
          <h2>AI Resume Analyzer</h2>
          <p className="subtitle">{t('resume.subtitle')}</p>
        </div>

        {!resumeData ? (
          <div className="analyzer-input-section">
            <div className="input-group">
              <label htmlFor="resume-input">{t('resume.label')}</label>
              <textarea
                id="resume-input"
                placeholder={t('resume.placeholder')}
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
                  <span>{t('resume.analyzing')}</span>
                </>
              ) : (
                <>
                  <Search size={20} />
                  <span>{t('resume.analyze')}</span>
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
                  <h3>{t('resume.level')}</h3>
                  <div className="level-badge">{resumeData.experienceLevel || "—"}</div>
                </div>
              </div>

              <div className="result-card skills-card">
                <div className="card-header">
                  <ListChecks size={20} />
                  <h3>{t('resume.skills')}</h3>
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
                    {t('resume.strengths')}
                  </h3>
                  <ul>
                    {resumeData.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>

                <div className="analysis-section">
                  <h3 className="section-title improvement">
                    <AlertCircle size={18} />
                    {t('resume.improvement')}
                  </h3>
                  <ul>
                    {resumeData.improvementAreas?.map((area, i) => <li key={i}>{area}</li>)}
                  </ul>
                </div>
              </div>

              <div className="result-card questions-card">
                <div className="card-header">
                  <FileText size={20} />
                  <h3>{t('resume.questions')}</h3>
                </div>
                <div className="suggested-questions">
                  {resumeData.suggestedQuestions?.map((q, i) => (
                    <div key={i} className="suggested-q-item">{q}</div>
                  ))}
                </div>
              </div>
            </div>

            <button className="reset-analyzer-btn" onClick={() => { setResumeText(''); clearResumeData(); }}>
              {t('resume.reset')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeAnalyzer;