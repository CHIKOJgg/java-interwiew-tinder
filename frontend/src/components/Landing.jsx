import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Landing.css';

/**
 * Public landing page shown to visitors who open the app outside Telegram
 * and are not yet authenticated. Drives organic traffic (SEO + social share
 * previews) and funnels the visitor into one of two surfaces:
 *   - the Telegram Mini App (opens t.me/<bot>), or
 *   - the installable PWA on web/mobile (captures beforeinstallprompt).
 * Both paths share one account; progress follows the user across surfaces.
 */
export default function Landing({ onStart }) {
  const { t } = useTranslation();

  // ─── Telegram Mini App link ──────────────────────────────────────
  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'JavaInterviewTinderBot';
  const miniAppUrl = import.meta.env.VITE_TELEGRAM_MINIAPP_URL || `https://t.me/${botUsername}`;

  // ─── PWA install (capture the native beforeinstallprompt event) ──
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const installPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const features = [
    { icon: '🎯', title: t('landing.f_swipe', 'Know what they\'ll ask'), text: t('landing.f_swipe_d', 'Real questions from real Java interviews — not random trivia.') },
    { icon: '⚡', title: t('landing.f_modes', 'Fix weak spots fast'), text: t('landing.f_modes_d', 'Swipe left on anything you don\'t know and get an instant AI breakdown.') },
    { icon: '🔁', title: t('landing.f_streak', 'Remember it on interview day'), text: t('landing.f_streak_d', 'Spaced repetition resurfaces what you forget — so it sticks.') },
    { icon: '📊', title: t('landing.f_percentile', 'Know when you\'re ready'), text: t('landing.f_percentile_d', 'A readiness score vs other candidates tells you if you\'re good to go.') },
  ];

  const plans = [
    { id: 'free', name: t('landing.plan_free', 'Free'), price: '$0', period: '', features: [
      t('landing.free_f1', 'Swipe & Test modes'),
      t('landing.free_f2', '40 questions / day'),
      t('landing.free_f3', '3 AI explanations / day'),
    ] },
    { id: 'pro', name: t('landing.plan_pro', 'Pro'), price: '$9.99', period: t('landing.per_month', '/mo'), highlight: true, features: [
      t('landing.pro_f1', 'Every practice mode unlocked'),
      t('landing.pro_f2', 'Unlimited AI breakdowns'),
      t('landing.pro_f3', 'Mock interview & resume review'),
      t('landing.pro_f4', 'Readiness score & daily streak'),
    ] },
  ];

  const faqs = [
    { q: t('landing.faq1_q', 'Do I need to install anything?'), a: t('landing.faq1_a', 'No. You can open Interview Tinder right inside Telegram, or play on the web — no download required. Install it as an app later if you want it on your home screen.') },
    { q: t('landing.faq2_q', 'Is it really free?'), a: t('landing.faq2_a', 'Yes — the Free plan gives you 40 questions a day and 3 AI explanations, forever. Pro unlocks every mode and unlimited AI breakdowns.') },
    { q: t('landing.faq3_q', 'Which languages are covered?'), a: t('landing.faq3_a', 'Java, Python and TypeScript — with questions spanning core syntax, data structures, concurrency, system design and framework internals.') },
    { q: t('landing.faq4_q', 'Will my progress sync?'), a: t('landing.faq4_a', 'Yes. Sign in with Telegram or email and your streak, readiness score and saved questions follow you across the Mini App and the web/PWA.') },
  ];

  return (
    <div className="landing">
      {/* ── Top nav ─────────────────────────────────────────────── */}
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <img className="landing-logo-sm" src="/icon.svg" alt="Interview Tinder" width="32" height="32" />
          <span>Interview Tinder</span>
        </div>
        <a className="landing-nav-tg" href={miniAppUrl} target="_blank" rel="noopener noreferrer">
          {t('landing.open_tg', 'Open in Telegram')}
        </a>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <header className="landing-hero">
        <span className="landing-pill">🃏 Interview prep that feels like a game</span>
        <h1>{t('landing.title', 'Don\'t walk into your Java interview unprepared')}</h1>
        <p className="landing-tagline">
          {t('landing.tagline', 'Practice real interview questions 10 minutes a day. Swipe what you know, get an instant AI breakdown of what you don\'t — and walk in ready.')}
        </p>
        <div className="landing-hero-cta">
          <button className="landing-cta" onClick={onStart}>
            {t('landing.cta', 'Start practicing free')} →
          </button>
          <a className="landing-cta landing-cta--ghost" href={miniAppUrl} target="_blank" rel="noopener noreferrer">
            {t('landing.open_tg', 'Open in Telegram')}
          </a>
        </div>
        <p className="landing-sub">
          {t('landing.sub', 'No card required · start in 30 seconds · Java, Python & TypeScript')}
        </p>
      </header>

      {/* ── Social proof strip ──────────────────────────────────── */}
      <div className="landing-stats">
        <div className="landing-stat">
          <strong>12k+</strong>
          <span>{t('landing.stat_candidates', 'candidates practicing')}</span>
        </div>
        <div className="landing-stat">
          <strong>500+</strong>
          <span>{t('landing.stat_questions', 'real interview questions')}</span>
        </div>
        <div className="landing-stat">
          <strong>3</strong>
          <span>{t('landing.stat_langs', 'languages: Java · Python · TS')}</span>
        </div>
      </div>

      {/* ── Features ────────────────────────────────────────────── */}
      <section className="landing-features">
        {features.map((f) => (
          <div className="landing-feature" key={f.title}>
            <div className="landing-feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </div>
        ))}
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section className="landing-how">
        <h2>{t('landing.how_title', 'From "I hope they don\'t ask that" to "bring it on"')}</h2>
        <ol>
          <li>{t('landing.how_1', 'Pick your language and the topics you\'re weakest on.')}</li>
          <li>{t('landing.how_2', 'Swipe through real interview questions — 10 minutes feels like a game.')}</li>
          <li>{t('landing.how_3', 'Every gap gets an instant AI explanation, so you never stay stuck.')}</li>
          <li>{t('landing.how_4', 'Your readiness score climbs until you know you\'re interview-ready.')}</li>
        </ol>
      </section>

      {/* ── Get the app: two funnels (Mini App + PWA) ───────────── */}
      <section className="landing-getapp">
        <h2>{t('landing.getapp_title', 'Get Interview Tinder your way')}</h2>
        <p className="landing-getapp-sub">
          {t('landing.getapp_sub', 'Use it as a Telegram Mini App or install it as a PWA on your phone — same account, your progress follows you.')}
        </p>
        <div className="landing-apps">
          <div className="landing-app-card">
            <div className="landing-app-icon">✈️</div>
            <h3>{t('landing.app_tg_title', 'Telegram Mini App')}</h3>
            <p>{t('landing.app_tg_desc', 'Opens instantly inside Telegram — desktop or mobile, no install needed.')}</p>
            <a className="landing-app-btn" href={miniAppUrl} target="_blank" rel="noopener noreferrer">
              {t('landing.app_tg_btn', 'Open in Telegram')}
            </a>
          </div>
          <div className="landing-app-card">
            <div className="landing-app-icon">📲</div>
            <h3>{t('landing.app_pwa_title', 'Install as app (PWA)')}</h3>
            <p>{t('landing.app_pwa_desc', 'Add to your home screen. Works offline, feels native, lives next to your other apps.')}</p>
            {installed ? (
              <button className="landing-app-btn" disabled>✓ {t('landing.app_pwa_installed', 'App installed')}</button>
            ) : deferredPrompt ? (
              <button className="landing-app-btn" onClick={installPwa}>
                {t('landing.app_pwa_btn', 'Install app')}
              </button>
            ) : (
              <span className="landing-app-hint">{t('landing.app_pwa_hint', 'Tap your browser menu → "Add to Home Screen"')}</span>
            )}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────── */}
      <section className="landing-pricing">
        <h2>{t('landing.pricing_title', 'Simple pricing')}</h2>
        <div className="landing-plans">
          {plans.map((plan) => (
            <div className={`landing-plan${plan.highlight ? ' landing-plan--pro' : ''}`} key={plan.id}>
              {plan.highlight && <div className="landing-plan-badge">{t('landing.most_popular', 'Most popular')}</div>}
              <h3>{plan.name}</h3>
              <div className="landing-plan-price">
                <span className="landing-plan-amount">{plan.price}</span>
                <span className="landing-plan-period">{plan.period}</span>
              </div>
              <ul>
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button className="landing-cta" onClick={onStart}>
                {t('landing.choose', 'Choose {plan}', { plan: plan.name })} →
              </button>
            </div>
          ))}
        </div>
        <p className="landing-pricing-note">
          {t('landing.pricing_note', 'Cancel anytime · also available for 450 Telegram Stars / month.')}
        </p>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section className="landing-faq">
        <h2>{t('landing.faq_title', 'Questions, answered')}</h2>
        <div className="landing-faq-list">
          {faqs.map((item, i) => (
            <details className="landing-faq-item" key={i}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section className="landing-final">
        <h2>{t('landing.final_title', 'Ready to walk in confident?')}</h2>
        <p>{t('landing.final_sub', '10 free minutes a day is all it takes.')}</p>
        <div className="landing-hero-cta">
          <button className="landing-cta" onClick={onStart}>
            {t('landing.cta', 'Start practicing free')} →
          </button>
          <a className="landing-cta landing-cta--ghost" href={miniAppUrl} target="_blank" rel="noopener noreferrer">
            {t('landing.open_tg', 'Open in Telegram')}
          </a>
        </div>
      </section>

      <footer className="landing-footer">
        <p className="landing-copy">© {new Date().getFullYear()} Interview Tinder</p>
      </footer>
    </div>
  );
}
