// Placeholder distractors used when a question was seeded without real answer
// options (see gen_batch*.py: 'Common misconception', 'Alternative approach',
// "I don't know", ...). Showing them in tests makes the correct answer obvious,
// so such questions must never render as-is: they either get real options
// generated on demand, or are skipped.

const STUB_OPTIONS = new Set([
  'alternative approach',
  'common misconception',
  "i don't know",
  'i dont know',
  'not applicable',
  'n/a',
  'unsure',
]);

export function isStubOption(option) {
  return STUB_OPTIONS.has(String(option || '').trim().toLowerCase());
}

// A question is "test-ready" when it has at least 3 distractors that are
// neither the correct answer nor placeholders.
export function hasRealDistractors(options, correctAnswer = '') {
  if (!Array.isArray(options)) return false;
  const norm = (s) => String(s || '').trim().toLowerCase();
  const correct = norm(correctAnswer);
  let real = 0;
  for (const o of options) {
    const n = norm(o);
    if (!n || n === correct || isStubOption(o)) continue;
    real += 1;
  }
  return real >= 3;
}

// Real distractors only (drops the correct answer and stub placeholders).
export function realDistractors(options, correctAnswer = '') {
  if (!Array.isArray(options)) return [];
  const norm = (s) => String(s || '').trim().toLowerCase();
  const correct = norm(correctAnswer);
  return options.filter((o) => {
    const n = norm(o);
    return n && n !== correct && !isStubOption(o);
  });
}
