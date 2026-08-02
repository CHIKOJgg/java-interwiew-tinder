import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import { FileText, Search, Star, AlertCircle, ListChecks, Loader2, Sparkles, Upload, File, Trash2, Play, ArrowLeft } from 'lucide-react';
import './ResumeAnalyzer.css';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const ResumeAnalyzer = ({ onBack, onStartPractice }) => {
  const { t } = useTranslation();
  const {
    analyzeResume,
    isAnalyzingResume,
    resumeData,
    clearResumeData,
    setLearningMode,
    generateResumeQuestions,
    isGeneratingQuestions,
  } = useStore();

  const [resumeText, setResumeText] = useState('');
  const [analyzeError, setAnalyzeError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [practiceQuestions, setPracticeQuestions] = useState([]);
  const [practiceError, setPracticeError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    setFileError(null);
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError(t('resume.file_type_error', 'Unsupported file type. Use PDF, DOCX, TXT.'));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError(t('resume.file_size_error', 'File too large. Max 5 MB.'));
      return;
    }
    setSelectedFile(file);
    setResumeText('');
    parseFile(file);
  };

  const parseFile = async (file) => {
    setAnalyzeError(null);
    try {
      if (file.type === 'application/pdf') {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        pdfjsLib.GlobalWorkerOptions.workerSrc = await import('pdfjs-dist/legacy/build/pdf.worker.mjs?url').then(m => m.default || m);
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        let text = '';
        for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map(item => item.str).join(' ');
          text += pageText + '\n';
        }
        setResumeText(text);
      } else if (file.type.includes('word') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        if (!file.name.toLowerCase().endsWith('.docx')) {
          throw new Error('Only DOCX files are supported. Please export old DOC files as DOCX or PDF.');
        }
        const mammothModule = await import('mammoth');
        const mammoth = mammothModule.default || mammothModule;
        const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        setResumeText(value.replace(/\s+/g, ' ').trim());
      } else {
        const text = await file.text();
        setResumeText(text);
      }
    } catch (err) {
      setFileError(t('resume.parse_error', 'Failed to parse file. Please try again.'));
      console.error('File parse error:', err);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleAnalyze = async () => {
    if (!resumeText.trim() || isAnalyzingResume) return;
    setAnalyzeError(null);
    try {
      const result = await analyzeResume(resumeText);
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

  const handleStartPractice = () => {
    if (!resumeData) return;
    setPracticeError(null);
    setPracticeQuestions([]);
    generateResumeQuestions(resumeData)
      .then((questions) => setPracticeQuestions(questions || []))
      .catch((err) => setPracticeError(err?.message || t('resume.questions_error', 'Не удалось подготовить вопросы')));
    setLearningMode('swipe');
    onStartPractice?.('main');
  };

  const handleClear = () => {
    setResumeText('');
    setSelectedFile(null);
    setFileError(null);
    setAnalyzeError(null);
    setPracticeQuestions([]);
    setPracticeError(null);
    setPracticeQuestions([]);
    setPracticeError(null);
    clearResumeData();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="resume-analyzer">
      <div className="analyzer-container">
        <div className="analyzer-header">
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={18} /> {t('resume.back')}
          </button>
          <h2>{t('resume.title', 'AI Resume Analyzer')}</h2>
          <p className="subtitle">{t('resume.subtitle')}</p>
        </div>

        {!resumeData ? (
          <div className="analyzer-input-section">
            <div
              className={`drop-zone ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'has-file' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label={t('resume.drop_zone_label', 'Drop your resume here or click to browse')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
                style={{ display: 'none' }}
              />
              {selectedFile ? (
                <div className="file-selected">
                  <File size={28} />
                  <span>{selectedFile.name}</span>
                  <span className="file-size">{(selectedFile.size / 1024).toFixed(0)} KB</span>
                </div>
              ) : (
                <>
                  <Upload size={40} className="drop-icon" />
                  <p className="drop-text">{t('resume.drop_text', 'Drop your resume here')}</p>
                  <p className="drop-sub">{t('resume.drop_sub', 'PDF, DOCX, or TXT — up to 5 MB')}</p>
                </>
              )}
            </div>

            {fileError && <div className="analyze-error"><AlertCircle size={16} /> {fileError}</div>}

            <div className="textarea-divider">
              <span className="divider-label">{t('resume.or_paste', 'or paste text')}</span>
            </div>

            <div className="input-group">
              <textarea
                id="resume-input"
                placeholder={t('resume.placeholder')}
                value={resumeText}
                onChange={(e) => { setResumeText(e.target.value); setSelectedFile(null); }}
                rows={8}
                disabled={!!selectedFile}
              />
            </div>

            {selectedFile && (
              <button className="clear-file-btn" onClick={handleClear}>
                <Trash2 size={16} /> {t('resume.clear_file', 'Clear file, type instead')}
              </button>
            )}

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
                <AlertCircle size={16} /> {analyzeError}
              </div>
            )}
          </div>
        ) : (
          <div className="analyzer-results-section">
            <div className="resume-practice-cta">
              <button className="analyze-btn analyze-btn--large" onClick={handleStartPractice} disabled={isGeneratingQuestions}>
                <Play size={20} />
                <span>{isGeneratingQuestions ? t('resume.generating_questions', 'Готовим вопросы...') : t('resume.start_practice', 'Start Practice Based on My Resume →')}</span>
              </button>
              <p className="cta-hint">{t('resume.cta_hint', 'Switches to Swipe mode with AI-curated questions for your gaps')}</p>
              {practiceError && <div className="analyze-error">⚠️ {practiceError}</div>}
              {practiceQuestions.length > 0 && (
                <div className="practice-questions">
                  <h3>{t('resume.generated_questions', 'Вопросы для практики')}</h3>
                  {practiceQuestions.map((question, index) => (
                    <div className="suggested-q-item" key={index}>{typeof question === 'string' ? question : question.question}</div>
                  ))}
                </div>
              )}
            </div>

            <div className="results-grid">
              <div className="result-card level-card">
                <div className="card-icon"><Star size={24} /></div>
                <div className="card-info">
                  <h3>{t('resume.level')}</h3>
                  <div className="level-badge">{resumeData.experienceLevel || '—'}</div>
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

             <button className="reset-analyzer-btn" onClick={handleClear}>
              {t('resume.reset')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResumeAnalyzer;
