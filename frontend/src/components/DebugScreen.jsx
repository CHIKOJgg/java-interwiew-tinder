import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Copy, RefreshCw } from 'lucide-react';
import logger from '../utils/logger';
import apiClient from '../api/client';
import './DebugOverlay.css';

const LEVEL_COLORS = {
  debug: '#868e96', info: '#4dabf7', api: '#9775fa', warn: '#fcc419', error: '#ff6b6b',
};

export default function DebugScreen({ onClose }) {
  const [tab, setTab] = useState('logs');
  const [logs, setLogs] = useState(logger.getLogs());
  const endRef = useRef(null);
  const [storeSnap, setStoreSnap] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const unsub = logger.subscribe(setLogs);
    return unsub;
  }, []);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ block: 'end' });
  }, [logs, tab]);

  const snapStore = useCallback(() => {
    try {
      import('../store/useStore').then(m => {
        const s = m.default.getState();
        setStoreSnap({
          isAuthenticated: s.isAuthenticated,
          token: s.token ? 'set (' + s.token.slice(0, 12) + '...)' : 'null',
          language: s.language,
          selectedCategories: s.selectedCategories,
          selectedDifficulties: s.selectedDifficulties,
          questionsLen: s.questions.length,
          hasMore: s.hasMore,
          isLoadingQuestions: s.isLoadingQuestions,
          currentIndex: s.currentIndex,
          learningMode: s.learningMode,
          isLoading: s.isLoading,
          user: s.user ? (s.user.first_name || '') + ' ' + (s.user.last_name || '') : 'null',
          _loadingLock: s._loadingLock,
          stats: JSON.stringify(s.stats),
        });
      });
    } catch {}
  }, []);

  const copyAll = useCallback(() => {
    const auth = 'initData: ' + (apiClient.initData ? apiClient.initData.length + ' chars' : 'null');
    const tg = window.Telegram?.WebApp;
    const lines = [
      '=== DEBUG DUMP ===',
      '',
      'Time: ' + new Date().toISOString(),
      'URL: ' + window.location.href,
      'UA: ' + navigator.userAgent,
      '',
      '--- Auth ---',
      auth,
      'apiClient.userId: ' + (apiClient.userId || 'null'),
      '',
      '--- Telegram ---',
      'platform: ' + (tg?.platform || 'N/A'),
      'version: ' + (tg?.version || 'N/A'),
      'initDataUnsafe.user: ' + JSON.stringify(tg?.initDataUnsafe?.user || null),
      'initDataUnsafe.start_param: ' + (tg?.initDataUnsafe?.start_param || 'null'),
      '',
      '--- Store ---',
      ...Object.entries(storeSnap || {}).map(function(kv) { return kv[0] + ': ' + kv[1]; }),
      '',
      '--- Logs ---',
      ...logs.map(function(l) { return l.t + ' [' + l.level.toUpperCase() + '] ' + l.text; }),
      '',
      '=== END ===',
    ];
    const text = lines.join('\n');
    try {
      if (navigator.clipboard) navigator.clipboard.writeText(text);
      logger.info('Debug: copied to clipboard');
    } catch { logger.warn('Debug: copy failed'); }
  }, [logs, storeSnap]);

  const testFeed = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    logger.info('Debug: manual /api/questions/feed test starting...');
    try {
      const data = await apiClient.getQuestionsFeed(5, 'swipe', { cursor: 0, seed: 'debug_test' });
      setTestResult({ ok: true, questions: (data.questions || []).length, meta: JSON.stringify(data.meta || {}) });
      logger.info('Debug: feed OK - ' + (data.questions || []).length + ' questions');
    } catch (err) {
      setTestResult({ ok: false, error: err.message });
      logger.error('Debug: feed FAILED - ' + err.message);
    }
    setTesting(false);
  }, []);

  useEffect(function() { snapStore(); }, [tab, snapStore]);

  const errorLogs = logs.filter(function(l) { return l.level === 'error'; });
  const apiLogs = logs.filter(function(l) { return l.level === 'api'; });

  return (
    <div className="debug-overlay">
      <div className="debug-head">
        <span className="debug-title">🐞 Debug</span>
        <div className="debug-actions">
          <button type="button" className="debug-btn" onClick={copyAll} title="Copy all"><Copy size={14} /> Copy</button>
          <button type="button" className="debug-btn" onClick={onClose} title="Close"><X size={16} /></button>
        </div>
      </div>

      <div className="debug-filters">
        {['logs', 'api', 'errors', 'auth', 'store', 'test'].map(function(t) {
          return <button key={t} type="button" className={'debug-filter' + (tab === t ? ' active' : '')} onClick={function() { setTab(t); }}>{t}{t === 'errors' && errorLogs.length > 0 ? ' (' + errorLogs.length + ')' : ''}</button>;
        })}
      </div>

      <div className="debug-body">
        {tab === 'logs' && (
          <>
            {logs.length === 0 && <div className="debug-empty">No logs yet.</div>}
            {logs.map(function(l) {
              return (
                <div key={l.id} className="debug-line" style={{ borderLeft: '3px solid ' + (LEVEL_COLORS[l.level] || '#fff'), paddingLeft: 6 }}>
                  <span className="debug-time">{l.t}</span>
                  <span className="debug-badge" style={{ background: (LEVEL_COLORS[l.level] || '#fff') + '33', color: LEVEL_COLORS[l.level] || '#fff' }}>{l.level.toUpperCase()}</span>
                  <span className="debug-text">{l.text}</span>
                </div>
              );
            })}
            <div ref={endRef} />
          </>
        )}

        {tab === 'api' && (
          <>
            {apiLogs.length === 0 && <div className="debug-empty">No API logs yet.</div>}
            {apiLogs.map(function(l) {
              return (
                <div key={l.id} className="debug-line" style={{ borderLeft: '3px solid ' + (LEVEL_COLORS[l.level] || '#fff'), paddingLeft: 6 }}>
                  <span className="debug-time">{l.t}</span>
                  <span className="debug-badge" style={{ background: (LEVEL_COLORS[l.level] || '#fff') + '33', color: LEVEL_COLORS[l.level] || '#fff' }}>{l.level.toUpperCase()}</span>
                  <span className="debug-text">{l.text}</span>
                </div>
              );
            })}
            <div ref={endRef} />
          </>
        )}

        {tab === 'errors' && (
          <>
            {errorLogs.length === 0 && <div className="debug-empty">No errors.</div>}
            {errorLogs.map(function(l) {
              return (
                <div key={l.id} className="debug-line" style={{ borderLeft: '3px solid ' + (LEVEL_COLORS[l.level] || '#fff'), paddingLeft: 6 }}>
                  <span className="debug-time">{l.t}</span>
                  <span className="debug-badge" style={{ background: (LEVEL_COLORS[l.level] || '#fff') + '33', color: LEVEL_COLORS[l.level] || '#fff' }}>{l.level.toUpperCase()}</span>
                  <span className="debug-text" style={{ color: '#ffc9c9' }}>{l.text}</span>
                </div>
              );
            })}
          </>
        )}

        {tab === 'auth' && (
          <div style={{ padding: '8px 0', fontSize: 13, lineHeight: 2 }}>
            <div><b>apiClient.token:</b> {apiClient.token ? 'set' : 'null'}</div>
            <div><b>apiClient.initData:</b> {apiClient.initData ? 'set (' + apiClient.initData.length + ' chars)' : 'null'}</div>
            <div><b>apiClient.userId:</b> {apiClient.userId || 'null'}</div>
            <hr style={{ borderColor: '#333', margin: '8px 0' }} />
            <div><b>Telegram WebApp:</b> {window.Telegram?.WebApp ? 'exists' : 'not found'}</div>
            <div><b>Platform:</b> {window.Telegram?.WebApp?.platform || 'N/A'}</div>
            <div><b>Version:</b> {window.Telegram?.WebApp?.version || 'N/A'}</div>
            <div><b>initData length:</b> {window.Telegram?.WebApp?.initData?.length || 0}</div>
            <div style={{ fontSize: 11, opacity: 0.7, wordBreak: 'break-all', marginTop: 4 }}>
              <b>initData preview:</b> {(window.Telegram?.WebApp?.initData || '').slice(0, 300)}
            </div>
            <hr style={{ borderColor: '#333', margin: '8px 0' }} />
            <div><b>Store isAuthenticated:</b> {storeSnap?.isAuthenticated ? 'true' : 'false'}</div>
            <div><b>Store token:</b> {storeSnap?.token || 'null'}</div>
            <div><b>Store user:</b> {storeSnap?.user || 'null'}</div>
            <div><b>Store _loadingLock:</b> {String(storeSnap?._loadingLock)}</div>
          </div>
        )}

        {tab === 'store' && (
          <div style={{ padding: '8px 0', fontSize: 13, lineHeight: 2 }}>
            <button type="button" className="debug-btn" onClick={snapStore} style={{ marginBottom: 8 }}>
              <RefreshCw size={14} /> Refresh
            </button>
            {storeSnap ? Object.entries(storeSnap).map(function(kv) {
              return (
                <div key={kv[0]} style={{ display: 'flex', gap: 8 }}>
                  <b style={{ minWidth: 160 }}>{kv[0]}:</b>
                  <span style={{ wordBreak: 'break-word' }}>{String(kv[1])}</span>
                </div>
              );
            }) : <div className="debug-empty">Store not loaded.</div>}

            <hr style={{ borderColor: '#333', margin: '12px 0' }} />

            <div style={{ fontWeight: 700, marginBottom: 8 }}>Actions</div>
            <button type="button" className="debug-btn" onClick={testFeed} disabled={testing} style={{ marginRight: 8 }}>
              {testing ? 'Testing...' : 'Test /api/questions/feed'}
            </button>

            {testResult && (
              <div style={{ marginTop: 8, padding: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 8, fontSize: 12 }}>
                <div style={{ color: testResult.ok ? '#69db7c' : '#ff6b6b', fontWeight: 700 }}>
                  {testResult.ok ? 'SUCCESS' : 'FAILED'}
                </div>
                <div>{testResult.ok ? 'questions: ' + testResult.questions : 'error: ' + testResult.error}</div>
                {testResult.meta && <div style={{ opacity: 0.6, fontSize: 11 }}>meta: {testResult.meta}</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}