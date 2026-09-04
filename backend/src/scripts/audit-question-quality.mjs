import pool from '../config/database.js';

// ─── Deterministic (rule-based) question quality audit ─────────────────
// Flags mechanically broken questions and writes test_ready + quality_flags
// into the questions table. Purely heuristic: use audit-questions-ai.mjs
// for semantic (AI) review of question text / answers.
// Bulk-writes via unnest() so 10k rows need only a handful of round trips.

const BATCH_SIZE = 1000;

const BANNED_OPTION = /^(i come on|don't know|dont know|know|not sure|maybe|не знаю|знаю|не уверен|возможно|yes|no|да|нет|true|false)$/i;

// Stub placeholder options that LLM-generated seed batches used instead of
// real distractors. A question whose only options are stubs is not usable in
// Test mode without real AI-generated options.
const STUB_OPTION = [
  /^alternative approach$/i,
  /^common misconception$/i,
  /^i don'?t know$/i,
  /^i know$/i,
  /^other$/i,
  /^all of the above$/i,
  /^none of the above$/i,
];

const MIN_QUESTION_LEN = 10;
const MIN_ANSWER_LEN = 8;

function optionsOf(value) {
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean);
  if (typeof value === 'string') {
    try { return optionsOf(JSON.parse(value)); } catch { return []; }
  }
  if (value && Array.isArray(value.options)) return optionsOf(value.options);
  return [];
}

// Remove punctuation / lowercase / collapse whitespace — used for "the same
// text" comparisons so minor formatting differences don't count as unique.
const normText = (s) => (s || '')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function hasControlChars(s) {
  // Tabs / newlines / CR are fine; other C0 control chars + DEL are not.
  for (const ch of s) {
    const code = ch.codePointAt(0);
    if (code === 0x09 || code === 0x0A || code === 0x0D) continue;
    if (code < 0x20 || code === 0x7F) return true;
  }
  return false;
}

function hasGarbageChars(s) {
  if (!s) return false;
  // Replacement char (mojibake), control chars, or no letters at all.
  if (s.includes('\uFFFD')) return true;
  if (hasControlChars(s)) return true;
  const letters = (s.match(/[\p{L}]/gu) || []).length;
  if (letters === 0 && s.trim().length > 0) return true; // no letters at all
  return false;
}

function auditQuestion(row, seenTexts) {
  const flags = [];
  const options = optionsOf(row.options);
  const normalized = options.map(option => option.toLowerCase());

  const question = (row.question_text || '').trim();
  const answer = (row.short_answer || '').trim();
  const lang = row.language || 'Java';
  const key = `${lang}::${normText(question)}`;

  if (!question) flags.push('missing_question');
  if (!answer) flags.push('missing_short_answer');
  if (question.length < MIN_QUESTION_LEN) flags.push('question_too_short');
  if (answer && answer.length < MIN_ANSWER_LEN) flags.push('answer_too_short');
  if (hasGarbageChars(question) || hasGarbageChars(answer)) flags.push('garbled_text');
  if (question && normText(question) === normText(answer)) flags.push('answer_repeats_question');

  if (options.length < 3) flags.push('not_enough_options');
  if (new Set(normalized).size !== normalized.length) flags.push('duplicate_options');
  if (options.some(option => BANNED_OPTION.test(option))) flags.push('unrelated_option');
  if (options.some(option => option.toLowerCase() === question.toLowerCase())) flags.push('option_repeats_question');
  if (options.some(option => option.length < 3)) flags.push('short_option');

  // Stub-only option sets — Test mode can't show these without AI options.
  if (options.length > 0 && options.every(opt => STUB_OPTION.some(re => re.test(opt)))) {
    flags.push('stub_only_options');
  }

  // Length bias: correct answer option (options[0]) is an extreme length outlier (> 2.5x average of other options)
  if (options.length >= 3) {
    const correctLen = options[0].length;
    const distractorLens = options.slice(1).map(o => o.length);
    const avgDistractor = distractorLens.reduce((a, b) => a + b, 0) / distractorLens.length;
    if (avgDistractor > 0 && correctLen > 2.5 * avgDistractor && correctLen - avgDistractor > 40) {
      flags.push('options_length_bias');
    }
  }

  // Exact duplicate question text within the same language.
  if (seenTexts.has(key)) flags.push('duplicate_question');
  else seenTexts.add(key);

  // question != answer but answer contains the whole question verbatim
  if (question && answer && answer.includes(question) && question.length > 30) {
    flags.push('answer_contains_question');
  }

  // Mixed question/answer languages — one is Cyrillic, the other isn't
  // (e.g. Russian question with an English answer). The bank mixes RU/EN
  // questions on purpose, but a single item must not mix them.
  const qCyr = /[\u0400-\u04FF]/.test(question);
  const aCyr = /[\u0400-\u04FF]/.test(answer);
  if (question && answer && qCyr !== aCyr) flags.push('mixed_language_qna');

  return { flags, testReady: flags.length === 0 };
}

async function bulkWrite(rows) {
  const ids = rows.map(r => r.id);
  const ready = rows.map(r => r.testReady);
  const flags = rows.map(r => JSON.stringify(r.flags));
  const CHUNK = 1000;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await pool.query(
      `UPDATE questions q
       SET test_ready = d.test_ready,
           quality_flags = d.flags::jsonb
       FROM (SELECT * FROM unnest($1::int[], $2::boolean[], $3::text[])
             AS t(id, test_ready, flags)) d
       WHERE q.id = d.id`,
      [ids.slice(i, i + CHUNK), ready.slice(i, i + CHUNK), flags.slice(i, i + CHUNK)],
    );
  }
}

try {
  const { rows } = await pool.query(
    `SELECT id, question_text, short_answer, options, language
     FROM questions
     WHERE is_active = TRUE
     ORDER BY id`,
  );
  const seenTexts = new Set();
  const summary = { total: rows.length, ready: 0, rejected: 0, flags: {} };

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const audited = batch.map(row => {
      const result = auditQuestion(row, seenTexts);
      if (result.testReady) summary.ready += 1;
      else summary.rejected += 1;
      for (const flag of result.flags) summary.flags[flag] = (summary.flags[flag] || 0) + 1;
      return { id: row.id, testReady: result.testReady, flags: result.flags };
    });
    await bulkWrite(audited);
    console.log(`  batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(rows.length / BATCH_SIZE)} done`);
  }

  console.log(JSON.stringify(summary, null, 2));
} finally {
  await pool.end();
}
