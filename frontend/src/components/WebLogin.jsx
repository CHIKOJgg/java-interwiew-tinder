import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';

/**
 * Standalone web login (used when the app is opened outside Telegram).
 * Supports Google One Tap (if enabled) and email magic-link.
 * On success calls onAuthenticated(user, token).
 */
export default function WebLogin({ referralId, onAuthenticated, onBack, initialMode = 'email' }) {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState(initialMode || 'email'); // 'email' | 'sync' | 'google'
  const [syncCode, setSyncCode] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('request'); // 'request' | 'verify'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (mode === 'google' && !window.google?.accounts?.id) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      return () => { document.head.removeChild(script); };
    }
  }, [mode]);

  const handleSyncVerify = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiClient.verifySyncCode({ code: syncCode.trim() });
      onAuthenticated(res.user, res.token, res);
    } catch (err) {
      setError(err.message || (i18n.language === 'ru' ? 'Неверный или просроченный код синхронизации' : 'Invalid or expired sync code'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiClient.sendEmailCode(email);
      setStep('verify');
    } catch (err) {
      setError(err.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiClient.verifyEmailCode(email, code, referralId);
      onAuthenticated(res.user, res.token, res);
    } catch (err) {
      setError(err.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleGooglePrompt = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    }
  };

  const isGoogleEnabled = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <div className="web-login">
      <h1>{t('auth.web_title', 'Sign in')}</h1>
      <p className="web-login-sub">{t('auth.web_subtitle', 'Sign in to practice interview questions')}</p>

      {error && <div className="web-login-error">{error}</div>}

      <div className="web-login-tabs">
        <button className={mode === 'sync' ? 'active' : ''} onClick={() => { setMode('sync'); setError(null); }}>
          📱 {t('auth.by_sync', 'Код с телефона')}
        </button>
        <button className={mode === 'email' ? 'active' : ''} onClick={() => { setMode('email'); setError(null); }}>
          ✉️ {t('auth.by_email', 'Email')}
        </button>
        {isGoogleEnabled && (
          <button className={mode === 'google' ? 'active' : ''} onClick={() => { setMode('google'); setError(null); }}>
            Google
          </button>
        )}
      </div>

      {mode === 'sync' && (
        <form onSubmit={handleSyncVerify} className="web-login-sync-form" style={{ marginTop: 16 }}>
          <p style={{ fontSize: 14, color: 'var(--ink-soft, #666)', marginBottom: 16, lineHeight: 1.5 }}>
            {t('auth.sync_hint', 'Откройте приложение в Telegram на телефоне: Профиль → Синхронизация с ПК, и введите 6-значный код.')}
          </p>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            required
            autoFocus
            style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center', fontWeight: 'bold' }}
            placeholder="123456"
            value={syncCode}
            onChange={(e) => setSyncCode(e.target.value.replace(/\D/g, ''))}
          />
          <button type="submit" disabled={loading || syncCode.length < 6} style={{ marginTop: 12 }}>
            {loading ? t('common.loading', 'Loading…') : t('auth.sync_submit', 'Войти')}
          </button>
        </form>
      )}

      {mode === 'email' && (
        step === 'request' ? (
          <form onSubmit={handleSendCode}>
            <input
              type="email"
              required
              placeholder={t('auth.email_placeholder', 'you@example.com')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" disabled={loading}>
              {loading ? t('common.loading', 'Loading…') : t('auth.send_code', 'Send code')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
            <p>{t('auth.code_sent', 'We sent a 6-digit code to {{email}}', { email })}</p>
            <input
              inputMode="numeric"
              required
              placeholder={t('auth.code_placeholder', '123456')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button type="submit" disabled={loading}>
              {loading ? t('common.loading', 'Loading…') : t('auth.verify', 'Verify')}
            </button>
            <button type="button" className="link" onClick={() => setStep('request')}>
              {t('auth.use_another', 'Use another email')}
            </button>
          </form>
        )
      )}

      {mode === 'google' && (
        <div className="web-login-google">
          <div id="g_id_onload"
            data-client_id={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}
            data-callback="__jitGoogleCallback"
            data-auto_prompt="true" />
          <div className="g_id_signin" data-type="standard" data-size="large" />
          <button type="button" className="web-login-fallback" onClick={() => handleGooglePrompt()}>
            {t('auth.continue_google', 'Continue with Google')}
          </button>
          {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
            <p className="web-login-hint">{t('auth.google_disabled', 'Google sign-in is not configured')}</p>
          )}
        </div>
      )}

      {onBack && (
        <button type="button" className="link" onClick={onBack}>
          {t('common.back', 'Back')}
        </button>
      )}
    </div>
  );
}
