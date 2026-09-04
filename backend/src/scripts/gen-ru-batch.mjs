import pool from '../config/database.js';
import { callOpenRouter } from '../services/aiService.js';

// ─── RU batch generator to ~300 RU questions per language ─────────────────
// Fills per-category deficits (see TARGETS) with Russian Q&A via OpenRouter.
// Safe to re-run: dedupes against DB + within batch, idempotent INSERT.
//
// Usage (Railway Shell, has DATABASE_URL + OPENROUTER_API_KEY):
//   node src/scripts/gen-ru-batch.mjs --language TypeScript
//   node src/scripts/gen-ru-batch.mjs --language Go --limit 40 --dry-run
//   node src/scripts/gen-ru-batch.mjs --all --limit 60
//
// Cost: ~10 Q&A per model call, ~400-600 tokens each on the fast model.

const BATCH = 10;
const DELAY_MS = 2000;

const TARGETS = {
  TypeScript: {
    'TypeScript Core': 30, 'Type System': 45, Generics: 40, Decorators: 15,
    'React + TypeScript': 20, 'Node.js': 25, NestJS: 15, OOP: 15,
    'Async/Await': 15, Testing: 10, 'Design Patterns': 10, Modules: 10,
    'Advanced Types': 50,
  },
  Go: {
    'Go Core': 45, 'Concurrency / Goroutines': 55, Channels: 30, Interfaces: 30,
    Packages: 20, Testing: 20, 'Web (net/http)': 25, Middleware: 15,
    'ORM (GORM)': 12, 'Design Patterns': 12, Database: 15, 'Error Handling': 12,
    'Go 1.20+ features': 12,
  },
  Rust: {
    'Rust Core': 35, 'Ownership & Borrowing': 35, Lifetimes: 30, Traits: 30,
    'Enums & Pattern Matching': 25, 'Async/Await': 20, 'Unsafe Rust': 15,
    Cargo: 10, Testing: 15, 'Web (Actix/Axum)': 12, 'Design Patterns': 10,
    'Error Handling': 15, Concurrency: 25, Generics: 12, Macros: 14,
  },
  React: {
    'React Core': 50, Hooks: 55, 'State Management': 35, 'Context API': 20,
    'Redux / Zustand': 25, 'TypeScript + React': 20, 'Next.js': 25,
    'Testing (RTL)': 20, Performance: 20, 'Design Patterns in React': 12,
    'Server Components': 12, 'React Native': 16,
  },
  Kotlin: {
    'Kotlin Core': 35, Coroutines: 30, 'Null Safety': 22, DSL: 12,
    Android: 22, 'Spring Boot': 20, Ktor: 14, Multiplatform: 10,
    Testing: 10, 'Design Patterns': 14, 'Extension Functions': 12,
    'Sealed Classes': 12, Collections: 25, OOP: 20, 'Kotlin Advanced': 44,
  },
};

const RU = new RegExp('[^ -~]');
const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

function parseArgs() {
  const a = process.argv.slice(2);
  const f = { language: null, all: false, limit: null, dryRun: false };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--language') f.language = a[++i] || null;
    else if (a[i] === '--all') f.all = true;
    else if (a[i] === '--limit') f.limit = parseInt(a[++i]) || null;
    else if (a[i] === '--dry-run') f.dryRun = true;
    else if (a[i] === '--help') {
      console.log('Usage: gen-ru-batch.mjs --language X|--all [--limit N] [--dry-run]');
      process.exit(0);
    }
  }
  return f;
}

function buildPrompt(language, category, difficulty, n) {
  return `Сгенерируй ${n} РАЗНЫХ вопросов для собеседования по ${language} на РУССКОМ языке.
Тема: ${category}. Уровень: ${difficulty}.
Формат ответа — ТОЛЬКО валидный JSON-массив, без markdown и пояснений:
[{"question": "...", "short_answer": "...", "options": ["правильный ответ", "неверный 1", "неверный 2", "неверный 3"]}]
Правила:
- question и short_answer — на русском (код и термины латиницей допустимы внутри русского текста).
- short_answer: 1-3 предложения, конкретные факты.
- options: ровно 4 варианта, ПЕРВЫЙ — правильный и близкий к short_answer, остальные правдоподобные, но однозначно неверные.
- Junior: базовые понятия и синтаксис. Middle: практика, стандартная библиотека, фреймворки. Senior: внутренности, архитектура, оптимизация.
- Никаких повторов и почти-дубликатов внутри ответа.`;
}

