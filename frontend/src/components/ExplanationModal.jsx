import React, { useMemo } from 'react';
import { X, BookOpen, MapPin, Code2, Lightbulb, ChevronRight } from 'lucide-react';
import { SkeletonExplanation } from './Skeleton';
import { highlight } from '../utils/highlight';
import '../utils/highlight.css';
import './ExplanationModal.css';
import useStore from '../store/useStore';

// ─── Structured JSON renderer ────────────────────────────────────────
// Renders the fixed schema returned by aiService.generateExplanation:
//   { title, theory, where_used[], code_example, key_points[], metadata }
// Falls back to plain text if explanation is not JSON (old format / error).

function CodeBlock({ code, language }) {
  const html = useMemo(() => highlight(code || '', language), [code, language]);
  return (
    <div
      className="hl-code-block"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function StructuredExplanation({ data, language }) {
  return (
    <div className="structured-explanation">
      {/* Title */}
      {data.title && (
        <h2 className="exp-title">{data.title}</h2>
      )}

      {/* Theory */}
      {data.theory && (
        <section className="exp-section">
          <div className="exp-section-header">
            <BookOpen size={15} />
            <span>Теория</span>
          </div>
          <p className="exp-theory">{data.theory}</p>
        </section>
      )}

      {/* Where used */}
      {data.where_used?.length > 0 && (
        <section className="exp-section">
          <div className="exp-section-header">
            <MapPin size={15} />
            <span>Где применяется</span>
          </div>
          <ul className="exp-list">
            {data.where_used.map((item, i) => (
              <li key={i}><ChevronRight size={12} className="exp-list-icon" />{item}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Code example */}
      {data.code_example && (
        <section className="exp-section">
          <div className="exp-section-header">
            <Code2 size={15} />
            <span>Пример кода</span>
          </div>
          <CodeBlock code={data.code_example} language={language} />
        </section>
      )}

      {/* Key points */}
      {data.key_points?.length > 0 && (
        <section className="exp-section">
          <div className="exp-section-header">
            <Lightbulb size={15} />
            <span>Ключевые моменты</span>
          </div>
          <ul className="exp-list key-points">
            {data.key_points.map((pt, i) => (
              <li key={i}><span className="bullet">•</span>{pt}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ─── Markdown renderer ───────────────────────────────────────────────
// Handles the template output from the new plain-text explanation prompt:
//   ## Heading, **bold**, `inline code`, ```code blocks```, - list items
function PlainExplanation({ text, codeLanguage }) {
  const lines = (text || '').split('\n');
  const nodes = [];
  let i = 0;

  const inlineFormat = (line, key) => {
    // Split on **bold** and `code` spans
    const parts = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return (
      <span key={key}>
        {parts.map((p, j) => {
          if (p.startsWith('**') && p.endsWith('**'))
            return <strong key={j}>{p.slice(2, -2)}</strong>;
          if (p.startsWith('`') && p.endsWith('`'))
            return <code key={j} className="inline-code">{p.slice(1, -1)}</code>;
          return p;
        })}
      </span>
    );
  };

  while (i < lines.length) {
    const line = lines[i];

    // ## Heading
    if (line.startsWith('## ')) {
      nodes.push(<h3 key={i} className="exp-md-heading">{line.slice(3)}</h3>);
      i++; continue;
    }

    // ```code block```
    if (line.trimStart().startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      nodes.push(
        <pre key={i} className="exp-md-code">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // - list item (collect consecutive items into one <ul>)
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <ul key={i} className="exp-md-list">
          {items.map((item, j) => <li key={j}>{inlineFormat(item, j)}</li>)}
        </ul>
      );
      continue;
    }

    // Empty line → skip
    if (!line.trim()) { i++; continue; }

    // Regular paragraph with inline formatting
    nodes.push(<p key={i} className="exp-md-para">{inlineFormat(line, i)}</p>);
    i++;
  }

  return <div className="plain-explanation">{nodes}</div>;
}

// ─── Main component ───────────────────────────────────────────────────
const ExplanationModal = ({ isOpen, explanation, isLoading, onClose }) => {
  const { language } = useStore();

  const { isJson, data } = useMemo(() => {
    if (!explanation || typeof explanation !== 'string') return { isJson: false, data: null };
    const trimmed = explanation.trim();
    if (!trimmed.startsWith('{')) return { isJson: false, data: null };
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.theory || parsed.title) return { isJson: true, data: parsed };
    } catch { }
    return { isJson: false, data: null };
  }, [explanation]);

  if (!isOpen) return null;

  const codeLanguage = { Java: 'java', Python: 'python', TypeScript: 'typescript' }[language] || 'java';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎓 Разбор</h2>
          <button className="close-button" onClick={onClose}><X size={22} /></button>
        </div>

        <div className="modal-body">
          {isLoading ? (
            <SkeletonExplanation />
          ) : isJson ? (
            <StructuredExplanation data={data} language={codeLanguage} />
          ) : (
            <PlainExplanation text={explanation} codeLanguage={codeLanguage} />
          )}
        </div>

        {!isLoading && (
          <div className="modal-footer">
            <button className="action-button" onClick={onClose}>Далее →</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplanationModal;