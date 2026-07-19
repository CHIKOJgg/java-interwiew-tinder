import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

/**
 * PWA install prompt. Captures the native `beforeinstallprompt` event (fired
 * once by the browser when the app is installable) and shows a dismissible
 * banner to invite the user to add the app to their home screen.
 *
 * Shown only after the user has done at least one session (caller controls
 * `show`), so we don't nag on first open.
 */
export default function PwaInstallPrompt({ show }) {
  const { t } = useTranslation();
  const [deferred, setDeferred] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => {
      // Prevent the mini-infobar from appearing automatically.
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!show || dismissed || !deferred) return null;

  const install = async () => {
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setDismissed(true);
  };

  return (
    <div className="pwa-install">
      <div className="pwa-install-text">
        <strong>{t('pwa.install_title', 'Install Interview Tinder')}</strong>
        <span>{t('pwa.install_sub', 'Add to home screen for quick access — works offline.')}</span>
      </div>
      <button className="pwa-install-btn" onClick={install}>
        {t('pwa.install', 'Install')}
      </button>
      <button className="pwa-install-close" aria-label="Dismiss" onClick={() => setDismissed(true)}>
        <X size={16} />
      </button>
    </div>
  );
}