async function genBatch(language, category, difficulty, n, model) {
  const { parseAIResponse } = await import('../services/aiService.js');
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const content = await callOpenRouter(
        'Ты генератор вопросов для собеседований. Отвечаешь ТОЛЬКО валидным JSON-массивом.',
        buildPrompt(language, category, difficulty, n),
        4000, 0.6, model
      );
      const parsed = parseAIResponse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      throw new Error('Expected non-empty JSON array');
    } catch (e) {
      console.log(`  retry ${attempt + 1} (${category}/${difficulty}): ${e.message.slice(0, 120)}`);
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
    }
  }
  return [];
}

function validItem(it) {
  if (!it || typeof it.question !== 'string' || typeof it.short_answer !== 'string') return false;
  if (!RU.test(it.question) || !RU.test(it.short_answer)) return false;
  if (it.question.trim().length < 10 || it.short_answer.trim().length < 8) return false;
  if (!Array.isArray(it.options) || it.options.length !== 4) return false;
  if (it.options.some((o) => typeof o !== 'string' || o.trim().length < 2)) return false;
  return true;
}

try {
  const flags = parseArgs();
  const model = process.env.OPENROUTER_MODEL_FAST || process.env.OPENROUTER_MODEL;
  const languages = flags.all ? Object.keys(TARGETS) : [flags.language];
  if (!languages[0] || !TARGETS[languages[0]]) throw new Error('Unknown language. Use --language <one of ' + Object.keys(TARGETS).join(',') + '> or --all');
  let budget = flags.limit || Infinity;
  let inserted = 0, skipped = 0;

  for (const language of languages) {
    if (budget <= 0) break;
    const { rows: existing } = await pool.query(
      `SELECT category, difficulty, lower(regexp_replace(question_text, '\\s+', ' ', 'g')) AS norm
       FROM questions WHERE language = $1 AND question_text ~ '[^ -~]'`,
      [language]
    );
    const seen = new Set(existing.map((r) => r.norm));
    const have = {};
    for (const r of existing) {
      const k = r.category + '::' + r.difficulty;
      have[k] = (have[k] || 0) + 1;
    }
    console.log(`== ${language}: RU in DB = ${existing.length}`);
    // 35/45/20 split per category target
    const plan = [];
    for (const [cat, total] of Object.entries(TARGETS[language])) {
      const j = Math.round(total * 0.35), m = Math.round(total * 0.45);
      const s = Math.max(0, total - j - m);
      for (const [diff, need] of [['Junior', j], ['Middle', m], ['Senior', s]]) {
        const deficit = need - (have[cat + '::' + diff] || 0);
        if (deficit > 0) plan.push({ cat, diff, deficit });
      }
    }
    // Seniors first (the thinnest slice), then Middle, Junior
    const order = { Senior: 0, Middle: 1, Junior: 2 };
    plan.sort((a, b) => order[a.diff] - order[b.diff]);
    console.log(`   deficit items: ${plan.reduce((x, p) => x + p.deficit, 0)}`);

    for (const { cat, diff, deficit } of plan) {
      let need = deficit;
      while (need > 0 && budget > 0) {
        const n = Math.min(BATCH, need, budget);
        const items = await genBatch(language, cat, diff, n, model);
        const fresh = [];
        for (const it of items) {
          if (!validItem(it)) { skipped++; continue; }
          const key = norm(it.question);
          if (seen.has(key)) { skipped++; continue; }
          seen.add(key);
          fresh.push(it);
        }
        if (flags.dryRun) {
          console.log(`   [dry] ${cat}/${diff}: got ${items.length}, valid-new ${fresh.length}`);
          if (fresh[0]) console.log('   ex: ' + fresh[0].question.slice(0, 90));
        } else {
          for (const it of fresh) {
            await pool.query(
              `INSERT INTO questions (category, question_text, short_answer, options, difficulty, language, is_active)
               VALUES ($1,$2,$3,$4,$5,$6,TRUE)
               ON CONFLICT (question_text, language) DO NOTHING`,
              [cat, it.question.trim(), it.short_answer.trim(), JSON.stringify(it.options), diff, language]
            );
            inserted++; budget--;
          }
          console.log(`   +${fresh.length} ${cat}/${diff} (need was ${need})`);
        }
        need -= fresh.length;
        if (items.length === 0) break; // model failing — move on
        if (!flags.dryRun) await new Promise((r) => setTimeout(r, DELAY_MS));
        if (flags.dryRun) break;
      }
      if (budget <= 0) break;
    }
  }
  console.log(`DONE inserted=${inserted} skipped_invalid_or_dup=${skipped}`);
} catch (e) {
  console.error('FATAL: ' + e.message);
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => {});
}
