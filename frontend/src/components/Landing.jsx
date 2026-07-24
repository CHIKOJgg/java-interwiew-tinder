import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Landing.css';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function Landing({ onStart }) {
  const { t } = useTranslation();

  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'JavaInterviewTinderBot';
  const miniAppUrl = import.meta.env.VITE_TELEGRAM_MINIAPP_URL || `https://t.me/${botUsername}`;

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [publicStats, setPublicStats] = useState(null);
  const [scrolledPast, setScrolledPast] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/public/stats`)
      .then(r => r.json())
      .then(d => setPublicStats(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolledPast(window.scrollY > window.innerHeight * 0.6);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferredPrompt(e); };
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

  const painPoints = [
    { icon: '😰', title: t('landing.pain1', 'You studied the wrong things'), desc: t('landing.pain1_d', 'Endless LeetCode and random lists. Then they ask about garbage collection or volatile and you freeze.') },
    { icon: '🤫', title: t('landing.pain2', 'You get zero feedback'), desc: t('landing.pain2_d', 'Reading an answer isn\'t understanding it. Without a plain explanation, you repeat the same mistake.') },
    { icon: '🎯', title: t('landing.pain3', 'You never know when you\'re ready'), desc: t('landing.pain3_d', 'Cramming forever isn\'t a plan. You need to know confidently that you\'re ready to book the interview.') },
    { icon: '💸', title: t('landing.pain4', 'Each failed interview costs you'), desc: t('landing.pain4_d', 'Wasted prep time, lost confidence, delayed career moves, and sometimes the offer goes to someone who prepared smarter.') },
  ];

  const features = [
    { icon: '💞', title: t('landing.f_swipe', 'Know exactly what they\'ll ask'), text: t('landing.f_swipe_d', 'Real questions from real Java, Python & TypeScript interviews — not random trivia.') },
    { icon: '🤖', title: t('landing.f_modes', 'Never get stuck on a blank'), text: t('landing.f_modes_d', 'Swipe left on anything you don\'t know and get an instant, plain-language AI breakdown.') },
    { icon: '🔁', title: t('landing.f_streak', 'Remember it on interview day'), text: t('landing.f_streak_d', 'Spaced repetition brings weak topics back right before you\'d forget — so it\'s there when it counts.') },
    { icon: '📊', title: t('landing.f_percentile', 'Know when you\'re ready'), text: t('landing.f_percentile_d', 'A readiness score vs other candidates tells you if you\'re good to go.') },
    { icon: '🎤', title: t('landing.f_mock', 'Rehearse the real thing'), text: t('landing.f_mock_d', 'Timed, AI-graded Mock Interview. Kill the panic before the real one.') },
    { icon: '🐞', title: t('landing.f_modes2', 'Train every angle'), text: t('landing.f_modes2_d', '7 modes — Swipe, Test, Bug Hunting, Blitz, Code Completion, Concept Linker, Mock.') },
  ];

  const mathItems = [
    { icon: '☕', num: '$0.33/day', label: t('landing.math1', 'Less than a coffee — PRO plan') },
    { icon: '💰', num: '$5k-$30k', label: t('landing.math2', 'Avg salary jump after the offer') },
    { icon: '⏱️', num: '10 min/day', label: t('landing.math3', 'Less time than your morning scroll') },
    { icon: '📈', num: '2-3 weeks', label: t('landing.math4', 'Average time to interview-ready') },
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
    { q: t('landing.faq1_q', 'Do I need to install anything?'), a: t('landing.faq1_a', 'No. You can open Interview Tinder right inside Telegram, or play on the web — no download required.') },
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
      <header className="landing-hero" role="banner">
        <span className="landing-pill">🔥 {t('landing.pill', 'Real questions from real interviews · 3 languages · no fluff')}</span>
        <h1>{t('landing.title', 'You know how to code.')}&nbsp;<span className="landing-hl">{t('landing.title_hl', 'One forgotten question')}<br/>{t('landing.title_hl2', 'shouldn\'t cost you the offer.')}</span></h1>
        <p className="landing-tagline">
          {t('landing.tagline', 'Interview Tinder drills you on the exact questions companies ask, explains every gap instantly with AI, and shows your real readiness score. 10 minutes a day — free.')}
        </p>
        <div className="landing-hero-cta">
          <button className="landing-cta landing-cta--green" onClick={onStart}>
            {t('landing.cta', 'Try a real question free')} →
          </button>
          <a className="landing-cta landing-cta--ghost" href={miniAppUrl} target="_blank" rel="noopener noreferrer">
            {t('landing.open_tg', 'Open in Telegram')}
          </a>
        </div>
        <div className="landing-trust">
          <span>✓ <b>{t('landing.trust1', 'No card')}</b></span>
          <span>✓ <b>7-day</b> {t('landing.trust2', 'PRO trial')}</span>
          <span>✓ <b>{t('landing.trust3', 'Real')}</b> {t('landing.trust4', 'questions, not trivia')}</span>
        </div>
      </header>

      {/* ── Social proof ──────────────────────────────────────── */}
      <div className="landing-stats">
        <div className="landing-stat">
          <strong>{(publicStats?.users ?? 12000).toLocaleString()}+</strong>
          <span>{t('landing.stat_candidates', 'candidates practicing')}</span>
        </div>
        <div className="landing-stat">
          <strong>{(publicStats?.questions ?? 1000).toLocaleString()}+</strong>
          <span>{t('landing.stat_questions', 'real interview questions')}</span>
        </div>
        <div className="landing-stat">
          <strong>3</strong>
          <span>{t('landing.stat_langs', 'languages: Java · Python · TS')}</span>
        </div>
      </div>

      {/* ── Prepare for interviews at ───────────────────────── */}
      <div className="landing-companies">
        <span className="landing-companies-label">{t('landing.used_by', 'Prepare for interviews at')}</span>
        <div className="landing-companies-logos">
          {['Google', 'Amazon', 'Meta', 'Microsoft', 'Apple'].map(name => (
            <span key={name} className="landing-company-logo">{name}</span>
          ))}
        </div>
      </div>

      {/* ── The Real Cost ─────────────────────────────────────── */}
      <section className="landing-cost">
        <h2>{t('landing.cost_title', 'The real cost of "I\'ll prepare later"')}</h2>
        <p className="landing-cost-sub">{t('landing.cost_sub', 'It\'s not about being a bad developer. It\'s about what happens when preparation meets luck — and luck runs out.')}</p>
        <div className="landing-cost-grid">
          <div className="landing-cost-visual">
            <div className="landing-cost-big">73%</div>
            <div className="landing-cost-big-lbl">{t('landing.cost_stat', 'of developers say they\'ve failed an interview despite knowing the material')}</div>
          </div>
          <div className="landing-cost-list">
            {painPoints.map((p, i) => (
              <div className="landing-cost-item" key={i}>
                <span className="landing-cost-icon">{p.icon}</span>
                <div>
                  <b>{p.title}</b>
                  <p>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section className="landing-features-section">
        <h2>{t('landing.features_title', 'Everything you need to get the offer')}</h2>
        <p className="landing-features-sub">{t('landing.features_sub', 'Every feature exists to make the answer stick — and to prove you\'re ready.')}</p>
        <div className="landing-features">
          {features.map((f) => (
            <div className="landing-feature" key={f.title}>
              <div className="landing-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section className="landing-how">
        <h2>{t('landing.how_title', 'From "I hope they don\'t ask that" to "bring it on"')}</h2>
        <div className="landing-steps">
          <div className="landing-step">
            <div className="landing-step-num">1</div>
            <h3>{t('landing.how_1_title', 'See')}</h3>
            <p>{t('landing.how_1', 'Land on a real interview question instantly — no signup wall.')}</p>
          </div>
          <div className="landing-step">
            <div className="landing-step-num">2</div>
            <h3>{t('landing.how_2_title', 'Try')}</h3>
            <p>{t('landing.how_2', 'Swipe a deck, get instant AI help, watch your readiness score climb.')}</p>
          </div>
          <div className="landing-step">
            <div className="landing-step-num">3</div>
            <h3>{t('landing.how_3_title', 'Know')}</h3>
            <p>{t('landing.how_3', 'Hit your readiness target — or unlock Mock Interview when you\'re ready.')}</p>
          </div>
        </div>
      </section>

      {/* ── The Math ─────────────────────────────────────────── */}
      <section className="landing-math">
        <h2>{t('landing.math_title', 'The math of getting the offer')}</h2>
        <p className="landing-math-sub">{t('landing.math_sub', 'Interview Tinder isn\'t a cost — it\'s the highest-ROI investment in your career this year.')}</p>
        <div className="landing-math-grid">
          {mathItems.map((m, i) => (
            <div className="landing-math-item" key={i}>
              <div className="landing-math-icon">{m.icon}</div>
              <div className="landing-math-num">{m.num}</div>
              <div className="landing-math-label">{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Get the app ───────────────────────────────────────── */}
      <section className="landing-getapp">
        <h2>{t('landing.getapp_title', 'Get Interview Tinder your way')}</h2>
        <p className="landing-getapp-sub">
          {t('landing.getapp_sub', 'Telegram Mini App or installable PWA — same account, your progress follows you.')}
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
            <p>{t('landing.app_pwa_desc', 'Add to your home screen. Works offline, feels native.')}</p>
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
        <h2>{t('landing.pricing_title', 'Less than a coffee a week to stop losing offers')}</h2>
        <p className="landing-pricing-sub">{t('landing.pricing_sub', 'Free core forever · PRO unlocks unlimited AI & Mock · 7-day trial, cancel anytime.')}</p>
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
      <section className="landing-faq" aria-labelledby="faq-heading">
        <h2 id="faq-heading">{t('landing.faq_title', 'Questions developers ask before starting')}</h2>
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
        <h2>{t('landing.final_title', 'Your next interview is closer than you think.')}</h2>
        <p>{t('landing.final_sub', 'Be the candidate who\'s actually ready. Swipe your first real questions now — free, no card.')}</p>
        <div className="landing-hero-cta">
          <button className="landing-cta landing-cta--green" onClick={onStart}>
            {t('landing.cta', 'Try a real question free')} →
          </button>
          <a className="landing-cta landing-cta--ghost" href={miniAppUrl} target="_blank" rel="noopener noreferrer">
            {t('landing.open_tg', 'Open in Telegram')}
          </a>
        </div>
      </section>

      <footer className="landing-footer">
        <p className="landing-copy">© {new Date().getFullYear()} Interview Tinder</p>
      </footer>

      {/* ── Sticky CTA ──────────────────────────────────────────── */}
      <div className={`landing-sticky-cta ${scrolledPast ? 'visible' : ''}`}>
        <div className="landing-sticky-content">
          <span className="landing-sticky-text">10 min/day • Free • No card</span>
          <button className="landing-cta landing-cta--green" onClick={onStart}>
            {t('landing.cta', 'Try a real question free')} →
          </button>
        </div>
      </div>
    </div>
  );
}
