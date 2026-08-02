import pool from '../config/database.js';

const BANNED_OPTION = /^(i come on|don't know|dont know|know|не знаю|знаю|yes|no|да|нет)$/i;

function optionsOf(value) {
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean);
  if (typeof value === 'string') {
    try { return optionsOf(JSON.parse(value)); } catch { return []; }
  }
  if (value && Array.isArray(value.options)) return optionsOf(value.options);
  return [];
}

function auditQuestion(row) {
  const flags = [];
  const options = optionsOf(row.options);
  const normalized = options.map(option => option.toLowerCase());

  if (!row.question_text?.trim()) flags.push('missing_question');
  if (!row.short_answer?.trim()) flags.push('missing_short_answer');
  if (options.length < 3) flags.push('not_enough_options');
  if (new Set(normalized).size !== normalized.length) flags.push('duplicate_options');
  if (options.some(option => BANNED_OPTION.test(option))) flags.push('unrelated_option');
  if (options.some(option => option.toLowerCase() === row.question_text?.trim().toLowerCase())) flags.push('option_repeats_question');
  if (options.some(option => option.length < 3)) flags.push('short_option');

  return { flags, testReady: flags.length === 0 };
}

try {
  const { rows } = await pool.query(
    `SELECT id, question_text, short_answer, options
     FROM questions
     WHERE is_active = TRUE
     ORDER BY id`,
  );
  const summary = { total: rows.length, ready: 0, rejected: 0, flags: {} };

  for (const row of rows) {
    const result = auditQuestion(row);
    if (result.testReady) summary.ready += 1;
    else summary.rejected += 1;
    for (const flag of result.flags) summary.flags[flag] = (summary.flags[flag] || 0) + 1;

    await pool.query(
      `UPDATE questions
       SET test_ready = $1, quality_flags = $2::jsonb
       WHERE id = $3`,
      [result.testReady, JSON.stringify(result.flags), row.id],
    );
  }

  console.log(JSON.stringify(summary, null, 2));
} finally {
  await pool.end();
}
