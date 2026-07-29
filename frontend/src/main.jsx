import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n/config';
import './index.css';

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
          useStore.getState().loginWithToken(res.user, res.token);
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
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    console.error('BOOT FAILED:', err);
    document.getElementById('root').innerHTML =
      '<div style="padding:16px">Startup failed. Check console.</div>';
  }
}

bootstrap();