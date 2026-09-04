import { useEffect, useState, useCallback, useRef } from 'react';
import i18n from '../i18n/config';
import { Target, Check, X, AlertTriangle, Users, Tag, Lightbulb, Brain, MessageSquare } from 'lucide-react';
import Mascot from './Mascot';
import './Landing.css';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const LANGS = ['Java', 'Python', 'TypeScript'];
const NEED = { junior: 150, middle: 320, senior: 520 };

function emailOk(v) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
}

function getRegion() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    return { region: tz === 'Europe/Minsk' ? 'BY' : '', timezone: tz };
  } catch { return { region: '', timezone: '' }; }
}

export default function Landing({ onStart, onLogin }) {
  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'prep_interview_bot';
  const miniAppUrl = import.meta.env.VITE_TELEGRAM_MINIAPP_URL || `https://t.me/${botUsername}`;
  const RB = useRef(getRegion());

  // Web visitors can jump straight into the in-app demo (no signup); the
  // Telegram CTAs remain the primary funnel for the Mini App itself.
  const startDemo = (e) => {
    if (!onStart) return;
    e.preventDefault();
    onStart();
  };

  /* ── live widget ── */
  const [liveQ, setLiveQ] = useState(null);
  const [liveLang, setLiveLang] = useState('Java');
  const [ansShown, setAnsShown] = useState(false);
  const langIdx = useRef(0);

  const fetchLive = useCallback(() => {
    const lang = LANGS[langIdx.current % LANGS.length];
    langIdx.current++;
    fetch(`${API_BASE}/demo/questions?language=${encodeURIComponent(lang)}&limit=1&seed=${Math.random().toString(36).slice(2)}&lng=${i18n?.language || 'en'}`)
      .then(r => r.json())
      .then(d => { const qs = (d && d.questions) || []; if (qs.length) { setLiveQ(qs[0]); setLiveLang(lang); } else { setLiveQ(null); } })
      .catch(() => setLiveQ(null));
  }, []);

  useEffect(() => { fetchLive(); const id = setInterval(fetchLive, 20000); return () => clearInterval(id); }, [fetchLive]);

  /* ── subnav scroll-spy ── */
  useEffect(() => {
    const links = document.querySelectorAll('#subnav a');
    if (!links.length) return;
    const map = {};
    links.forEach(a => { const id = a.getAttribute('href').slice(1); const el = document.getElementById(id); if (el) map[id] = a; });
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        const a = map[e.target.id]; if (!a) return;
        if (e.isIntersecting) {
          links.forEach(x => x.classList.remove('active'));
          a.classList.add('active');
          a.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(map).forEach(id => io.observe(document.getElementById(id)));
    return () => io.disconnect();
  }, []);

  /* ── who tabs ── */
  const [whoTab, setWhoTab] = useState(0);

  /* ── calculator ── */
  const [calcLevel, setCalcLevel] = useState('junior');
  const [calcTime, setCalcTime] = useState(30);
  const calcData = (() => {
    const need = NEED[calcLevel];
    const hours = need / 15;
    const days = Math.max(1, Math.round(hours / (calcTime / 60)));
    return { days, questions: need, hours: Math.round(hours), weeks: days / 7 };
  })();

  /* ── billing toggle ── */
  const [billing, setBilling] = useState('monthly');

  /* ── lead form ── */
  const [leadEmail, setLeadEmail] = useState('');
  const [leadConsent, setLeadConsent] = useState(false);
  const [leadInterest, setLeadInterest] = useState('passive');
  const [leadMsg, setLeadMsg] = useState(null);
  const [leadLoading, setLeadLoading] = useState(false);

  const submitLead = useCallback(async () => {
    if (!leadConsent) { setLeadMsg({ type: 'err', text: 'Please agree to the privacy policy.' }); return; }
    if (!emailOk(leadEmail)) { setLeadMsg({ type: 'err', text: 'Enter a valid email.' }); return; }
    setLeadLoading(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const r = await fetch(`${API_BASE}/waitlist`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: leadEmail, lang: 'en', source: params.get('utm_source') || 'landing', consent: true,          interest: leadInterest, region: RB.current.region, timezone: RB.current.timezone
        })
      });
      let j = null;
      try { j = await r.json(); } catch { /* non-JSON error body */ }
      if (!r.ok) {
        if (r.status === 451) { setLeadMsg({ type: 'err', text: j?.message || 'Subscription unavailable in your region.' }); return; }
        setLeadMsg({ type: 'err', text: j?.error || 'Something went wrong. Try again later.' });
        return;
      }
      setLeadMsg({ type: 'ok', text: "You're in! The PDF + digest are on their way." });
      setLeadEmail(''); setLeadConsent(false);
    } catch { setLeadMsg({ type: 'err', text: 'Network error. Try again later.' }); }
    finally { setLeadLoading(false); }
  }, [leadEmail, leadConsent, leadInterest]);

  /* ── b2b form ── */
  const [b2bName, setB2bName] = useState('');
  const [b2bProduct, setB2bProduct] = useState('b2b-team');
  const [b2bEmail, setB2bEmail] = useState('');
  const [b2bTg, setB2bTg] = useState('');
  const [b2bMsg, setB2bMsg] = useState('');
  const [b2bConsent, setB2bConsent] = useState(false);
  const [b2bMsgOut, setB2bMsgOut] = useState(null);
  const [b2bLoading, setB2bLoading] = useState(false);

  const submitB2b = useCallback(async () => {
    if (!b2bConsent) { setB2bMsgOut({ type: 'err', text: 'Please agree to the privacy policy.' }); return; }
    if (!b2bEmail && !b2bTg) { setB2bMsgOut({ type: 'err', text: 'Add an email or Telegram handle so we can reply.' }); return; }
    if (b2bEmail && !emailOk(b2bEmail)) { setB2bMsgOut({ type: 'err', text: 'Enter a valid email.' }); return; }
    setB2bLoading(true);
    try {
      const packed = (b2bTg ? b2bTg + ' ' : '') + '| ' + b2bProduct + (b2bName ? ' | ' + b2bName : '') + (b2bMsg ? ' | ' + b2bMsg : '');
      const r = await fetch(`${API_BASE}/waitlist`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: b2bEmail || undefined, lang: 'en', source: b2bProduct, consent: true,
          telegram: packed, interest: 'arbitrage', region: RB.current.region, timezone: RB.current.timezone
        })
      });
      let j = null;
      try { j = await r.json(); } catch { /* non-JSON error body */ }
      if (!r.ok) {
        if (r.status === 451) { setB2bMsgOut({ type: 'err', text: j?.message || 'Subscription unavailable in your region.' }); return; }
        setB2bMsgOut({ type: 'err', text: j?.error || 'Something went wrong. Try again later.' });
        return;
      }
      setB2bMsgOut({ type: 'ok', text: "Thanks! We'll reach out within 1 business day." });
      setB2bName(''); setB2bEmail(''); setB2bTg(''); setB2bMsg(''); setB2bConsent(false);
    } catch { setB2bMsgOut({ type: 'err', text: 'Network error. Ping us on Telegram instead.' }); }
    finally { setB2bLoading(false); }
  }, [b2bName, b2bProduct, b2bEmail, b2bTg, b2bMsg, b2bConsent]);

  /* ── exit popup ── */
  const [exitShown, setExitShown] = useState(false);
  useEffect(() => {
    if (localStorage.getItem('exit_popup_dismissed')) return;
    let shown = false;
    const onMouseOut = (e) => { if (!shown && e.clientY < 4) { shown = true; setExitShown(true); } };
    document.addEventListener('mouseout', onMouseOut);
    if (window.matchMedia && window.matchMedia('(hover: none)').matches) {
      history.pushState({ exitGuard: true }, '');
      const onPop = () => { if (!shown) { shown = true; setExitShown(true); history.pushState({ exitGuard: true }, ''); } };
      window.addEventListener('popstate', onPop);
      return () => { window.removeEventListener('popstate', onPop); document.removeEventListener('mouseout', onMouseOut); };
    }
    return () => document.removeEventListener('mouseout', onMouseOut);
  }, []);

  const dismissExit = () => { setExitShown(false); localStorage.setItem('exit_popup_dismissed', '1'); };

  const liveQuestion = liveQ || { language: 'Java', category: 'Core', question: (i18n?.language === 'ru' ? 'В чем разница между == и equals()?' : 'What is the difference between == and equals()?'), shortAnswer: (i18n?.language === 'ru' ? '== сравнивает ссылки; equals() сравнивает содержимое объектов.' : '== compares references; equals() compares object content.') };

  return (
    <div className="landing-wrap">
      <div className="announce">Interview Tinder is now <b>Prep-It</b> — same swipe engine, new name. <a href="#faq">Why we renamed →</a></div>

      <header className="land-header">
        <div className="wrap">
          <div className="logo">
            <Mascot size={32} className="mark" />
            Prep-It
          </div>
          <nav className="nav">
            <a className="hide-m" href="#cost">Why you fail</a>
            <a className="hide-m" href="#how">How it works</a>
            <a className="hide-m" href="#calc">Calculator</a>
            <a className="hide-m" href="#pricing">Pricing</a>
            <a className="hide-m" href="#faq">FAQ</a>
            <a className="hide-m" href="#b2b">B2B</a>
            {onLogin && (
              <button className="btn sm ghost" onClick={onLogin} type="button" id="landLoginBtn" style={{ background: 'transparent' }}>
                Log in
              </button>
            )}
            <a className="btn sm lime" href={miniAppUrl} target="_blank" rel="noopener">Start free</a>
          </nav>
        </div>
        <div className="subnav" id="subnav">
          <a href="#cost">Why you fail</a>
          <a href="#who">Who it's for</a>
          <a href="#how">How it works</a>
          <a href="#calc">Calculator</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
          <a href="#b2b">B2B</a>
        </div>
      </header>

      {/* HERO */}
      <div className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">🔥 real questions · {LANGS.length} languages · no fluff</span>
            <h1>One forgotten question<br />shouldn't cost you <span className="hl">the offer.</span></h1>
            <p className="lead">Prep-It drills you on the exact questions companies ask, explains every gap instantly with AI, and shows your real readiness score — so you walk in knowing, not hoping. 10 minutes a day, free to start.</p>
            <div className="actions">
              <a className="btn lime" href={miniAppUrl} onClick={startDemo} id="ctaHero">🚀 Try a real question free</a>
              <a className="btn" href={`https://t.me/${botUsername}`} target="_blank" rel="noopener">Open in Telegram</a>
            </div>
            <div className="trust-row">
              <span>✓ <b>No card</b></span>
              <span>✓ <b>7-day</b> PRO trial</span>
              <span>✓ <b>PWA</b> + Telegram Mini App</span>
            </div>
          </div>

          <div className="mascot-wrap">
            <div className="swipe-frame" id="liveWidget">
              <div className="fh">
                <span><span className="dot"></span>Live question</span>
                <span id="liveUpdated" className="live-lang-badge">{liveQ ? liveLang : 'loading…'}</span>
              </div>
              <div id="liveBody">
                {liveQ ? (
                  <div className="qcard">
                    <span className="tag">{liveQuestion.language} · {liveQuestion.category}</span>
                    <div className="q">{liveQuestion.question}</div>
                    <div className={'a' + (ansShown ? ' show' : '')} id="ans">{liveQuestion.shortAnswer || 'Swipe left in the app for the full AI breakdown.'}</div>
                  </div>
                ) : <div className="skeleton"></div>}
              </div>
              <div className="swipe-foot">
                <button className="btn sm" type="button" onClick={() => setAnsShown(v => !v)}>Reveal answer</button>
                <a className="btn sm lime" href={miniAppUrl} target="_blank" rel="noopener">Practice this →</a>
              </div>
              <p className="live-note">↑ not a demo — pulled live from the real bank</p>
            </div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <section className="padtop-20">
        <div className="wrap">
          <div className="stats-strip">
            <div className="stat-box"><div className="n">1000+</div><div className="l">real questions</div></div>
            <div className="stat-box"><div className="n">7</div><div className="l">training modes</div></div>
            <div className="stat-box"><div className="n">3</div><div className="l">languages</div></div>
            <div className="stat-box"><div className="n">&lt;10s</div><div className="l">to first answer</div></div>
          </div>
        </div>
      </section>

      {/* WHY YOU FAIL */}
      <section id="cost">
        <div className="wrap">
          <h2>The real cost of "I'll prepare later"</h2>
          <p className="sub">It's not about being a bad developer — it's about what happens when preparation meets luck, and luck runs out.</p>
          <div className="steps">
            <div className="step"><div className="n"><Brain size={24} /></div><h3>You study the wrong things</h3><p>Endless LeetCode and random blog lists. Then they ask about GC or <code>volatile</code> and you freeze. Prep should mirror the real interview.</p></div>
            <div className="step"><div className="n"><MessageSquare size={24} /></div><h3>You get zero feedback</h3><p>Reading an answer isn't understanding it. Without a plain explanation of your gap, you repeat the same mistake — and it shows.</p></div>
            <div className="step"><div className="n"><Target size={24} /></div><h3>You never know you're ready</h3><p>Cramming forever isn't a plan. You need to know, confidently, that you're ready to book the interview.</p></div>
          </div>
        </div>
      </section>

      {/* BUILT FOR */}
      <section id="who">
        <div className="wrap">
          <h2>Built for the interview you're facing</h2>
          <p className="sub">Different goal, same fix: walk in confident.</p>
          <div className="tabs" id="whoTabs">
            {['Junior', 'Middle', 'Senior', 'Bootcamp grad'].map((label, i) => (
              <button key={i} className={'tab-btn' + (whoTab === i ? ' active' : '')} data-tab={i} onClick={() => setWhoTab(i)}>{label}</button>
            ))}
          </div>
          <div className="tab-panels">
            {[
              { h: 'First job', p: 'Break in without a CS degree. Learn the questions that actually come up — and prove you belong.' },
              { h: 'Switching jobs', p: 'You know the job — now prove it fast. Target your gaps in 10 minutes a day around your current role.' },
              { h: 'Brushing up', p: 'Refresh the internals — GC, concurrency, system design — you haven\'t touched in years.' },
              { h: 'Career switcher', p: 'Turn a thin résumé into real confidence with structured reps and a measurable score.' },
            ].map((panel, i) => (
              <div key={i} className={'tab-panel' + (whoTab === i ? ' active' : '')} data-panel={i}>
                <h3>{panel.h}</h3><p>{panel.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="padtop-0">
        <div className="wrap">
          <div className="cta-banner">
            <h3>Stop cramming. Start swiping.</h3>
            <p>Less than a coffee a week — PRO is $0.33/day. The average salary jump after landing an offer is $5k–$30k.</p>
            <a className="btn lime" href={miniAppUrl} target="_blank" rel="noopener">Build my prep plan free →</a>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how">
        <div className="wrap">
          <h2>From panic to "bring it on"</h2>
          <p className="sub">No friction, no form before the fun part.</p>
          <div className="steps">
            <div className="step"><div className="n">1</div><h3>See</h3><p>Land on a real interview question instantly — no signup wall.</p></div>
            <div className="step"><div className="n">2</div><h3>Try</h3><p>Swipe a deck, get instant AI help, watch your readiness score climb.</p></div>
            <div className="step"><div className="n">3</div><h3>Know</h3><p>Hit your readiness target — or unlock PRO's Mock Interview to rehearse for real.</p></div>
          </div>
        </div>
      </section>

      {/* CALCULATOR */}
      <section id="calc">
        <div className="wrap">
          <h2>How long until you're actually ready?</h2>
          <p className="sub">Pick your target and pace — we estimate the plan, you just swipe through it.</p>
          <div className="calc">
            <div className="calc-grid">
              <div className="calc-controls">
                <label>Target level</label>
                <div className="seg" id="calcSeg">
                  {['junior', 'middle', 'senior'].map(lvl => (
                    <button key={lvl} className={calcLevel === lvl ? 'active' : ''} data-level={lvl} onClick={() => setCalcLevel(lvl)}>
                      {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                    </button>
                  ))}
                </div>
                <label>Time per day: <span id="calcTimeLabel">{calcTime} min</span></label>
                <input type="range" id="calcTime" min="10" max="120" step="5" value={calcTime} onChange={e => setCalcTime(parseInt(e.target.value, 10))} />
              </div>
              <div className="calc-out">
                <div className="big" id="calcDays">{calcData.days} {calcData.days === 1 ? 'day' : 'days'}</div>
                <div className="big-lbl">estimated days to prep</div>
                <div className="row2">
                  <div><div className="n" id="calcQs">{calcData.questions}</div><div className="l">questions</div></div>
                  <div><div className="n" id="calcHrs">{calcData.hours}h</div><div className="l">total hours</div></div>
                  <div><div className="n" id="calcWk">{calcData.weeks.toFixed(1)}</div><div className="l">weeks</div></div>
                </div>
              </div>
            </div>
            <div className="calc-note">Assumes ~15 questions/hour of focused practice. Spaced repetition adds review cycles.</div>
            <div className="center mgt-18"><a className="btn lime" href={miniAppUrl} target="_blank" rel="noopener">Build my plan free →</a></div>
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section>
        <div className="wrap">
          <h2>Why swipe beats every other method</h2>
          <p className="sub">A static question list doesn't make you remember. Repetition and feedback do.</p>
          <div className="compare-wrap">
            <table className="compare">
              <thead><tr><th>Capability</th><th className="hl">Prep-It</th><th>Question list</th><th>LeetCode grind</th></tr></thead>
              <tbody>
                <tr><td>Real interview questions (not algorithms only)</td><td className="yes"><Check size={16} /></td><td className="no"><X size={16} /></td><td className="part">partial</td></tr>
                <tr><td>Instant AI explanation of your gap</td><td className="yes"><Check size={16} /></td><td className="no"><X size={16} /></td><td className="no"><X size={16} /></td></tr>
                <tr><td>Spaced repetition</td><td className="yes"><Check size={16} /></td><td className="no"><X size={16} /></td><td className="no"><X size={16} /></td></tr>
                <tr><td>Readiness score</td><td className="yes"><Check size={16} /></td><td className="no"><X size={16} /></td><td className="part">partial</td></tr>
                <tr><td>Mock interview w/ AI feedback</td><td className="yes"><Check size={16} /></td><td className="no"><X size={16} /></td><td className="no"><X size={16} /></td></tr>
                <tr><td>Free to start</td><td className="yes"><Check size={16} /></td><td className="yes"><Check size={16} /></td><td className="yes"><Check size={16} /></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing">
        <div className="wrap">
          <h2>Less than a coffee a week</h2>
          <p className="sub">Free core forever. PRO unlocks unlimited AI &amp; Mock. 7-day trial, cancel anytime.</p>
          <div className="center">
            <div className="billing-toggle" role="group" aria-label="Billing period">
              <button type="button" className={billing === 'monthly' ? 'active' : ''} onClick={() => setBilling('monthly')}>Monthly</button>
              <button type="button" className={billing === 'annual' ? 'active' : ''} onClick={() => setBilling('annual')}>Annual <span className="save">−20%</span></button>
            </div>
          </div>
          <div className="pricing">
            <div className="plan">
              <div className="name">Free</div>
              <div className="price">$0</div>
              <div className="price-note">forever</div>
              <ul><li>Swipe &amp; Test modes</li><li>Daily AI quota</li><li>Progress &amp; streaks</li><li>Java · Python · TypeScript</li></ul>
              <a className="btn block" href={miniAppUrl} target="_blank" rel="noopener">Start free</a>
            </div>
            <div className="plan featured">
              <div className="badge">MOST POPULAR</div>
              <div className="name">PRO</div>
              <div className="price">{billing === 'annual' ? <>$96<small>/yr</small></> : <>$9.99<small>/mo</small></>}</div>
              <div className="price-note" id="proNote">{billing === 'annual' ? 'billed yearly · save 20%' : 'billed monthly'}</div>
              <ul><li>Unlimited AI explanations</li><li>Mock Interview + feedback</li><li>Resume Analyzer</li><li>All 7 modes &amp; categories</li></ul>
              <a className="btn lime block" href={`https://t.me/${botUsername}?start=pro`} target="_blank" rel="noopener">Start 7-day PRO trial</a>
            </div>
            <div className="plan pro-max-plan">
              <div className="name">PRO MAX</div>
              <div className="price">{billing === 'annual' ? <>$480<small>/yr</small></> : <>$50<small>/mo</small></>}</div>
              <div className="price-note" id="proMaxNote">{billing === 'annual' ? 'billed yearly · save 20%' : 'billed monthly'}</div>
              <ul>
                <li>Everything in PRO, unlimited</li>
                <li>Live 1-on-1 interviews</li>
                <li>Full AI mock interview room</li>
                <li>All languages &amp; all modes</li>
                <li>Priority AI model</li>
              </ul>
              <a className="btn block" href={`https://t.me/${botUsername}?start=pro_max`} target="_blank" rel="noopener">Get Pro Max</a>
            </div>
          </div>
        </div>
      </section>

      {/* FOUNDER NOTE */}
      <section className="padtop-0">
        <div className="wrap">
          <div className="founder">
            <p>We're early — Prep-It just launched under its new name, so there's no wall of testimonials here yet. What's real: 1000+ interview questions, an AI explanation engine, and a readiness score, all built from what actually gets asked in Java, Python and TypeScript interviews. Try a question above and judge for yourself.</p>
            <div className="sig">— the Prep-It team</div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq">
        <div className="wrap">
          <h2>Questions developers ask before starting</h2>
          <div className="faq">
            {[
              { q: 'Why the rename from Interview Tinder to Prep-It?', a: 'Same product, same swipe mechanic — the name just describes what it does more clearly. Nothing about your progress or account changes.' },
              { q: 'Is it really free?', a: 'Yes. Swipe and Test modes are free, including a daily quota of AI explanations. PRO lifts the limits and unlocks Mock Interview.' },
              { q: 'Do I need to sign up?', a: 'To try — no. A real question deck opens immediately. To save progress, one click via Telegram or email is enough.' },
              { q: 'How long does it take to prepare for a Java interview?', a: 'Roughly 150 questions for junior, 320 for middle, 520 for senior at ~15 questions/hour. Most people feel confident in 2–3 weeks of 20 minutes a day.' },
              { q: 'Is this better than LeetCode for interviews?', a: 'Different job. LeetCode trains algorithms; Prep-It trains the language and system-design questions real interviews actually ask — with instant explanations and a readiness score.' },
              { q: 'Which languages are supported?', a: 'Java, Python and TypeScript — each with its own independent question bank.' },
              { q: 'Does it work on my phone?', a: 'Yes — as a Telegram Mini App and as an installable PWA on iOS and Android.' },
            ].map((item, i) => (
              <details key={i} className="qa">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* B2B */}
      <section id="b2b">
        <div className="wrap">
          <div className="b2b">
            <h2>For bootcamps, schools &amp; HR</h2>
            <p className="sub">The same trainer, packaged for teams. Turn candidate prep into a measurable metric.</p>
            <div className="b2b-cards">
              <div className="b2b-card"><span><Users size={24} /></span><h3>Team subscriptions</h3><p>5–20 seats, one bill, a readiness dashboard.</p><div className="from">from $5/seat/mo</div></div>
              <div className="b2b-card"><span><Tag size={24} /></span><h3>White-label Mini App</h3><p>Your brand, our engine, revenue share.</p><div className="from">setup + rev-share</div></div>
              <div className="b2b-card"><span><Target size={24} /></span><h3>Company question banks</h3><p>Prep candidates against a target employer's loop.</p><div className="from">custom quote</div></div>
            </div>
            <div className="b2b-form">
              <h3>Request B2B access</h3>
              <p className="sub mg-6-16">Tell us what you're building. We reply within 1 business day.</p>
              <form onSubmit={e => { e.preventDefault(); submitB2b(); }}>
                <div className="b2b-fields">
                  <input type="text" id="b2bName" placeholder="Name / Organization" autoComplete="organization" value={b2bName} onChange={e => setB2bName(e.target.value)} />
                  <select id="b2bProduct" value={b2bProduct} onChange={e => setB2bProduct(e.target.value)}>
                    <option value="b2b-team">Team subscription</option>
                    <option value="b2b-whitelabel">White-label Mini App</option>
                    <option value="b2b-bank">Company question bank</option>
                    <option value="b2b-other">Other / not sure</option>
                  </select>
                  <input type="email" id="b2bEmail" placeholder="Work email" autoComplete="email" value={b2bEmail} onChange={e => setB2bEmail(e.target.value)} />
                  <input type="text" id="b2bTg" placeholder="Telegram @handle (optional)" value={b2bTg} onChange={e => setB2bTg(e.target.value)} />
                  <textarea className="full" id="b2bMsg" placeholder="What are you building? Expected headcount?" value={b2bMsg} onChange={e => setB2bMsg(e.target.value)}></textarea>
                </div>
                <label className="consent"><input type="checkbox" id="b2bConsent" checked={b2bConsent} onChange={e => setB2bConsent(e.target.checked)} /><span>I agree to the processing of my data per the <a href="/privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</span></label>
                {RB.current.region === 'BY' && <div className="rbnotice show"><AlertTriangle size={14} /> You appear to be in Belarus. Under RB law your data must be stored on RB-located servers, which isn't set up yet — so B2B requests from RB can't be saved here. <a href={`https://t.me/${botUsername}`} target="_blank" rel="noopener">Contact us on Telegram</a> instead.</div>}
                <button className="btn lime block" id="b2bSubmit" type="submit" disabled={b2bLoading}>{b2bLoading ? '…' : 'Request access →'}</button>
                {b2bMsgOut && <div className={'b2b-msg ' + b2bMsgOut.type}>{b2bMsgOut.text}</div>}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* REFERRAL */}
      <section>
        <div className="wrap center">
          <h2>Invite friends, both get PRO</h2>
          <p className="sub">Share your link — your friend gets 7 days PRO free, and so do you.</p>
          <a className="btn lime" href={`https://t.me/${botUsername}`} target="_blank" rel="noopener">Get your referral link</a>
        </div>
      </section>

      {/* LEAD MAGNET */}
      <section>
        <div className="wrap">
          <div className="lead">
            <h2>📩 The 5 questions that decide most Java offers</h2>
            <p className="sub mgb-0">Free PDF + weekly digest — the questions people actually get asked, with AI breakdowns. No spam.</p>
            <form className="lead-form" id="leadForm" onSubmit={e => { e.preventDefault(); submitLead(); }}>
              <input type="email" id="leadEmail" placeholder="Your email" autoComplete="email" value={leadEmail} onChange={e => setLeadEmail(e.target.value)} />
              <button className="btn lime" id="leadSubmit" type="submit" disabled={leadLoading}>{leadLoading ? '…' : 'Get the PDF'}</button>
            </form>
            <label className="lead-consent"><input type="checkbox" id="leadConsent" checked={leadConsent} onChange={e => setLeadConsent(e.target.checked)} /><span>I agree to the processing of my email per the <a href="/privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</span></label>
            <div className="lead-seg">
              <label><input type="radio" name="interest" value="passive" checked={leadInterest === 'passive'} onChange={e => e.target.checked && setLeadInterest('passive')} /><span><Lightbulb size={14} /> Brush up</span></label>
              <label><input type="radio" name="interest" value="arbitrage" checked={leadInterest === 'arbitrage'} onChange={e => e.target.checked && setLeadInterest('arbitrage')} /><span><Target size={14} /> Targeting a company</span></label>
            </div>
            {RB.current.region === 'BY' && <div className="rbnotice show"><AlertTriangle size={14} /> You appear to be in Belarus. Under RB law, your data must be stored on RB-located servers — so we can't collect your email right now. <a href={`https://t.me/${botUsername}`} target="_blank" rel="noopener">Message us on Telegram</a> instead.</div>}
            {leadMsg && <div className={'lead-msg ' + leadMsg.type}>{leadMsg.text}</div>}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section>
        <div className="wrap">
          <div className="final">
            <h2>Your next interview is closer than you think.</h2>
            <p>Be the candidate who's actually ready. Swipe your first real questions now — free, no card, no download.</p>
            <div className="actions flex-center">
              <a className="btn ink" href={miniAppUrl} target="_blank" rel="noopener">🚀 Start free</a>
              <a className="btn" href={`https://t.me/${botUsername}`} target="_blank" rel="noopener">Open in Telegram</a>
            </div>
          </div>
        </div>
      </section>

      <section className="padtop-0">
        <div className="wrap"><p className="disclaimer">Practice tool, not a job guarantee. Results depend on consistency and the specific interview. Always verify answers against primary sources.</p></div>
      </section>

      {/* STICKY CTA */}
      <div className="sticky-cta">
        <a className="btn lime" href={`https://t.me/${botUsername}`} target="_blank" rel="noopener">🚀 Telegram</a>
        <a className="btn" href={miniAppUrl} target="_blank" rel="noopener">📲 App</a>
      </div>

      {/* EXIT POPUP */}
      <div className={'exit-popup' + (exitShown ? ' show' : '')} id="exitPopup">
        <div className="exit-box">
          <button className="exit-x" id="exitClose" aria-label="Close" onClick={dismissExit}>&times;</button>
          <div className="fz-36"><Target size={36} /></div>
          <h3>Wait — try 3 questions before you go</h3>
          <p>No signup. No card. Just real interview questions with AI breakdowns.</p>
          <a className="btn lime" href={miniAppUrl} onClick={startDemo} id="exitCta">Try 3 free questions →</a>
          <button className="exit-skip" id="exitSkip" onClick={dismissExit}>No thanks</button>
        </div>
      </div>

      <footer>
        <div className="wrap">
          <Mascot size={26} className="foot-logo" /><br />
          Prep-It • <a href={`https://t.me/${botUsername}`}>Telegram</a>
          <div className="langs"><a href="/landing.html">EN</a><a href="/landing.ru.html">RU</a></div>
          <div className="foot-links"><a href="/privacy.html">Privacy</a> · <a href="#b2b">B2B</a></div>
        </div>
      </footer>
    </div>
  );
}
