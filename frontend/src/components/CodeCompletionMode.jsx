import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import { Code2, Check, X, Loader2, Braces, AlertTriangle } from 'lucide-react';
import MonacoEditor from '@monaco-editor/react';
import '../utils/highlight.css';
import './CodeCompletionMode.css';

// Render a code snippet using Monaco Editor (read-only) with ___ as blank.
function SnippetBlock({ snippet, selected, result, codeLanguage }) {
  const parts = (snippet || '').split('___');
  const displayPlaceholder = result
    ? (result.isCorrect ? selected : selected)
    : (selected || '___');
  const fullCode = parts.join(displayPlaceholder);

  return (
    <div className="hl-code-block snippet-block">
      <MonacoEditor
        height="auto"
        language={codeLanguage}
        theme="vs-dark"
        value={fullCode}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'off',
          tabSize: 2,
          wordWrap: 'on',
          automaticLayout: true,
          scrollBeyondLastLine: false,
          readOnly: true,
          cursorBlinking: 'solid',
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
}

const CodeCompletionMode = () => {
  const { questions, currentIndex, submitCodeCompletionAnswer, isLoadingQuestions,
    hasMoreQuestions, fetchGeneration, advanceQuestion, language } = useStore();
  const { t } = useTranslation();

  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const currentQuestion = questions[currentIndex];
  const completionData = currentQuestion?.codeCompletionData;
  const hasError = completionData?.__error;
  const codeLanguage = { Java: 'java', Python: 'python', TypeScript: 'typescript' }[language] || 'java';

  useEffect(() => {
    setSelectedOption(null);
    setResult(null);
    if (currentQuestion && !completionData) {
      fetchGeneration('code', currentQuestion.id);
    }
  }, [currentIndex, currentQuestion?.id]); // eslint-disable-line

  const handleSubmit = async () => {
    if (!selectedOption || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await submitCodeCompletionAnswer(currentQuestion.id, selectedOption);
      setResult({ isCorrect: response.isCorrect, correctAnswer: response.correctAnswer });
    } catch (err) {
      console.error('Code completion submit error:', err);
      setSubmitError(err?.message || t('common.request_failed', 'Не удалось проверить ответ'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    setResult(null);
    setSelectedOption(null);
    advanceQuestion();
  };

  if (isLoadingQuestions) return <LoadingCard text={t('common.loading_questions', 'Loading questions...')} />;
  if (!hasMoreQuestions()) {
    return (
      <div className="completion-loading">
        <Code2 size={40} />
        <p>{t('code_completion.empty', 'No more code challenges available.')}</p>
      </div>
    );
  }

  if (hasError) return (
    <div className="completion-loading error">
      <AlertTriangle size={40} />
      <p>{completionData.message}</p>
      <button className="retry-btn" onClick={() => fetchGeneration('code', currentQuestion.id, 0)}>
        {t('common.retry', 'Try again')}
      </button>
    </div>
  );

  if (!completionData) return <LoadingCard text={t('code_completion.preparing', 'Preparing code fragment...')} />;

  return (
    <div className="code-completion-mode">
      <div className="completion-card">
        <div className="completion-header">
          <div className="completion-badge"><Braces size={14} /><span>Code Completion</span></div>
          <span className="topic-badge">{currentQuestion.category}</span>
        </div>

        <p className="completion-instruction">{t('code_completion.instruction', 'Complete the code fragment:')}</p>

        {/* §5 — syntax-highlighted snippet with ___ replaced */}
        <SnippetBlock
          snippet={completionData.snippet}
          selected={selectedOption}
          result={result}
          codeLanguage={codeLanguage}
        />

        <div className="options-grid">
          {completionData.options?.map((option, index) => {
            let cls = 'completion-option';
            if (selectedOption === option) cls += ' selected';
            if (result) {
              const norm = s => (s || '').trim().toLowerCase();
              if (norm(option) === norm(result.correctAnswer)) cls += ' correct';
              else if (selectedOption === option && !result.isCorrect) cls += ' incorrect';
            }
            return (
              <button key={index} className={cls}
                onClick={() => !result && !isSubmitting && setSelectedOption(option)}
                disabled={!!result}>
                <code>{option}</code>
              </button>
            );
          })}
        </div>

        {!result ? (
          <>
            {submitError && <div className="mode-error" role="alert">⚠️ {submitError}</div>}
            <button className="submit-completion-btn"
              disabled={!selectedOption || isSubmitting} onClick={handleSubmit} type="button">
              {isSubmitting ? <Loader2 className="spinner" size={18} /> : t('code_completion.submit', 'Finish')}
            </button>
          </>
        ) : (
          <div className="completion-result-feedback">
            {result.isCorrect
              ? <div className="completion-feedback correct"><Check size={18} /><span>{t('code_completion.correct', 'Perfect!')}</span></div>
              : <div className="completion-feedback incorrect"><X size={18} />
                <span>{t('code_completion.incorrect', 'Incorrect. Correct:')} <code>{result.correctAnswer}</code></span>
              </div>
            }
            {/* §12 — next button always appears */}
            <button className="next-completion-btn" onClick={handleNext}>
              {t('code_completion.next', 'Next fragment →')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const LoadingCard = ({ text }) => (
  <div className="completion-loading">
    <Loader2 className="spinner" size={48} />
    <p>{text}</p>
  </div>
);

export default CodeCompletionMode;
