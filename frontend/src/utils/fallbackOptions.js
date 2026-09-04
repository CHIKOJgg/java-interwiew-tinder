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
  const correctLen = correct.length || 40;
  const picked = [];
  const used = new Set([correctNorm]);

  // Anti-bias: filter and sort distractorPool candidates by character length similarity
  // to avoid making the correct answer an obvious length outlier.
  const candidates = (distractorPool || [])
    .filter(item => {
      const n = norm(item?.text);
      return n && n.length >= 8 && !used.has(n);
    })
    .map(item => ({
      text: item.text,
      lenDiff: Math.abs(item.text.length - correctLen),
      ratio: item.text.length / (correctLen || 1),
    }))
    // Prefer candidates whose length is within 0.5x to 1.8x of correct answer
    .filter(c => c.ratio >= 0.4 && c.ratio <= 2.2);

  // Shuffle within buckets to keep variety while matching lengths
  const sorted = candidates.sort((a, b) => (a.lenDiff - b.lenDiff) + (Math.random() * 20 - 10));

  for (const item of sorted) {
    if (picked.length >= 3) break;
    const n = norm(item.text);
    if (!used.has(n)) {
      used.add(n);
      picked.push(item.text);
    }
  }

  // Fallback: if pool is small, take any remaining valid items
  if (picked.length < 3) {
    for (const item of distractorPool || []) {
      if (picked.length >= 3) break;
      const n = norm(item?.text);
      if (n && n.length >= 5 && !used.has(n)) {
        used.add(n);
        picked.push(item.text);
      }
    }
  }

  if (picked.length < 3) return [];
  return shuffle([correct, ...picked]);
}
