import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    try {
      localStorage.setItem('__jit_last_error', JSON.stringify({
        message: error?.message,
        stack: error?.stack?.split('\n').slice(0, 8).join('\n'),
        time: Date.now(),
      }));
    } catch {}
  }

  render() {
    if (this.state.error) {
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
          <button onClick={() => window.location.reload()}
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
