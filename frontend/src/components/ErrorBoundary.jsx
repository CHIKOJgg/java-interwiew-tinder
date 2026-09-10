import { Component } from 'react';

function isChunkError(error) {
  const msg = error?.message || String(error || '');
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Importing a module script failed') ||
    error?.name === 'ChunkLoadError'
  );
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null, isChunkLoadError: false };
  }

  static getDerivedStateFromError(error) {
    return { error, isChunkLoadError: isChunkError(error) };
  }

  componentDidCatch(error, info) {
    this.setState({ info });

    // Auto-heal on chunk loading failures (after new deployments)
    if (isChunkError(error)) {
      const lastReload = parseInt(sessionStorage.getItem('jit_chunk_eb_reload') || '0', 10);
      const now = Date.now();
      if (!lastReload || now - lastReload > 15000) {
        sessionStorage.setItem('jit_chunk_eb_reload', String(now));
        this.hardReload();
        return;
      }
    }

    try {
      localStorage.setItem('__jit_last_error', JSON.stringify({
        message: error?.message,
        stack: error?.stack?.split('\n').slice(0, 8).join('\n'),
        time: Date.now(),
      }));
    } catch {
      // Local error persistence is best-effort.
    }
  }

  hardReload = async (isManual = false) => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if (isManual) {
        sessionStorage.removeItem('jit_chunk_eb_reload');
      }
    } catch {
      // Best effort cleanup
    }
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      const isChunk = this.state.isChunkLoadError;

      if (isChunk) {
        return (
          <div style={{
            padding: 32, fontFamily: 'Inter, system-ui, sans-serif',
            background: '#181510', color: '#F7F3E6', minHeight: '100dvh',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', textAlign: 'center', gap: 16,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: '#D3FF4D', color: '#181510',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 'bold'
            }}>
              ↻
            </div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
              App Update Available
            </h2>
            <p style={{ margin: 0, fontSize: 14, opacity: 0.8, maxWidth: 320, lineHeight: 1.5 }}>
              A new version of Prep-It is ready. Refresh now to get the latest features and questions.
            </p>
            <button
              onClick={() => this.hardReload(true)}
              style={{
                marginTop: 8, padding: '14px 28px', borderRadius: 12,
                background: '#D3FF4D', color: '#181510', border: 'none',
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Update & Refresh
            </button>
          </div>
        );
      }

      return (
        <div style={{
          padding: 32, fontFamily: 'monospace', fontSize: 13,
          background: '#1a1a2e', color: '#ff6b6b', minHeight: '100dvh',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <h2 style={{ margin: 0, color: '#ff6b6b', fontSize: 16 }}>Runtime Error</h2>
          <pre style={{
            background: 'rgba(255,0,0,0.1)', padding: 16, borderRadius: 8,
            overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            maxHeight: '60vh',
          }}>
            {this.state.error?.message || 'Unknown error'}
            {'\n\n'}
            {this.state.error?.stack?.split('\n').slice(0, 10).join('\n')}
          </pre>
          <button onClick={this.hardReload}
            style={{
              padding: '12px 24px', borderRadius: 8, background: '#5c7cfa',
              color: '#fff', border: 'none', fontSize: 14, cursor: 'pointer',
              alignSelf: 'flex-start',
            }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
