import fs from 'fs';
import path from 'path';
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'sakura.proxy.rlwy.net',
  port: 51526,
  user: 'postgres',
  password: 'DODKkFhwtlhGLrdmAYYWWMTEMPyxhHLD',
  database: 'railway',
  ssl: false,
  connectionTimeoutMillis: 30000,
  query_timeout: 120000,
});

const STUB_PATTERNS = [
  'common misconception',
  'alternative approach',
  "i don't know",
  'none of the above',
  'all of the above',
  'alternative',
  'misconception',
  'unsure',
  'not sure',
  'не знаю',
  'все вышеперечисленное',
  'ни один из вышеперечисленных',
  'затрудняюсь ответить'
];

function normalizeText(text) {
  if (!text) return '';
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function run() {
  console.log('🚀 Connecting to Railway PostgreSQL...');
  await client.connect();
  console.log('✅ Connected.');

  // =========================================================================
  // STEP 1: AUDIT & IDENTIFY ALL GARBAGE IN DB
  // =========================================================================
  console.log('\n--- STEP 1: Auditing all DB questions to find garbage ---');
  let lastId = 0;
  const allRows = [];
  while (true) {
    const res = await client.query(
      `SELECT id, category, difficulty, question_text, short_answer, options, language, is_active, test_ready
       FROM questions
       WHERE id > $1
       ORDER BY id ASC
       LIMIT 1000`,
      [lastId]
    );
    if (res.rows.length === 0) break;
    allRows.push(...res.rows);
    lastId = res.rows[res.rows.length - 1].id;
  }
  console.log(`Total questions loaded from DB: ${allRows.length}`);

  const garbageIdsToDeactivate = [];
  const cleanDbQuestions = [];
  const seenDbKeys = new Map();

  for (const q of allRows) {
    let isGarbage = false;

    // Check text length
    if (!q.question_text || q.question_text.trim().length < 10 || !q.short_answer || q.short_answer.trim().length < 3) {
      isGarbage = true;
    }

    // Check duplicate
    const key = `${(q.language || '').toLowerCase()}:${normalizeText(q.question_text)}`;
    if (!isGarbage) {
      if (seenDbKeys.has(key)) {
        isGarbage = true;
      } else {
        seenDbKeys.set(key, q.id);
      }
    }

    // Check options
    let opts = q.options;
    if (typeof opts === 'string') {
      try { opts = JSON.parse(opts); } catch { opts = null; }
    }

    if (!isGarbage) {
      if (!Array.isArray(opts) || opts.length !== 4) {
        isGarbage = true;
      } else {
        for (const opt of opts) {
          if (typeof opt !== 'string' || !opt.trim()) {
            isGarbage = true;
            break;
          }
          const low = opt.trim().toLowerCase();
          if (['alternative', 'misconception', 'unsure', 'other', 'none', 'не знаю'].includes(low)) {
            isGarbage = true;
            break;
          }
          for (const pattern of STUB_PATTERNS) {
            if (low.includes(pattern)) {
              isGarbage = true;
              break;
            }
          }
          if (isGarbage) break;
        }
      }
    }

    if (isGarbage) {
      if (q.is_active || q.test_ready) {
        garbageIdsToDeactivate.push(q.id);
      }
    } else {
      cleanDbQuestions.push({
        id: q.id,
        category: q.category,
        difficulty: q.difficulty || 'Junior',
        question_text: q.question_text,
        short_answer: q.short_answer,
        options: opts,
        language: q.language
      });
    }
  }

  console.log(`Found ${cleanDbQuestions.length} clean questions in DB.`);
  console.log(`Found ${garbageIdsToDeactivate.length} currently active garbage questions to deactivate.`);

  // =========================================================================
  // STEP 2: DEACTIVATE GARBAGE IN DB ("если мусор убирай")
  // =========================================================================
  if (garbageIdsToDeactivate.length > 0) {
    console.log(`\n--- STEP 2: Deactivating ${garbageIdsToDeactivate.length} garbage questions in DB ---`);
    // Batch in chunks of 1000
    const CHUNK_SIZE = 1000;
    let deactivatedCount = 0;
    for (let i = 0; i < garbageIdsToDeactivate.length; i += CHUNK_SIZE) {
      const chunk = garbageIdsToDeactivate.slice(i, i + CHUNK_SIZE);
      const res = await client.query(
        `UPDATE questions
         SET is_active = FALSE, test_ready = FALSE
         WHERE id = ANY($1::int[])`,
        [chunk]
      );
      deactivatedCount += res.rowCount;
      console.log(`  Deactivated ${deactivatedCount} / ${garbageIdsToDeactivate.length}...`);
    }
    console.log(`✅ Deactivated total: ${deactivatedCount} questions.`);
  }

  // Ensure clean questions in DB are active & test_ready
  console.log(`Ensuring all ${cleanDbQuestions.length} clean DB questions have is_active = TRUE, test_ready = TRUE...`);
  const cleanDbIds = cleanDbQuestions.map(q => q.id);
  for (let i = 0; i < cleanDbIds.length; i += 1000) {
    const chunk = cleanDbIds.slice(i, i + 1000);
    await client.query(
      `UPDATE questions
       SET is_active = TRUE, test_ready = TRUE
       WHERE id = ANY($1::int[])`,
      [chunk]
    );
  }
  console.log(`✅ Verified active status for clean DB questions.`);

  // =========================================================================
  // STEP 3: LOAD & MERGE WITH LOCAL DATASET ("если не мусор добавляй")
  // =========================================================================
  console.log('\n--- STEP 3: Merging clean DB questions with local dataset ---');
  const localQuestionsPath = path.resolve('data/questions-data.json');
  const localData = JSON.parse(fs.readFileSync(localQuestionsPath, 'utf-8'));
  console.log(`Local questions-data.json count: ${localData.length}`);

  const masterList = [];
  const masterKeys = new Set();

  // Add local questions first
  for (const q of localData) {
    const key = `${(q.language || '').toLowerCase()}:${normalizeText(q.question)}`;
    if (!masterKeys.has(key)) {
      masterKeys.add(key);
      masterList.push({
        category: q.category,
        difficulty: q.difficulty || 'Junior',
        question: q.question,
        short_answer: q.short_answer,
        options: q.options,
        language: q.language
      });
    }
  }
  console.log(`Master list after adding local questions: ${masterList.length}`);

  // Add clean DB questions
  let addedFromDb = 0;
  for (const q of cleanDbQuestions) {
    const key = `${(q.language || '').toLowerCase()}:${normalizeText(q.question_text)}`;
    if (!masterKeys.has(key)) {
      masterKeys.add(key);
      masterList.push({
        category: q.category,
        difficulty: q.difficulty || 'Junior',
        question: q.question_text,
        short_answer: q.short_answer,
        options: q.options,
        language: q.language
      });
      addedFromDb++;
    }
  }
  console.log(`Added ${addedFromDb} new clean questions from DB into master list.`);
  console.log(`Master list total clean questions: ${masterList.length}`);

  // =========================================================================
  // STEP 4: UPSERT MISSING LOCAL QUESTIONS INTO RAILWAY POSTGRESQL
  // =========================================================================
  console.log('\n--- STEP 4: Adding missing clean questions into DB ---');
  // Determine which questions in masterList are not in cleanDbQuestions
  const existingInDbKeys = new Set(
    cleanDbQuestions.map(q => `${(q.language || '').toLowerCase()}:${normalizeText(q.question_text)}`)
  );

  const missingFromDb = masterList.filter(
    q => !existingInDbKeys.has(`${(q.language || '').toLowerCase()}:${normalizeText(q.question)}`)
  );
  console.log(`Clean questions from master list to insert into DB: ${missingFromDb.length}`);

  if (missingFromDb.length > 0) {
    let insertedCount = 0;
    for (const q of missingFromDb) {
      await client.query(
        `INSERT INTO questions (
          category, difficulty, question_text, short_answer, options, language, is_active, test_ready
        ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, TRUE, TRUE)
        ON CONFLICT (question_text, language) DO UPDATE SET
          category = EXCLUDED.category,
          difficulty = EXCLUDED.difficulty,
          short_answer = EXCLUDED.short_answer,
          options = EXCLUDED.options,
          is_active = TRUE,
          test_ready = TRUE`,
        [
          q.category,
          q.difficulty,
          q.question,
          q.short_answer,
          JSON.stringify(q.options),
          q.language
        ]
      );
      insertedCount++;
      if (insertedCount % 200 === 0 || insertedCount === missingFromDb.length) {
        console.log(`  Processed ${insertedCount} / ${missingFromDb.length}...`);
      }
    }
    console.log(`✅ Successfully inserted/updated ${insertedCount} questions in DB.`);
  }

  // =========================================================================
  // STEP 5: SAVE MASTER LIST TO data/questions-data.json
  // =========================================================================
  console.log('\n--- STEP 5: Saving updated master list to data/questions-data.json ---');
  fs.writeFileSync(localQuestionsPath, JSON.stringify(masterList, null, 2), 'utf-8');
  console.log(`✅ Saved ${masterList.length} questions to data/questions-data.json`);

  // =========================================================================
  // STEP 6: SYNCHRONIZE backend/src/scripts/seed-generated.mjs
  // =========================================================================
  console.log('\n--- STEP 6: Synchronizing backend/src/scripts/seed-generated.mjs ---');
  const seedMjsPath = path.resolve('backend/src/scripts/seed-generated.mjs');
  
  function esc(s) {
    if (typeof s !== 'string') return '';
    return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
  }

  const seedLines = [
    '/**',
    ' * Auto-generated database seed file for questions.',
    ` * Generated on: ${new Date().toISOString()}`,
    ` * Total clean questions: ${masterList.length}`,
    ' */',
    "import pool from '../config/database.js';",
    '',
    'const questions = [];',
    '',
    'function Q(category, question, short_answer, options, difficulty, language) {',
    '  questions.push({ category, question, short_answer, options, difficulty, language });',
    '}',
    '',
    '// ─── QUESTIONS REGISTRY ──────────────────────────────────────────────────'
  ];

  for (const q of masterList) {
    const optsStr = q.options.map(o => `'${esc(o)}'`).join(', ');
    seedLines.push(
      `Q('${esc(q.category)}', '${esc(q.question)}', '${esc(q.short_answer)}', [${optsStr}], '${esc(q.difficulty)}', '${esc(q.language)}');`
    );
  }

  seedLines.push('');
  seedLines.push('export async function seedQuestions() {');
  seedLines.push("  console.log(`🌱 Seeding ${questions.length} questions...`);");
  seedLines.push('  const client = await pool.connect();');
  seedLines.push('  try {');
  seedLines.push('    for (const q of questions) {');
  seedLines.push('      await client.query(');
  seedLines.push("        `INSERT INTO questions (category, difficulty, question_text, short_answer, options, language, is_active, test_ready)");
  seedLines.push('         VALUES ($1, $2, $3, $4, $5::jsonb, $6, TRUE, TRUE)');
  seedLines.push("         ON CONFLICT DO NOTHING`,");
  seedLines.push('        [q.category, q.difficulty, q.question, q.short_answer, JSON.stringify(q.options), q.language]');
  seedLines.push('      );');
  seedLines.push('    }');
  seedLines.push("    console.log('✅ Seed completed successfully!');");
  seedLines.push('  } finally {');
  seedLines.push('    client.release();');
  seedLines.push('  }');
  seedLines.push('}');
  seedLines.push('');
  seedLines.push('export { questions };');
  seedLines.push('export default seedQuestions;');

  fs.writeFileSync(seedMjsPath, seedLines.join('\n'), 'utf-8');
  console.log(`✅ Saved ${masterList.length} questions to backend/src/scripts/seed-generated.mjs`);

  // =========================================================================
  // STEP 7: FINAL DB VERIFICATION QUERY
  // =========================================================================
  console.log('\n--- STEP 7: Final DB State Verification ---');
  const finalStats = await client.query(`
    SELECT
      COUNT(*) AS total_rows,
      COUNT(*) FILTER (WHERE is_active = TRUE) AS active_rows,
      COUNT(*) FILTER (WHERE is_active = FALSE) AS inactive_rows,
      COUNT(*) FILTER (WHERE is_active = TRUE AND (
        options::text ILIKE '%common misconception%' OR
        options::text ILIKE '%alternative approach%' OR
        options::text ILIKE '%i don''t know%' OR
        options::text ILIKE '%none of the above%' OR
        options::text ILIKE '%misconception%' OR
        options::text ILIKE '%unsure%'
      )) AS active_garbage,
      COUNT(*) FILTER (WHERE is_active = TRUE AND options IS NULL) AS active_null_options
    FROM questions
  `);
  console.table(finalStats.rows);

  const finalLangs = await client.query(`
    SELECT language, COUNT(*) AS active_count
    FROM questions
    WHERE is_active = TRUE
    GROUP BY language
    ORDER BY active_count DESC
  `);
  console.table(finalLangs.rows);

  await client.end();
  console.log('🎉 Cleanup and synchronization completed successfully!');
}

run().catch(err => {
  console.error('❌ Error during synchronization:', err);
  process.exit(1);
});
