import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from "@sentry/react";
import './i18n/config';
import './index.css';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

const ErrorScreen = () => (
  <div style={{
    height: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', padding: 24,
    textAlign: 'center', background: '#f8f9fa', color: '#212529'
  }}>
    <h1 style={{ fontSize: 24, marginBottom: 12 }}>Something went wrong</h1>
    <p style={{ opacity: 0.7, marginBottom: 24 }}>
      An unexpected error occurred. Our team has been notified.
    </p>
    <button
      onClick={() => window.location.reload()}
      style={{
        padding: '12px 24px', borderRadius: 12, background: '#5c7cfa',
        color: '#fff', border: 'none', fontSize: 16, cursor: 'pointer',
        fontWeight: 600
      }}
    >
      Reload Application
    </button>
  </div>
);

async function bootstrap() {
  try {
    const { default: App } = await import('./App');

    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <Sentry.ErrorBoundary fallback={<ErrorScreen />}>
          <App />
        </Sentry.ErrorBoundary>
      </React.StrictMode>
    );
  } catch (err) {
    console.error('BOOT FAILED:', err);
    Sentry.captureException(err);
    document.getElementById('root').innerHTML =
      '<div style="padding:16px">Startup failed. Check console.</div>';
  }
}

bootstrap();