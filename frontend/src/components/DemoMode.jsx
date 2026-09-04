import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Check, X, Trophy, Share2, ArrowRight, Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';
import { saveGuestAnswer } from '../utils/guestProgress';
import './DemoMode.css';

const LANGS = ['Java', 'Python', 'TypeScript'];
const DEMO_SIZE = 10;

// Hardcoded fallback demo questions — used when the DB has no
// questions (e.g. a fresh deployment or demo environment).
// These are real interview questions so the demo still works.
const FALLBACK_QUESTIONS = {
  Java: [
    { id: 'demo_java_1', category: 'Core Java', difficulty: 'Junior', question: 'What is the difference between == and .equals() in Java?', shortAnswer: '== compares references; .equals() compares values.', language: 'Java' },
    { id: 'demo_java_2', category: 'Core Java', difficulty: 'Junior', question: 'What is a Java HashMap and how does it work?', shortAnswer: 'A hash table-based Map implementation using key-value pairs with O(1) get/put.', language: 'Java' },
    { id: 'demo_java_3', category: 'OOP', difficulty: 'Junior', question: 'What are the four pillars of OOP?', shortAnswer: 'Encapsulation, Inheritance, Polymorphism, Abstraction.', language: 'Java' },
    { id: 'demo_java_4', category: 'Core Java', difficulty: 'Junior', question: 'What is the difference between a class and an interface?', shortAnswer: 'A class can have state and behavior; an interface defines a contract (Java 8+ can have default methods).', language: 'Java' },
    { id: 'demo_java_5', category: 'Collections', difficulty: 'Junior', question: 'What is the difference between ArrayList and LinkedList?', shortAnswer: 'ArrayList uses a dynamic array (fast random access); LinkedList uses a doubly-linked list (fast insert/delete).', language: 'Java' },
    { id: 'demo_java_6', category: 'Multithreading', difficulty: 'Middle', question: 'What is the difference between Runnable and Callable?', shortAnswer: 'Runnable returns void and cannot throw checked exceptions; Callable returns a value and can throw exceptions.', language: 'Java' },
    { id: 'demo_java_7', category: 'Collections', difficulty: 'Middle', question: 'What are the differences between HashSet, LinkedHashSet, and TreeSet?', shortAnswer: 'HashSet: unordered, O(1). LinkedHashSet: insertion order, O(1). TreeSet: sorted order, O(log n).', language: 'Java' },
    { id: 'demo_java_8', category: 'Core Java', difficulty: 'Junior', question: 'What is exception handling in Java? Explain try-catch-finally.', shortAnswer: 'try block contains code that may throw an exception; catch handles it; finally always executes.', language: 'Java' },
    { id: 'demo_java_9', category: 'Java 8+', difficulty: 'Middle', question: 'What is a Stream API in Java 8?', shortAnswer: 'A functional-style API for processing sequences of elements with lazy evaluation and chainable operations like filter, map, and collect.', language: 'Java' },
    { id: 'demo_java_10', category: 'Core Java', difficulty: 'Junior', question: 'What is the difference between abstract class and interface in Java?', shortAnswer: 'Abstract class can have constructors, instance fields, and partial implementation. Interface defines only contracts (all abstract by default pre-Java 8).', language: 'Java' },
  ],
  Python: [
    { id: 'demo_python_1', category: ' Basics', difficulty: 'Junior', question: 'What is the difference between a list and a tuple in Python?', shortAnswer: 'List is mutable (changeable); tuple is immutable (fixed after creation).', language: 'Python' },
    { id: 'demo_python_2', category: ' Basics', difficulty: 'Junior', question: 'What is a Python decorator?', shortAnswer: 'A function that wraps another function to extend its behavior without modifying its source code, using the @ syntax.', language: 'Python' },
    { id: 'demo_python_3', category: 'OOP', difficulty: 'Junior', question: 'What are *args and **kwargs in Python?', shortAnswer: '*args passes a variable number of positional arguments as a tuple; **kwargs passes keyword arguments as a dict.', language: 'Python' },
    { id: 'demo_python_4', category: ' Basics', difficulty: 'Junior', question: 'What is the difference between shallow copy and deep copy?', shortAnswer: 'Shallow copy creates a new object with references to the original nested items. Deep copy creates a fully independent copy of all nested objects.', language: 'Python' },
    { id: 'demo_python_5', category: 'Generators', difficulty: 'Middle', question: 'What is a generator in Python?', shortAnswer: 'A function that uses yield to produce a sequence of values lazily, one at a time, without storing them all in memory.', language: 'Python' },
    { id: 'demo_python_6', category: 'OOP', difficulty: 'Junior', question: 'What is the self keyword in Python?', shortAnswer: 'self refers to the instance of the class and is used to access instance attributes and methods.', language: 'Python' },
    { id: 'demo_python_7', category: ' Basics', difficulty: 'Junior', question: 'Explain Python\'s GIL (Global Interpreter Lock).', shortAnswer: 'The GIL prevents multiple native threads from executing Python bytecode simultaneously, limiting true parallelism for CPU-bound tasks.', language: 'Python' },
    { id: 'demo_python_8', category: 'Error Handling', difficulty: 'Junior', question: 'What is the difference between try-except and try-except-finally?', shortAnswer: 'try-except catches and handles exceptions. try-except-finally adds a block that always executes regardless of whether an exception occurred.', language: 'Python' },
    { id: 'demo_python_9', category: 'Data Science', difficulty: 'Middle', question: 'What is the difference between NumPy arrays and Python lists?', shortAnswer: 'NumPy arrays are homogeneous (fixed type), support vectorized operations, and are stored contiguously in memory for fast computation.', language: 'Python' },
    { id: 'demo_python_10', category: 'OOP', difficulty: 'Junior', question: 'What is Python\'s MRO (Method Resolution Order)?', shortAnswer: 'The order in which base classes are searched when looking up a method. Python uses the C3 linearization algorithm for MRO.', language: 'Python' },
  ],
  TypeScript: [
    { id: 'demo_ts_1', category: ' Basics', difficulty: 'Junior', question: 'What is the difference between TypeScript and JavaScript?', shortAnswer: 'TypeScript is a superset of JavaScript with static type checking, interfaces, and compile-time type enforcement.', language: 'TypeScript' },
    { id: 'demo_ts_2', category: ' Typing', difficulty: 'Junior', question: 'What is the difference between `interface` and `type` in TypeScript?', shortAnswer: 'Interface: extensible via declaration merging, used for objects. Type: more versatile (unions, intersections, primitives), cannot be merged.', language: 'TypeScript' },
    { id: 'demo_ts_3', category: 'Generics', difficulty: 'Middle', question: 'What are generics in TypeScript?', shortAnswer: 'Generics allow creating reusable, type-safe components that work with any type while preserving type information at compile time.', language: 'TypeScript' },
    { id: 'demo_ts_4', category: ' Basics', difficulty: 'Junior', question: 'What is the `any` type and why should it be avoided?', shortAnswer: 'any disables type checking for a variable. It should be avoided because it defeats the purpose of TypeScript\'s compile-time safety.', language: 'TypeScript' },
    { id: 'demo_ts_5', category: ' OOP', difficulty: 'Junior', question: 'What is the difference between `public`, `private`, and `protected` modifiers?', shortAnswer: 'public: accessible everywhere. private: accessible only within the class. protected: accessible in the class and its subclasses.', language: 'TypeScript' },
    { id: 'demo_ts_6', category: ' Functions', difficulty: 'Junior', question: 'What is a callback function in TypeScript?', shortAnswer: 'A function passed as an argument to another function and executed later, often after an asynchronous operation completes.', language: 'TypeScript' },
    { id: 'demo_ts_7', category: ' Advanced', difficulty: 'Middle', question: 'What are union types in TypeScript?', shortAnswer: 'Union types allow a value to be one of several types, e.g. string | number. TypeScript narrows the type based on usage.', language: 'TypeScript' },
    { id: 'demo_ts_8', category: 'Async', difficulty: 'Junior', question: 'What is the difference between Promise and async/await?', shortAnswer: 'Promise is an object representing a future value. async/await is syntactic sugar over Promises that makes asynchronous code look synchronous.', language: 'TypeScript' },
    { id: 'demo_ts_9', category: ' Typing', difficulty: 'Middle', question: 'What is a type guard in TypeScript?', shortAnswer: 'A type guard is an expression that performs a runtime check to narrow the type of a value within a conditional block.', language: 'TypeScript' },
    { id: 'demo_ts_10', category: ' Modules', difficulty: 'Junior', question: 'What is the difference between `export default` and `export`?', shortAnswer: 'export default exports a single value per module (no need for import names). export named exports multiple values imported by name.', language: 'TypeScript' },
  ],
};

