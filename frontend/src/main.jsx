import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

window.addEventListener('error', (e) => {
  console.error('GLOBAL ERROR:', e.error || e.message);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('UNHANDLED PROMISE REJECTION:', e.reason);
});

console.log('BOOT: main.jsx started');

async function bootstrap() {
  try {
    const { default: App } = await import('./App');

    console.log('BOOT: App imported');

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