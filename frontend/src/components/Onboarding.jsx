import React from 'react';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, ThumbsDown, Hand, ArrowRight } from 'lucide-react';
import './Onboarding.css';

// First-run explainer. Shown once (persisted in localStorage) so new users
// immediately understand the swipe mechanic instead of guessing which way
// means "know" vs "don't know".
const ONBOARD_KEY = 'jit_onboarded';

const Onboarding = ({ onStart }) => {
  const { t } = useTranslation();

  const handleStart = () => {
    try { localStorage.setItem(ONBOARD_KEY, '1'); } catch { /* ignore */ }
    onStart();
  };

  return (
    <div className="onboarding">
      <div className="onboarding-inner">
        <div className="onboarding-hero">
          <span className="onboarding-emoji">💡</span>
          <h1>{t('onboarding.title')}</h1>
          <p className="onboarding-sub">{t('onboarding.subtitle')}</p>
        </div>

        <div className="onboarding-steps">
          <div className="onb-step">
            <div className="onb-step-icon know"><ThumbsUp size={26} /></div>
            <div className="onb-step-text">
              <strong>{t('onboarding.step_know')}</strong>
              <span>{t('onboarding.step_know_desc')}</span>
            </div>
          </div>

          <div className="onb-step">
            <div className="onb-step-icon dont"><ThumbsDown size={26} /></div>
            <div className="onb-step-text">
              <strong>{t('onboarding.step_dont')}</strong>
              <span>{t('onboarding.step_dont_desc')}</span>
            </div>
          </div>

          <div className="onb-step">
            <div className="onb-step-icon tap"><Hand size={26} /></div>
            <div className="onb-step-text">
              <strong>{t('onboarding.step_tap')}</strong>
              <span>{t('onboarding.step_tap_desc')}</span>
            </div>
          </div>
        </div>

        <button className="onboarding-start" onClick={handleStart} type="button">
          {t('onboarding.start')} <ArrowRight size={18} />
        </button>
        <button className="onboarding-skip" onClick={handleStart} type="button">
          {t('onboarding.skip')}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
export { ONBOARD_KEY };
