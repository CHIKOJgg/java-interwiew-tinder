import React from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from './components/ErrorBoundary';
import './i18n/config';
import './index.css';

// ─── Telegram Mini App initialization ──────────────────────────────────
function applySafeArea() {
  const wa = window.Telegram?.WebApp;
  if (!wa) return;
  const s = wa.safeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 };
  const c = wa.contentSafeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 };
  const r = document.documentElement.style;
  r.setProperty('--safe-top', (s.top + c.top) + 'px');
  r.setProperty('--safe-bottom', (s.bottom + c.bottom) + 'px');
}

function initTelegramApp() {
  const wa = window.Telegram?.WebApp;
  if (!wa) return;
  applySafeArea();
  wa.onEvent('safeAreaChanged', applySafeArea);
  wa.onEvent('contentSafeAreaChanged', applySafeArea);
  wa.setBackgroundColor('#F7F3E6');
  wa.ready();
  wa.expand();
  wa.MainButton.setParams({ color: '#D3FF4D', text_color: '#181510' });
}

initTelegramApp();

// ─── Bootstrap ─────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    const { default: App } = await import('./App');

    if (!window.__jitGoogleCallback) {
      window.__jitGoogleCallback = async (response) => {
        try {
          const apiClient = (await import('./api/client')).default;
          const referralId = new URLSearchParams(window.location.search).get('ref') || null;
          const res = await apiClient.loginWithProvider({ provider: 'google', idToken: response.credential, referralId });
          const { default: useStore } = await import('./store/useStore');
          useStore.getState().loginWithToken(res.user, res.token, res);
        } catch (err) {
          console.error('Google callback failed', err);
        }
      };
    }

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) =>
          console.warn('SW registration failed:', err)
        );
      });
    }

    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (err) {
    console.error('BOOT FAILED:', err);
    document.getElementById('root').innerHTML =
      '<div style="padding:16px">Startup failed. Check console.</div>';
  }
}

bootstrap();
