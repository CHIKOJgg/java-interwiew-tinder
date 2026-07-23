import React, { useState } from 'react';
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
        <textarea
          value={code}
          onChange={e => setCode(e.target.value)}
          spellCheck={false}
          className="code-textarea"
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
