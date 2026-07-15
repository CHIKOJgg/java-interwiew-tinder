import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, ThumbsDown, Hand, Rocket, Sparkles, Settings2, Check, ArrowRight } from 'lucide-react';
import './Onboarding.css';

// First-run explainer. Shown once (persisted in localStorage) so new users
// immediately understand the product: what they'll DO (swipe, pick topics)
// and what they'll GET (AI breakdowns, progress, Pro). Designed as a short
// checklist so the user taps through every key action and knows the outcome.
const ONBOARD_KEY = 'jit_onboarded';

const STEPS = [
  { id: 'setup', icon: Settings2 },
  { id: 'know',  icon: ThumbsUp },
  { id: 'dont',  icon: ThumbsDown },
  { id: 'tap',   icon: Hand },
  { id: 'pro',   icon: Rocket },
];

const Onboarding = ({ onStart }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  const finish = () => {
    try { localStorage.setItem(ONBOARD_KEY, '1'); } catch { /* ignore */ }
    onStart();
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  };
  const back = () => setStep(s => Math.max(s - 1, 0));
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div className="onboarding">
      <div className="onboarding-inner">
        <div className="onb-head">
          <h1>{t('onboarding.title')}</h1>
          <p className="onboarding-sub">{t('onboarding.subtitle')}</p>
        </div>

        {/* Checklist — the whole plan is visible up front */}
        <ul className="onb-checklist">
          {STEPS.map((s, i) => (
            <li
              key={s.id}
              className={`onb-check ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}`}
              onClick={() => i <= step && setStep(i)}
            >
              <span className="onb-check-mark">
                {i < step ? <Check size={14} /> : i + 1}
              </span>
              <span className="onb-check-label">{t(`onboarding.step_${s.id}`)}</span>
            </li>
          ))}
        </ul>

        {/* Detail for the current checklist item */}
        <div className="onb-stage">
          <div className={`onb-hero-emoji ${current.id}`}>
            <current.icon size={44} />
          </div>
          <h2>{t(`onboarding.step_${current.id}`)}</h2>
          <p className="onboarding-sub">{t(`onboarding.step_${current.id}_desc`)}</p>

          {(current.id === 'know' || current.id === 'dont') && (
            <div className="onb-swipe-demo">
              <div className="onb-swipe-chip know"><ThumbsUp size={20} />{t('card.know')}</div>
              <div className="onb-swipe-chip dont"><ThumbsDown size={20} />{t('card.dont_know')}</div>
            </div>
          )}

          {current.id === 'pro' && (
            <div className="onb-pro-pill"><Sparkles size={16} /> PRO</div>
          )}
        </div>

        {/* Progress + navigation */}
        <div className="onb-progress">
          <div className="onb-progress-bar">
            <span style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
          </div>
          <span className="onb-progress-text">{step + 1} / {STEPS.length}</span>
        </div>

        <div className="onb-nav">
          {step > 0 ? (
            <button className="onboarding-back" onClick={back} type="button">
              {t('onboarding.back')}
            </button>
          ) : (
            <button className="onboarding-skip" onClick={finish} type="button">
              {t('onboarding.skip')}
            </button>
          )}
          <button className="onboarding-start" onClick={next} type="button">
            {isLast ? t('onboarding.start') : t('onboarding.next')} <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
export { ONBOARD_KEY };
