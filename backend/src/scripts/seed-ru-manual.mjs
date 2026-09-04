import pool from '../config/database.js';
import { questions as ts1 } from './seed-ru-ts1.mjs';
import { questions as ts2 } from './seed-ru-ts2.mjs';
import { questions as ts3 } from './seed-ru-ts3.mjs';
import { questions as ts4 } from './seed-ru-ts4.mjs';
import { questions as go1 } from './seed-ru-go1.mjs';
import { questions as go2 } from './seed-ru-go2.mjs';
import { questions as go3 } from './seed-ru-go3.mjs';
import { questions as go4 } from './seed-ru-go4.mjs';
import { questions as go5 } from './seed-ru-go5.mjs';
import { questions as go6 } from './seed-ru-go6.mjs';
import { questions as rust1 } from './seed-ru-rust1.mjs';
import { questions as rust2 } from './seed-ru-rust2.mjs';
import { questions as rust3 } from './seed-ru-rust3.mjs';
import { questions as rust4 } from './seed-ru-rust4.mjs';
import { questions as react1 } from './seed-ru-react1.mjs';
import { questions as react2 } from './seed-ru-react2.mjs';
import { questions as react3 } from './seed-ru-react3.mjs';
import { questions as kotlin1 } from './seed-ru-kotlin1.mjs';
import { questions as kotlin2 } from './seed-ru-kotlin2.mjs';
import { questions as kotlin3 } from './seed-ru-kotlin3.mjs';

// ─── One-command seeder for all hand-authored RU batches ─────────────────
// Railway Shell:  node src/scripts/seed-ru-manual.mjs
// Idempotent: ON CONFLICT (question_text, language) DO NOTHING.
const all = [ts1, ts2, ts3, ts4, go1, go2, go3, go4, go5, go6, rust1, rust2, rust3, rust4, react1, react2, react3, kotlin1, kotlin2, kotlin3].flat();

try {
  let inserted = 0, skipped = 0;
  const perLang = {};
  for (const q of all) {
    const r = await pool.query(
      `INSERT INTO questions (category, question_text, short_answer, options, difficulty, language, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE)
       ON CONFLICT (question_text, language) DO NOTHING`,
      [q.category, q.question, q.short_answer, JSON.stringify(q.options), q.difficulty, q.language]
    );
    if (r.rowCount > 0) { inserted++; perLang[q.language] = (perLang[q.language] || 0) + 1; }
    else skipped++;
  }
  console.log(JSON.stringify({ total: all.length, inserted, skipped, perLang }));
} catch (e) {
  console.error('SEED FAILED: ' + e.message);
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => {});
}