export default function DemoMode({ onSignup, onExit, referralId }) {
  const { t, i18n } = useTranslation();
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
      const qs = res.questions || [];
      // Use DB questions if available; otherwise use hardcoded fallbacks
      setQuestions(qs.length > 0 ? qs : (FALLBACK_QUESTIONS[lang] || FALLBACK_QUESTIONS['Java']).slice(0, DEMO_SIZE));
      setIndex(0);
      setKnown(0);
      setFlipped(false);
      setFinished(false);
      setPercentile(null);
    } catch (e) {
      // DB might be unavailable — show fallback questions directly
      setQuestions((FALLBACK_QUESTIONS[lang] || FALLBACK_QUESTIONS['Java']).slice(0, DEMO_SIZE));
      setIndex(0);
      setKnown(0);
      setFlipped(false);
      setFinished(false);
      setPercentile(null);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // getDemoQuestions reads i18n.language at call time, so reload the deck
  // when the interface language changes (RU pool <-> EN pool).
  useEffect(() => { load(language); }, [language, i18n.language, load]);

  const total = questions.length || DEMO_SIZE;
  const score = total > 0 ? Math.round((known / Math.max(total, 1)) * 100) : 0;

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
    const beat = percentile == null ? null : Math.min(100, percentile);
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
            <Flame size={16} /> {t('demo.percentile', {
              defaultValue: 'Ahead of {{beat}}% of {{language}} candidates this month.',
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
            {copied ? <><Check size={14} /> {t('demo.copied', 'Copied!')}</> : t('demo.copy', 'Copy link')}
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
