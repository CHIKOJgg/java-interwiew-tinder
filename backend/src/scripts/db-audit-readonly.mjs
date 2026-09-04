import pool from '../config/database.js';

// ─── Read-only DB audit pack ─────────────────────────────────────────────
// Prints ONLY aggregate counts as JSON. No writes, no DDL, no secrets.
// Run on prod via Railway dashboard → backend service → Shell:
//   node src/scripts/db-audit-readonly.mjs
// Paste the JSON output back for the question-bank gap analysis.

const queries = {
  lang_active_ru_en: `
    SELECT language, is_active,
     COUNT(*) FILTER (WHERE question_text ~ '[^ -~]' AND short_answer ~ '[^ -~]') AS ru,
     COUNT(*) FILTER (WHERE question_text !~ '[^ -~]' AND short_answer !~ '[^ -~]') AS en,
     COUNT(*) FILTER (WHERE (question_text ~ '[^ -~]') <> (short_answer ~ '[^ -~]')) AS mixed,
     COUNT(*) AS total FROM questions GROUP BY 1,2 ORDER BY 1,2`,
  lang_difficulty: `
    SELECT language, COALESCE(difficulty,'(null)') AS difficulty, COUNT(*) AS n
    FROM questions WHERE is_active = TRUE GROUP BY 1,2 ORDER BY 1,2`,
  null_category: `
    SELECT language, COUNT(*) AS n FROM questions
    WHERE is_active = TRUE AND (category IS NULL OR btrim(category) = '') GROUP BY 1 ORDER BY 1`,
  options_presence: `
    SELECT language,
     COUNT(*) FILTER (WHERE options IS NULL) AS options_null,
     COUNT(*) FILTER (WHERE options IS NOT NULL AND jsonb_array_length(CASE WHEN jsonb_typeof(options::jsonb)='array' THEN options::jsonb ELSE '[]'::jsonb END) >= 3) AS options_ge3,
     COUNT(*) AS total FROM questions WHERE is_active = TRUE GROUP BY 1 ORDER BY 1`,
  mode_data: `
    SELECT language,
     COUNT(*) FILTER (WHERE bug_hunting_data IS NOT NULL) AS bug,
     COUNT(*) FILTER (WHERE blitz_data IS NOT NULL) AS blitz,
     COUNT(*) FILTER (WHERE code_completion_data IS NOT NULL) AS code,
     COUNT(*) FILTER (WHERE cached_explanation IS NOT NULL AND cached_explanation <> '') AS expl,
     COUNT(*) AS total FROM questions WHERE is_active = TRUE GROUP BY 1 ORDER BY 1`,
  quality_flags: `
    SELECT language, COALESCE(test_ready::text,'(null)') AS test_ready, COUNT(*) AS n
    FROM questions WHERE is_active = TRUE GROUP BY 1,2 ORDER BY 1,2`,
  short_answers: `
    SELECT language,
     COUNT(*) FILTER (WHERE short_answer IS NULL OR length(btrim(short_answer)) < 8) AS lt8,
     COUNT(*) FILTER (WHERE length(btrim(short_answer)) BETWEEN 8 AND 19) AS b8_19,
     COUNT(*) FILTER (WHERE length(btrim(question_text)) < 10) AS qlt10,
     COUNT(*) AS total FROM questions WHERE is_active = TRUE GROUP BY 1 ORDER BY 1`,
  dup_count: `
    SELECT COUNT(*) AS dup_groups, SUM(n-1) AS extra_rows FROM (
     SELECT language, lower(regexp_replace(question_text, '\\s+', ' ', 'g')) AS norm, COUNT(*) AS n
     FROM questions WHERE is_active = TRUE AND question_text IS NOT NULL
     GROUP BY 1,2 HAVING COUNT(*) > 1) s`,
  duplicates_top: `
    SELECT language, left(lower(regexp_replace(question_text, '\\s+', ' ', 'g')), 80) AS norm, COUNT(*) AS n
    FROM questions WHERE is_active = TRUE AND question_text IS NOT NULL
    GROUP BY 1,2 HAVING COUNT(*) > 1 ORDER BY n DESC LIMIT 20`,
  tracks: `SELECT language, COUNT(*) AS tracks FROM learning_tracks WHERE is_active = TRUE GROUP BY 1 ORDER BY 1`,
  track_steps: `
    SELECT lt.language, lt.name AS track, COUNT(ts.id) AS steps,
     COUNT(*) FILTER (WHERE q.id IS NULL OR q.is_active = FALSE) AS dead_steps
    FROM learning_tracks lt
    LEFT JOIN track_steps ts ON ts.track_id = lt.id
    LEFT JOIN questions q ON q.id = ts.question_id
    WHERE lt.is_active = TRUE
    GROUP BY 1,2 ORDER BY 1,2`,
  sd_per_lang: `SELECT language, COUNT(*) AS n FROM system_design_topics WHERE is_active = TRUE GROUP BY 1 ORDER BY 1`,
  companies: `SELECT COUNT(*) AS n FROM company_list`,
  totals: `SELECT COUNT(*) AS all_rows, COUNT(*) FILTER (WHERE is_active = TRUE) AS active FROM questions`,
};

const out = {};
for (const [name, sql] of Object.entries(queries)) {
  try {
    const r = await pool.query(sql);
    out[name] = r.rows;
  } catch (e) { out[name] = { error: e.message }; }
}
// System-design / challenge tables may have different names — probe, don't fail.
for (const t of ['system_design_topics', 'sd_topics', 'weekly_challenges', 'challenges']) {
  try {
    const r = await pool.query(`SELECT COUNT(*) AS n FROM ${t}`);
    out['table_' + t] = r.rows;
  } catch (e) { out['table_' + t] = { error: e.message }; }
}
console.log(JSON.stringify(out));
await pool.end().catch(() => {});
