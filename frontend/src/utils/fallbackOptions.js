// Instant Test-mode options.
// Real AI-generated distractors are used when available; otherwise options
// are synthesized from other questions' short answers (the distractor pool),
// so Test mode NEVER waits on the LLM — exactly like Blitz's local fallback.
// AI options still arrive in the background and are cached for next time.

import { realDistractors } from './stubOptions';

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const norm = (s) => (s || '').trim().toLowerCase();

// Returns [correct, ...3 distractors] or [] when not enough material exists
// (real distractors preferred, then the local pool).
export function buildTestOptions(question, distractorPool = []) {
  if (!question) return [];
  const correct = question.shortAnswer || '';
  const wrongs = realDistractors(question.options, correct).slice(0, 3);
  if (wrongs.length >= 3) return shuffle([correct, ...wrongs]);

  const correctNorm = norm(correct);
  const picked = [];
  const used = new Set([correctNorm]);
  const order = (distractorPool || []).map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (const idx of order) {
    if (picked.length >= 3) break;
    const n = norm(distractorPool[idx]?.text);
    if (!n || n.length < 3 || used.has(n)) continue;
    used.add(n);
    picked.push(distractorPool[idx].text);
  }
  if (picked.length < 3) return [];
  return shuffle([correct, ...picked]);
}
