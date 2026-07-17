import React from 'react';
import useStore from '../store/useStore';
import { useTranslation } from 'react-i18next';
import { useModalA11y } from '../utils/useModalA11y';
import { Lock, Star, Zap, X, Check, Mic, Bug, Braces, Link2 } from 'lucide-react';
import './PaywallModal.css';

const MODE_META = {
  'bug-hunting': { icon: Bug, key: 'modes.bug_hunting' },
  'blitz': { icon: Zap, key: 'modes.blitz' },
  'mock-interview': { icon: Mic, key: 'modes.mock_interview' },
  'concept-linker': { icon: Link2, key: 'modes.concept_linker' },
  'code-completion': { icon: Braces, key: 'modes.code_completion' },
};

const BULLETS = ['bullet_1', 'bullet_2', 'bullet_3', 'bullet_4'];

const PaywallModal = ({ onUpgrade }) => {
  const { t } = useTranslation();
  const { paywall, closePaywall } = useStore();
  const dialogRef = useModalA11y(closePaywall);

  if (!paywall?.open) return null;

  const meta = MODE_META[paywall.mode];
  const ModeIcon = meta?.icon || Star;
  const modeLabel = meta ? t(meta.key) : '';

  return (
    <div className="paywall-overlay" onClick={closePaywall}>
      <div
        className="paywall-card"
        role="dialog"
        aria-modal="true"
        aria-label={t('paywall.title', 'This mode is Pro-only')}
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="paywall-close" onClick={closePaywall} type="button" aria-label="close">
          <X size={18} />
        </button>

        <div className="paywall-hero">
          <div className="paywall-lock-ring">
            <Lock size={26} />
          </div>
          <div className="paywall-mode-chip">
            <ModeIcon size={16} />
            <span>{modeLabel}</span>
          </div>
        </div>

        <h2 className="paywall-title">{t('paywall.title')}</h2>
        <p className="paywall-subtitle">
          {modeLabel
            ? t('paywall.locked_mode', { mode: modeLabel })
            : t('paywall.subtitle')}
        </p>
        <p className="paywall-subtitle muted">{t('paywall.subtitle')}</p>

        <div className="paywall-why">
          <span className="paywall-why-title"><Star size={13} fill="#ffd43b" /> {t('paywall.why_title')}</span>
          <ul className="paywall-bullets">
            {BULLETS.map((b) => (
              <li key={b}><Check size={15} className="paywall-check" /> {t(`paywall.${b}`)}</li>
            ))}
          </ul>
        </div>

        <button className="paywall-cta" onClick={onUpgrade} type="button">
          <Star size={18} fill="#1a1d29" /> {t('paywall.cta')}
        </button>
        <button className="paywall-later" onClick={closePaywall} type="button">{t('paywall.later')}</button>
      </div>
    </div>
  );
};

export default PaywallModal;
