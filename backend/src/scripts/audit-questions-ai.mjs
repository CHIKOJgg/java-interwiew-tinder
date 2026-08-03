import pool from '../config/database.js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { callOpenRouter, parseAIResponse } from '../services/aiService.js';

// ─── AI-based semantic question audit ──────────────────────────────────
// Reviews every active question (question_text + short_answer) with an LLM
// and flags garbage: wrong answers, fragments, statements, gibberish,
// mixed-language items, near-duplicate meanings.
//
// Usage:
//   node src/scripts/audit-questions-ai.mjs                  # audit + cache verdicts (no DB changes)
//   node src/scripts/audit-questions-ai.mjs --apply          # audit + apply flags/is_active
//   node src/scripts/audit-questions-ai.mjs --language Java --limit 200
//   node src/scripts/audit-questions-ai.mjs --random --limit 300
//
// Verdicts are ALWAYS cached in ai_cache (mode='audit') so interrupted runs
// resume without re-spending tokens, and --apply applies cached verdicts
// without calling the model again for already-reviewed questions.
// Model: AUDIT_MODEL env (fallback: OPENROUTER_MODEL). Budget ~100-200 tokens
// per question → a $1/M model costs ~$0.2 per 1000 questions.

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIT_MODE = 'audit';
const BATCH_SIZE = 40;
const MAX_ATTEMPTS = 2;
const DELAY_BETWEEN_BATCHES_MS = 300;
const MIN_SCORE_TO_KEEP = 6; // score < 6 → considered bad

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = { apply: false, language: null, limit: null, offset: 0, random: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--apply') flags.apply = true;
    else if (args[i] === '--language') flags.language = args[++i] || null;
    else if (args[i] === '--limit') flags.limit = parseInt(args[++i]) || null;
    else if (args[i] === '--offset') flags.offset = parseInt(args[++i]) || 0;
    else if (args[i] === '--random') flags.random = true;
    else if (args[i] === '--help') {
      console.log(`Usage: node audit-questions-ai.mjs [--apply] [--language <lang>] [--limit <n>] [--offset <n>] [--random]`);
      process.exit(0);
    }
  }
  return flags;
}

const SYSTEM_PROMPT = `You are a strict reviewer of a programming interview question bank.
Each item is: ID | QUESTION | ANSWER
Judge ONLY the question-answer pair, not its options.
The bank deliberately mixes Russian and English questions — a Russian question
with a Russian answer is FINE. Only flag language problems when question and
answer are in DIFFERENT languages (mixed-language item = broken).

Mark ok=true ONLY if BOTH are true:
1. The question makes sense as an interview question for the target language/topic.
2. The answer is correct, complete enough, and matches the question.

Mark deactivate=true when the item is garbage and should be REMOVED from the product:
- gibberish / broken encoding / truncated text / nonsense wording
- empty or placeholder answer ("...", "TODO", "N/A", "lorem ipsum")
- answer is clearly WRONG for the question
- the question is a fragment, a bare keyword, or a statement that cannot be asked as an interview question (e.g. "Sequences?", "Granular reactivity without full re-renders.")
- question and answer are in different languages from each other
- the item is a meaningless duplicate of another item in the same batch (same meaning, different wording)
- topic is irrelevant to programming interviews

Output ONLY valid JSON (no markdown fences):
[{"id": 123, "ok": true, "deactivate": false, "score": 8, "issues": ["minor wording"]}]`;

function buildUserPrompt(batch) {
  const lines = batch.map(q => `${q.id} | ${q.question_text} | ${q.short_answer}`).join('\n');
  return `Review these questions:\n${lines}`;
}

