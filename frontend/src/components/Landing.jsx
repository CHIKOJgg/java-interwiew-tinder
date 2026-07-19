import { useTranslation } from 'react-i18next';

/**
 * Public landing page shown to visitors who open the app outside Telegram
 * and are not yet authenticated. Drives organic traffic (SEO + social share
 * previews) and funnels into WebLogin.
 */
export default function Landing({ onStart }) {
  const { t } = useTranslation();

  const features = [
    { icon: '🃏', title: t('landing.f_swipe', 'Swipe to learn'), text: t('landing.f_swipe_d', 'Right = know it, left = get an AI breakdown.') },
    { icon: '🧠', title: t('landing.f_modes', '7 game modes'), text: t('landing.f_modes_d', 'Test, Bug Hunting, Blitz, Code Completion, Concept Linker, Mock Interview.') },
    { icon: '🔥', title: t('landing.f_streak', 'Streak & spaced repetition'), text: t('landing.f_streak_d', 'SM-2 algorithm resurfaces what you keep forgetting.') },
    { icon: '📊', title: t('landing.f_percentile', 'Percentile vs others'), text: t('landing.f_percentile_d', 'See how ready you are compared to other candidates.') },
  ];

  const plans = [
    { id: 'free', name: t('landing.plan_free', 'Free'), price: '$0', period: '', features: [
      t('landing.free_f1', 'Swipe & Test modes'),
      t('landing.free_f2', '200 requests / day'),
      t('landing.free_f3', '3 AI explanations / day'),
    ] },
    { id: 'pro', name: t('landing.plan_pro', 'Pro'), price: '$9', period: t('landing.per_month', '/mo'), highlight: true, features: [
      t('landing.pro_f1', 'All 7 game modes'),
      t('landing.pro_f2', 'Unlimited AI breakdowns'),
      t('landing.pro_f3', 'Resume analysis & mock interview'),
      t('landing.pro_f4', 'Readiness percentile & streak'),
    ] },
  ];

  return (
    <div className="landing">
      <header className="landing-hero">
        <img className="landing-logo" src="/icon.svg" alt="Interview Tinder" width="72" height="72" />
        <h1>{t('landing.title', 'Interview Tinder')}</h1>
        <p className="landing-tagline">
          {t('landing.tagline', 'Prep for your Java (or Python / TypeScript) interview in 10 minutes a day.')}
        </p>
        <button className="landing-cta" onClick={onStart}>
          {t('landing.cta', 'Start free')} →
        </button>
        <p className="landing-sub">
          {t('landing.sub', 'No card required · works in Telegram and as a PWA')}
        </p>
      </header>

      <section className="landing-features">
        {features.map((f) => (
          <div className="landing-feature" key={f.title}>
            <div className="landing-feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </div>
        ))}
      </section>

      <section className="landing-how">
        <h2>{t('landing.how_title', 'How it works')}</h2>
        <ol>
          <li>{t('landing.how_1', 'Pick a language and topics you want to master.')}</li>
          <li>{t('landing.how_2', 'Swipe through real interview questions — it feels like a game.')}</li>
          <li>{t('landing.how_3', 'Get an instant AI explanation for everything you don\'t know.')}</li>
          <li>{t('landing.how_4', 'Keep a daily streak and watch your readiness percentile grow.')}</li>
        </ol>
      </section>

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
          {t('landing.pricing_note', 'Also available for 450 Telegram Stars / month.')}
        </p>
      </section>

      <footer className="landing-footer">
        <button className="landing-cta" onClick={onStart}>
          {t('landing.cta', 'Start free')} →
        </button>
        <p className="landing-copy">© {new Date().getFullYear()} Interview Tinder</p>
      </footer>
    </div>
  );
}
