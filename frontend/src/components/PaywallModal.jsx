import React from 'react';
import useStore from '../store/useStore';
import { useTranslation } from 'react-i18next';
import { useModalA11y } from '../utils/useModalA11y';
import { Lock, Star, Zap, X, Check, Mic, Bug, Braces, Link2, TrendingUp, Shield } from 'lucide-react';
import './PaywallModal.css';

const MODE_META = {
  'bug-hunting': { icon: Bug, key: 'modes.bug_hunting' },
  'blitz': { icon: Zap, key: 'modes.blitz' },
  'mock-interview': { icon: Mic, key: 'modes.mock_interview' },
  'concept-linker': { icon: Link2, key: 'modes.concept_linker' },
  'code-completion': { icon: Braces, key: 'modes.code_completion' },
  'system-design': { icon: TrendingUp, key: 'modes.system_design' },
};

const COMPARE_ROWS = [
  { labelKey: 'paywall.comp_modes', free: '2', pro: '8' },
  { labelKey: 'paywall.comp_questions', free: '40/day', pro: 'Unlimited' },
  { labelKey: 'paywall.comp_ai', free: '3/day', pro: 'Unlimited' },
  { labelKey: 'paywall.comp_mock', free: <X size={14} />, pro: <Check size={14} /> },
  { labelKey: 'paywall.comp_review', free: <X size={14} />, pro: <Check size={14} /> },
  { labelKey: 'paywall.comp_resume', free: <X size={14} />, pro: <Check size={14} /> },
];

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

        <h2 className="paywall-title">{modeLabel ? t('paywall.locked_mode', { mode: modeLabel }) : t('paywall.title')}</h2>
        <p className="paywall-subtitle">{t('paywall.subtitle')}</p>

        {/* ── Comparison table ─────────────────────────────────── */}
        <div className="paywall-compare">
          <div className="paywall-compare-row header">
            <span />
            <span className="paywall-compare-free">Free</span>
            <span className="paywall-compare-pro">Pro</span>
          </div>
          {COMPARE_ROWS.map((row, i) => (
            <div className="paywall-compare-row" key={i}>
              <span className="paywall-compare-label">{t(row.labelKey)}</span>
              <span className="paywall-compare-free">{row.free}</span>
              <span className="paywall-compare-pro">{row.pro}</span>
            </div>
          ))}
        </div>

        {/* ── Trial CTA ────────────────────────────────────────── */}
        <button className="paywall-cta" onClick={onUpgrade} type="button">
          <Star size={18} fill="#1a1d29" /> {t('paywall.cta')}
        </button>
        <p className="paywall-trial-note"><Shield size={12} /> {t('paywall.trial_note', '7-day free trial · Cancel anytime · No card needed')}</p>
        <button className="paywall-later" onClick={closePaywall} type="button">{t('paywall.later')}</button>
      </div>
    </div>
  );
};

export default PaywallModal;