async function auditBatch(batch, model) {
  let lastErr = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const content = await callOpenRouter(SYSTEM_PROMPT, buildUserPrompt(batch), 4000, 0.1, model);
      const parsed = parseAIResponse(content);
      if (!Array.isArray(parsed)) throw new Error('Expected JSON array from audit model');
      return parsed;
    } catch (err) {
      lastErr = err;
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

const isBad = (v) => Boolean(v?.deactivate || (typeof v?.score === 'number' && v.score < MIN_SCORE_TO_KEEP));

// Cache verdicts for a batch (always — dry-run and apply alike).
async function cacheVerdicts(items) {
  const ids = items.map(i => i.id);
  const languages = items.map(i => i.language);
  const responses = items.map(i => JSON.stringify(i.verdict));
  const model = process.env.AUDIT_MODEL || process.env.OPENROUTER_MODEL || 'audit';
  await pool.query(
    `INSERT INTO ai_cache (cluster_id, mode, model, prompt_version, language, response)
     SELECT 'audit:' || d.id::text, 'audit', $1, 'v2', d.language, d.response
     FROM unnest($2::int[], $3::text[], $4::text[]) AS d(id, language, response)
     ON CONFLICT DO NOTHING`,
    [model, ids, languages, responses],
  );
}

// Apply verdicts to questions (flags + is_active) in bulk.
async function applyVerdicts(items) {
  const ids = items.map(i => i.id);
  const flags = items.map(i => JSON.stringify(
    isBad(i.verdict)
      ? ['ai_review', 'ai_bad', ...(i.verdict.issues || []).slice(0, 5).map(x => `ai_issue:${String(x).slice(0, 40)}`)]
      : ['ai_review'],
  ));
  const deactivates = items.map(i => isBad(i.verdict));
  await pool.query(
    `UPDATE questions q
     SET quality_flags = COALESCE(q.quality_flags, '[]'::jsonb) || d.flags::jsonb,
         is_active = CASE WHEN d.deactivate THEN FALSE ELSE q.is_active END
     FROM (SELECT * FROM unnest($1::int[], $2::text[], $3::boolean[])
           AS t(id, flags, deactivate)) d
     WHERE q.id = d.id`,
    [ids, flags, deactivates],
  );
}

// Phase 1: review questions that don't have a cached verdict yet.
async function auditNew(flags) {
  const params = [];
  let p = 1;
  let languageWhere = '';
  if (flags.language) { languageWhere = `AND language = $${p++}`; params.push(flags.language); }
  let limitSql = '';
  if (flags.limit) { limitSql = `LIMIT $${p++}`; params.push(flags.limit); }
  const offsetSql = `OFFSET $${p}`;
  params.push(flags.offset);

  const { rows } = await pool.query(
    `SELECT id, question_text, short_answer, category, language
     FROM questions
     WHERE is_active = TRUE
       ${languageWhere}
       AND id NOT IN (
         SELECT DISTINCT (regexp_replace(cluster_id, '^audit:', ''))::bigint
         FROM ai_cache
         WHERE mode = 'audit' AND prompt_version = 'v2' AND cluster_id LIKE 'audit:%'
       )
     ORDER BY ${flags.random ? 'random()' : 'id'}
     ${limitSql}
     ${offsetSql}`,
    params,
  );

  if (rows.length === 0) {
    console.log('Phase 1: nothing new to audit (all active questions already have a cached verdict).');
    return { reviewed: 0, bad: 0, errors: 0, report: [] };
  }

  console.log(`Phase 1: auditing ${rows.length} questions (model=${process.env.AUDIT_MODEL || process.env.OPENROUTER_MODEL || 'default'}${flags.apply ? ', apply=ON' : ''})...`);

  const report = [];
  let reviewed = 0;
  let bad = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    let verdicts;
    try {
      verdicts = await auditBatch(batch, process.env.AUDIT_MODEL || process.env.OPENROUTER_MODEL || null);
    } catch (err) {
      errors += batch.length;
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${err.message.slice(0, 120)} — skipped (${batch.length} questions untouched, will retry next run)`);
      continue;
    }

    const byId = new Map(verdicts.map(v => [Number(v.id), v]));
    const items = [];
    for (const q of batch) {
      reviewed++;
      const verdict = byId.get(q.id) || { ok: true, deactivate: false, score: null, issues: [] };
      if (isBad(verdict)) {
        bad++;
        report.push({ id: q.id, language: q.language, category: q.category, question: q.question_text, answer: q.short_answer, score: verdict.score, issues: verdict.issues || [] });
      }
      items.push({ id: q.id, language: q.language, verdict });
    }
    try {
      await cacheVerdicts(items);
      if (flags.apply) await applyVerdicts(items);
    } catch (err) {
      console.error(`DB write failed for batch ${Math.floor(i / BATCH_SIZE) + 1}: ${err.message}`);
    }

    console.log(`  batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(rows.length / BATCH_SIZE)}: reviewed=${reviewed} bad=${bad} errors=${errors}`);
    await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES_MS));
  }

  return { reviewed, bad, errors, report };
}

// Phase 2 (--apply): apply ALL cached verdicts to the questions table.
async function applyCached() {
  const { rows } = await pool.query(
    `SELECT cluster_id, language, response
     FROM ai_cache
     WHERE mode = 'audit' AND prompt_version = 'v2' AND cluster_id LIKE 'audit:%'`,
  );
  if (rows.length === 0) {
    console.log('Phase 2: no cached verdicts to apply.');
    return;
  }
  const items = [];
  let parseErrors = 0;
  for (const row of rows) {
    const id = parseInt(row.cluster_id.replace('audit:', ''), 10);
    if (!Number.isInteger(id)) continue;
    try {
      items.push({ id, language: row.language, verdict: JSON.parse(row.response) });
    } catch {
      parseErrors++;
    }
  }
  const CHUNK = 500;
  for (let i = 0; i < items.length; i += CHUNK) {
    await applyVerdicts(items.slice(i, i + CHUNK));
  }
  const badCount = items.filter(i => isBad(i.verdict)).length;
  console.log(`Phase 2: applied ${items.length} cached verdicts (bad=${badCount}, parse errors=${parseErrors}).`);
}

try {
  const flags = parseArgs();
  const { reviewed, bad, errors, report } = await auditNew(flags);

  if (flags.apply) {
    await applyCached();
  }

  const reportPath = join(__dirname, 'audit-ai-report.json');
  writeFileSync(reportPath, JSON.stringify({ runAt: new Date().toISOString(), apply: flags.apply, reviewed, bad, errors, questions: report }, null, 2));
  console.log(`\nDone: reviewed=${reviewed} bad=${bad} skipped(api errors)=${errors}`);
  console.log(`Report: ${reportPath}`);
  if (flags.apply) {
    console.log('Applied: reviewed verdicts written — bad questions flagged (ai_bad) and deactivated (is_active=FALSE).');
  } else {
    console.log('Dry-run: verdicts cached (resumable), no question changes made. Re-run with --apply to apply.');
  }

  const issueCounts = {};
  for (const q of report) for (const i of (q.issues || [])) {
    const key = String(i).slice(0, 60);
    issueCounts[key] = (issueCounts[key] || 0) + 1;
  }
  console.log('\nTop issues:');
  Object.entries(issueCounts).sort((a, b) => b[1] - a[1]).slice(0, 15)
    .forEach(([issue, count]) => console.log(`  ${count}x  ${issue}`));
} finally {
  await pool.end();
}
