import React, { useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { Play, RotateCcw, ArrowLeft } from 'lucide-react';
import apiClient from '../../api/client';
import useStore from '../../store/useStore';
import './PlaygroundMode.css';

const DEFAULT_CODE = {
  Java: `public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, Java Interview!");\n  }\n}`,
  Python: `print("Hello, Python Interview!")`,
  TypeScript: `console.log("Hello, TypeScript Interview!");`,
};

export default function PlaygroundMode({ initialCode, onBack }) {
  const { language } = useStore();
  const [code, setCode] = useState(initialCode || DEFAULT_CODE[language] || DEFAULT_CODE.Java);
  const [stdin, setStdin] = useState('');
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const codeLanguage = { Java: 'java', Python: 'python', TypeScript: 'typescript' }[language] || 'java';

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);
    setOutput(null);
    try {
      const result = await apiClient.executeCode(code, language, stdin);
      setOutput(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setCode(DEFAULT_CODE[language] || DEFAULT_CODE.Java);
    setOutput(null);
    setError(null);
    setStdin('');
  };

  return (
    <div className="playground">
      <div className="playground-toolbar">
        <button onClick={onBack} className="playground-back"><ArrowLeft size={20} /></button>
        <span className="playground-title">{language}</span>
        <div className="playground-actions">
          <button className="reset-btn" onClick={handleReset}><RotateCcw size={16} /></button>
          <button className="run-btn" onClick={handleRun} disabled={isRunning}>
            <Play size={16} /> {isRunning ? '...' : 'Run'}
          </button>
        </div>
      </div>

      <div className="playground-editor">
        <MonacoEditor
          height="300"
          language={codeLanguage}
          theme="vs-dark"
          value={code}
          onChange={val => setCode(val || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            tabSize: 2,
            wordWrap: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            renderWhitespace: 'all',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
          }}
        />
      </div>

      <div className="playground-stdin">
        <input
          type="text"
          placeholder="stdin..."
          value={stdin}
          onChange={e => setStdin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleRun()}
        />
      </div>

      <div className="playground-output">
        <h4>Output:</h4>
        {isRunning && <div className="output-loading">Running...</div>}
        {error && <div className="output-error">{error}</div>}
        {output && (
          <pre className={`output-content ${output.exitCode !== 0 ? 'error' : ''}`}>
            {output.output || '(empty)'}
            {output.stderr && <div className="output-stderr">{output.stderr}</div>}
            <div className="output-exit">Exit: {output.exitCode}</div>
          </pre>
        )}
      </div>
    </div>
  );
}
