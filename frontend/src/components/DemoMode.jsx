import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Check, X, Trophy, Share2, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';
import { saveGuestAnswer } from '../utils/guestProgress';
import './DemoMode.css';

const LANGS = ['Java', 'Python', 'TypeScript'];
const DEMO_SIZE = 10;

/**
 * Zero-login demo: the top of the funnel. A visitor plays 10 real questions
 * with no account, no card, no friction — then hits a result screen that
 * shows a readiness score and pushes them to sign up to save progress.
 */
export default function DemoMode({ onSignup, onExit, referralId }) {
  const { t } = useTranslation();
  const [language, setLanguage] = useState('Java');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [finished, setFinished] = useState(false);
  const [percentile, setPercentile] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (lang) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getDemoQuestions(DEMO_SIZE, lang);
      setQuestions(res.questions || []);
      setIndex(0);
      setKnown(0);
      setFlipped(false);
      setFinished(false);
      setPercentile(null);
    } catch (e) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(language); }, [language, load]);

  const total = questions.length || DEMO_SIZE;
  const score = total > 0 ? Math.round((known / total) * 100) : 0;

  const finish = useCallback(async (finalKnown) => {
    setFinished(true);
    try {
      const res = await apiClient.getDemoPercentile(finalKnown, language);
      setPercentile(res.percentile);
    } catch { /* non-fatal */ }
  }, [language]);

  const answer = (isKnown) => {
    const status = isKnown ? 'known' : 'unknown';
    const nextKnown = known + (isKnown ? 1 : 0);
    if (isKnown) setKnown(nextKnown);
    // Persist every swipe so progress survives a sign-up later (guest funnel).
    const q = questions[index];
    if (q && q.id != null) saveGuestAnswer(language, q.id, status);
    setFlipped(false);
    if (index + 1 >= questions.length) {
      finish(nextKnown);
    } else {
      setIndex(index + 1);
    }
  };

  // ─── Share ────────────────────────────────────────────────────────
  const shareUrl = referralId
    ? `${window.location.origin}/?ref=${referralId}`
    : window.location.origin;
  const shareText = t('demo.share_text', {
    defaultValue: 'I scored {{score}}% readiness for my {{language}} interview on Interview Tinder 🃏 Try it free:',
    score,
    language,
  });

  const handleShareX = () => {
    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      '_blank'
    );
  };
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };

  // ─── Render: loading / error ────────────────────────────────────────
  if (loading) {
    return (
      <div className="demo">
        <div className="demo-card-shell demo-skeleton" />
        <p className="demo-loading">{t('demo.loading', 'Loading your demo…')}</p>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="demo">
        <p className="demo-loading">{t('demo.error', 'Could not load the demo.')}</p>
        <button className="demo-btn primary" onClick={() => load(language)}>
          {t('demo.retry', 'Try again')}
        </button>
        <button className="demo-link" onClick={onExit}>{t('demo.back', 'Back')}</button>
      </div>
    );
  }

  // ─── Render: result ─────────────────────────────────────────────────
  if (finished) {
    const beat = percentile == null ? null : Math.max(0, 100 - percentile);
    return (
      <div className="demo demo-result">
        <Trophy className="demo-trophy" size={44} />
        <h2>{t('demo.result_title', 'Your readiness snapshot')}</h2>
        <div className="demo-score-ring">
          <span className="demo-score-val">{score}%</span>
          <span className="demo-score-lab">{t('demo.ready', 'ready')}</span>
        </div>
        <p className="demo-result-sub">
          {t('demo.result_sub', {
            defaultValue: 'You knew {{known}} of {{total}} — a real interview covers hundreds.',
            known,
            total,
          })}
        </p>
        {beat != null && (
          <p className="demo-percentile">
            {t('demo.percentile', {
              defaultValue: '🔥 Ahead of {{beat}}% of {{language}} candidates this month.',
              beat,
              language,
            })}
          </p>
        )}

        <div className="demo-cta-block">
          <button className="demo-btn primary big" onClick={onSignup}>
            {t('demo.save_cta', 'Create a free account to save your progress')}
            <ArrowRight size={18} />
          </button>
          <p className="demo-cta-note">
            {t('demo.save_note', 'Unlock spaced repetition, all modes, AI explanations & your full readiness score.')}
          </p>
        </div>

        <div className="demo-share">
          <button className="demo-btn secondary" onClick={handleShareX}>
            <Share2 size={16} /> {t('demo.share_x', 'Share on X')}
          </button>
          <button className="demo-btn secondary" onClick={handleCopy}>
            {copied ? t('demo.copied', '✓ Copied!') : t('demo.copy', 'Copy link')}
          </button>
        </div>

        <button className="demo-link" onClick={() => load(language)}>
          {t('demo.replay', 'Try 10 more')}
        </button>
      </div>
    );
  }

  // ─── Render: playing ────────────────────────────────────────────────
  const q = questions[index];
  return (
    <div className="demo">
      <div className="demo-topbar">
        <span className="demo-badge">{t('demo.badge', 'Free demo · no signup')}</span>
        <div className="demo-langs">
          {LANGS.map((l) => (
            <button
              key={l}
              className={`demo-lang${l === language ? ' active' : ''}`}
              onClick={() => setLanguage(l)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="demo-progress">
        <div className="demo-progress-bar" style={{ width: `${(index / total) * 100}%` }} />
      </div>
      <p className="demo-counter">{index + 1} / {total}</p>

      <div className={`demo-card-shell${flipped ? ' flipped' : ''}`} onClick={() => setFlipped((f) => !f)}>
        <div className="demo-card-inner">
          <div className="demo-face demo-front">
            <div className="demo-meta">
              <span className="demo-cat">{q.category}</span>
              {q.difficulty && <span className="demo-diff">{q.difficulty}</span>}
            </div>
            <h2>{q.question}</h2>
            <span className="demo-flip-hint"><RotateCcw size={14} /> {t('demo.tap', 'Tap for answer')}</span>
          </div>
          <div className="demo-face demo-back">
            <div className="demo-answer-label">{t('demo.short_answer', 'Short answer')}</div>
            <p>{q.shortAnswer}</p>
          </div>
        </div>
      </div>

      <div className="demo-actions">
        <button className="demo-swipe dont-know" onClick={() => answer(false)}>
          <X size={22} /> {t('demo.dont_know', "Don't know")}
        </button>
        <button className="demo-swipe know" onClick={() => answer(true)}>
          <Check size={22} /> {t('demo.know', 'Know it')}
        </button>
      </div>

      <button className="demo-link" onClick={onExit}>{t('demo.exit', 'Exit demo')}</button>
    </div>
  );
}
