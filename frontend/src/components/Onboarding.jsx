import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, ThumbsDown, ArrowRight, Sparkles, Flame, Layers, Rocket } from 'lucide-react';
import './Onboarding.css';

// First-run explainer. Shown once (persisted in localStorage) so new users
// immediately understand the product value and the core mechanics instead of
// guessing which way means "know" vs "don't know".
const ONBOARD_KEY = 'jit_onboarded';

const SLIDES = 5;

const MODES = [
  { id: 'swipe', emoji: '📇' },
  { id: 'test', emoji: '🎓' },
  { id: 'bug-hunting', emoji: '🐞' },
  { id: 'blitz', emoji: '⚡' },
  { id: 'mock-interview', emoji: '🎤' },
  { id: 'code-completion', emoji: '💻' },
];

const Onboarding = ({ onStart }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  const handleStart = () => {
    try { localStorage.setItem(ONBOARD_KEY, '1'); } catch { /* ignore */ }
    onStart();
  };

  const next = () => setStep(s => Math.min(s + 1, SLIDES - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));
  const isLast = step === SLIDES - 1;

  return (
    <div className="onboarding">
      <div className="onboarding-inner">
        <div className="onboarding-stage">
          {step === 0 && (
            <div className="onb-slide">
              <div className="onb-hero-emoji"><Rocket size={56} /></div>
              <h1>{t('onboarding.title')}</h1>
              <p className="onboarding-sub">{t('onboarding.hero_sub')}</p>
            </div>
          )}

          {step === 1 && (
            <div className="onb-slide">
              <span className="onboarding-emoji">👉</span>
              <h2>{t('onboarding.swipe_title')}</h2>
              <p className="onboarding-sub">{t('onboarding.swipe_desc')}</p>
              <div className="onb-swipe-demo">
                <div className="onb-swipe-chip dont"><ThumbsDown size={22} />{t('card.dont_know')}</div>
                <div className="onb-swipe-chip know"><ThumbsUp size={22} />{t('card.know')}</div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="onb-slide">
              <div className="onb-hero-emoji ai"><Sparkles size={52} /></div>
              <h2>{t('onboarding.ai_title')}</h2>
              <p className="onboarding-sub">{t('onboarding.ai_desc')}</p>
            </div>
          )}

          {step === 3 && (
            <div className="onb-slide">
              <div className="onb-hero-emoji modes"><Layers size={52} /></div>
              <h2>{t('onboarding.modes_title')}</h2>
              <p className="onboarding-sub">{t('onboarding.modes_desc')}</p>
              <div className="onb-mode-grid">
                {MODES.map(m => (
                  <div key={m.id} className="onb-mode-chip">
                    <span className="onb-mode-emoji">{m.emoji}</span>
                    <span>{t(`modes.${m.id}`)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="onb-slide">
              <div className="onb-hero-emoji progress"><Flame size={52} /></div>
              <h2>{t('onboarding.progress_title')}</h2>
              <p className="onboarding-sub">{t('onboarding.progress_desc')}</p>
            </div>
          )}
        </div>

        <div className="onb-dots">
          {Array.from({ length: SLIDES }).map((_, i) => (
            <span key={i} className={`onb-dot ${i === step ? 'active' : ''}`} />
          ))}
        </div>

        <div className="onb-nav">
          {step > 0 ? (
            <button className="onboarding-back" onClick={back} type="button">
              {t('onboarding.back')}
            </button>
          ) : (
            <button className="onboarding-skip" onClick={handleStart} type="button">
              {t('onboarding.skip')}
            </button>
          )}

          {isLast ? (
            <button className="onboarding-start" onClick={handleStart} type="button">
              {t('onboarding.start')} <ArrowRight size={18} />
            </button>
          ) : (
            <button className="onboarding-start" onClick={next} type="button">
              {t('onboarding.next')} <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
export { ONBOARD_KEY };
