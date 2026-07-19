import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';

/**
 * Standalone web login (used when the app is opened outside Telegram).
 * Supports Google One Tap (if enabled) and email magic-link.
 * On success calls onAuthenticated(user, token).
 */
export default function WebLogin({ referralId, onAuthenticated, onBack }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState('email'); // 'email' | 'google'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('request'); // 'request' | 'verify'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      onAuthenticated(res.user, res.token);
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

  return (
    <div className="web-login">
      <h1>{t('auth.connecting', 'Interview Tinder')}</h1>
      <p className="web-login-sub">{t('auth.web_subtitle', 'Sign in to practice interview questions')}</p>

      {error && <div className="web-login-error">{error}</div>}

      <div className="web-login-tabs">
        <button className={mode === 'email' ? 'active' : ''} onClick={() => setMode('email')}>
          {t('auth.by_email', 'Email')}
        </button>
        <button className={mode === 'google' ? 'active' : ''} onClick={() => setMode('google')}>
          Google
        </button>
      </div>

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
