// Lightweight in-app logger for Telegram WebApp / mini app environments,
// where the user has no browser DevTools (F12) to inspect console output.
//
// Every log is:
//   1. mirrored to the real `console` (so it still shows in a desktop browser),
//   2. forwarded to Sentry (errors/warnings) when a DSN is configured,
//   3. stored in a ring buffer that the on-screen <DebugOverlay /> renders.
//
// Toggling the overlay: long-press (Telegram) anywhere, or 5 rapid taps.
// (See components/DebugOverlay.jsx for the gesture wiring.)

const MAX_LOGS = 300;

const LEVELS = {
  debug: { weight: 10, label: 'DEBUG', color: '#868e96' },
  info: { weight: 20, label: 'INFO', color: '#4dabf7' },
  warn: { weight: 30, label: 'WARN', color: '#fcc419' },
  error: { weight: 40, label: 'ERROR', color: '#ff6b6b' },
  api: { weight: 15, label: 'API', color: '#9775fa' },
};

const listeners = new Set();
let buffer = [];
let minLevelWeight = 0; // 0 = show everything

function pad(n, len = 2) {
  return String(n).padStart(len, '0');
}

function timestamp() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

function safeString(arg) {
  if (arg instanceof Error) return arg.stack || `${arg.name}: ${arg.message}`;
  if (typeof arg === 'string') return arg;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function notify(level, args) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    t: timestamp(),
    level,
    text: args.map(safeString).join(' '),
  };
  buffer.push(entry);
  if (buffer.length > MAX_LOGS) buffer = buffer.slice(buffer.length - MAX_LOGS);

  // Mirror to the real console (strip the timestamp — console adds its own).
  const native = console[level === 'api' ? 'log' : level];
  if (typeof native === 'function') {
    try { native.apply(console, [`[${LEVELS[level].label}]`, ...args]); } catch { /* noop */ }
  }

  // Forward meaningful levels to Sentry.
  if (level === 'error') {
    try {
      const Sentry = window.__JIT_SENTRY__;
      const first = args.find((a) => a instanceof Error) || args[0];
      if (Sentry && typeof Sentry.captureException === 'function') {
        Sentry.captureException(first instanceof Error ? first : new Error(safeString(args)));
      }
    } catch { /* noop */ }
  } else if ((level === 'warn' || level === 'api') && typeof window !== 'undefined' && window.__JIT_SENTRY__) {
    try { window.__JIT_SENTRY__.captureMessage(`[${LEVELS[level].label}] ${safeString(args)}`); } catch { /* noop */ }
  }

  listeners.forEach((cb) => {
    try { cb(buffer); } catch { /* noop */ }
  });
  return entry;
}

export const logger = {
  debug: (...a) => notify('debug', a),
  info: (...a) => notify('info', a),
  warn: (...a) => notify('warn', a),
  error: (...a) => notify('error', a),
  api: (...a) => notify('api', a),

  /** Subscribe to log updates; returns an unsubscribe fn. */
  subscribe(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },

  /** Current log snapshot. */
  getLogs() {
    return buffer;
  },

  /** Clear the in-memory buffer. */
  clear() {
    buffer = [];
    listeners.forEach((cb) => {
      try { cb(buffer); } catch { /* noop */ }
    });
  },

  /** Filter overlay by minimum level (use logger.LEVELS weights). */
  setMinLevelWeight(w) {
    minLevelWeight = w;
  },

  getMinLevelWeight() {
    return minLevelWeight;
  },

  LEVELS,
};

export default logger;
