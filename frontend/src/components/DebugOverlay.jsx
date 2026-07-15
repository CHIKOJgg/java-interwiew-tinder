import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Trash2 } from 'lucide-react';
import logger from '../utils/logger';
import './DebugOverlay.css';

// On-screen console for Telegram WebApp / mini app where DevTools (F12) is
// unavailable. Toggle it by long-pressing anywhere, or 5 quick taps.
const LEVEL_ORDER = ['debug', 'info', 'api', 'warn', 'error'];

const DebugOverlay = ({ visible, onClose }) => {
  const [logs, setLogs] = useState(logger.getLogs());
  const [filter, setFilter] = useState('all');
  const [autoscroll, setAutoscroll] = useState(true);
  const scrollRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (!visible) return undefined;
    setLogs(logger.getLogs());
    return logger.subscribe(setLogs);
  }, [visible]);

  useEffect(() => {
    if (autoscroll && endRef.current) {
      endRef.current.scrollIntoView({ block: 'end' });
    }
  }, [logs, autoscroll, filter]);

  const copyAll = useCallback(() => {
    const text = logs.map((l) => `${l.t} [${l.level.toUpperCase()}] ${l.text}`).join('\n');
    try {
      if (navigator.clipboard) navigator.clipboard.writeText(text);
      logger.info('DebugOverlay: logs copied to clipboard');
    } catch { /* noop */ }
  }, [logs]);

  if (!visible) return null;

  const minWeight = filter === 'all' ? 0 : logger.LEVELS[filter]?.weight ?? 0;
  const shown = logs.filter((l) => (logger.LEVELS[l.level]?.weight ?? 0) >= minWeight);

  return (
    <div className="debug-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="debug-head">
        <span className="debug-title">🐞 Debug log</span>
        <div className="debug-actions">
          <button type="button" className="debug-btn" onClick={copyAll} title="Copy all">Copy</button>
          <button type="button" className="debug-btn" onClick={() => logger.clear()} title="Clear">
            <Trash2 size={14} />
          </button>
          <button type="button" className="debug-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="debug-filters">
        {LEVEL_ORDER.map((lv) => (
          <button
            key={lv}
            type="button"
            className={`debug-filter ${filter === lv ? 'active' : ''}`}
            onClick={() => setFilter(lv)}
          >
            {lv}
          </button>
        ))}
        <button
          type="button"
          className={`debug-filter ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          all
        </button>
        <label className="debug-auto">
          <input
            type="checkbox"
            checked={autoscroll}
            onChange={(e) => setAutoscroll(e.target.checked)}
          />
          auto
        </label>
      </div>

      <div className="debug-body" ref={scrollRef}>
        {shown.length === 0 && <div className="debug-empty">No logs yet.</div>}
        {shown.map((l) => (
          <div key={l.id} className={`debug-line lvl-${l.level}`}>
            <span className="debug-time">{l.t}</span>
            <span className="debug-badge">{logger.LEVELS[l.level]?.label}</span>
            <span className="debug-text">{l.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};

export default DebugOverlay;
