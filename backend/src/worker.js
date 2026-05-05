import pool from './config/database.js';
import {
  generateExplanation, generateTestOptions, generateBuggyCode,
  generateBlitzStatement, generateCodeCompletion,
} from './services/aiService.js';
import { initQueueTable } from './services/queueService.js';

// ─── Question-column backfill map ────────────────────────────────────
// After each AI generation, write the parsed result back into the questions
// table so that answer-validation endpoints can find the correct answers
// without needing to re-query ai_cache.
const BACKFILL = {
  explanation: async (qId, result) => {
    await pool.query(
      'UPDATE questions SET cached_explanation=$1 WHERE id=$2',
      [result, qId]
    );
  },
  test: async (qId, result) => {
    // result is a parsed array of wrong-answer strings
    const options = Array.isArray(result) ? result : (result?.options || []);
    if (!options.length) {
      console.warn(`Backfill skip [test] q=${qId}: AI returned empty options array`);
      return; // Don't save [] to postgres ARRAY column — causes malformed array literal error
    }
    await pool.query(
      'UPDATE questions SET options=$1 WHERE id=$2',
      [JSON.stringify(options), qId]
    );
  },
  bug: async (qId, result) => {
    if (!result?.code || !result?.bug || !Array.isArray(result?.options) || !result.options.length) {
      console.warn(`Backfill skip [bug] q=${qId}: incomplete result`);
      return;
    }
    await pool.query(
      'UPDATE questions SET bug_hunting_data=$1 WHERE id=$2',
      [JSON.stringify(result), qId]
    );
  },
  blitz: async (qId, result) => {
    await pool.query(
      'UPDATE questions SET blitz_data=$1 WHERE id=$2',
      [JSON.stringify(result), qId]
    );
  },
  code: async (qId, result) => {
    if (!result?.snippet || !result?.correctPart || !Array.isArray(result?.options) || !result.options.length) {
      console.warn(`Backfill skip [code] q=${qId}: incomplete result`);
      return;
    }
    await pool.query(
      'UPDATE questions SET code_completion_data=$1 WHERE id=$2',
      [JSON.stringify(result), qId]
    );
  },
};

// ─── Job processor ────────────────────────────────────────────────────
const processJob = async (job) => {
  const { id, task_type, payload } = job;
  const p = typeof payload === 'string' ? JSON.parse(payload) : payload;
  const lang = p.language || 'Java';
  const qId = p.questionId || null;  // may be absent for warm-up jobs

  console.log(`👷 Job ${id}: ${task_type} [${lang}]${qId ? ` q=${qId}` : ''}`);

  let result;
  try {
    switch (task_type) {
      case 'explanation':
        result = await generateExplanation(p.questionText, p.shortAnswer, p.userId, lang);
        break;
      case 'test':
        result = await generateTestOptions(p.questionText, p.shortAnswer, p.userId, lang);
        break;
      case 'bug':
        result = await generateBuggyCode(p.questionText, p.category, p.userId, lang);
        break;
      case 'blitz':
        result = await generateBlitzStatement(p.questionText, p.category, p.userId, lang);
        break;
      case 'code':
        result = await generateCodeCompletion(p.questionText, p.category, p.userId, lang);
        break;
      default:
        console.warn(`Unknown task type: ${task_type}`);
        result = null;
    }

    // Backfill the questions table so answer endpoints can find correct answers
    if (result !== null && result !== undefined && qId && BACKFILL[task_type]) {
      await BACKFILL[task_type](qId, result).catch(err =>
        console.error(`Backfill error [${task_type}] q=${qId}:`, err.message)
      );
    }

    await pool.query(
      `UPDATE ai_jobs
       SET status='completed', completed_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
       WHERE id=$1`,
      [id]
    );
    console.log(`✅ Job ${id} done`);
  } catch (err) {
    console.error(`❌ Job ${id} failed:`, err.message);
    await pool.query(
      `UPDATE ai_jobs
       SET status='failed', attempts=attempts+1, error_message=$2,
           next_run_at=CURRENT_TIMESTAMP + (power(2, LEAST(attempts, 6)) || ' minutes')::interval,
           updated_at=CURRENT_TIMESTAMP
       WHERE id=$1`,
      [id, err.message]
    ).catch(() => { });
  }
};

// ─── Worker loop ──────────────────────────────────────────────────────
const runWorker = async () => {
  await initQueueTable();
  console.log('👷 Background worker started (concurrency=3)');

  const CONCURRENCY = 3;
  let activeJobs = 0;

  const pollAndProcess = async () => {
    if (activeJobs >= CONCURRENCY) return;

    try {
      const { rows } = await pool.query(`
        UPDATE ai_jobs
        SET status='processing', started_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
        WHERE id = (
          SELECT id FROM ai_jobs
          WHERE (status='pending' OR (status='failed' AND attempts < max_attempts))
            AND next_run_at <= CURRENT_TIMESTAMP
          ORDER BY created_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        RETURNING *
      `);

      if (rows.length > 0) {
        activeJobs++;
        processJob(rows[0]).finally(() => {
          activeJobs--;
          pollAndProcess();
        });
        pollAndProcess(); // fill concurrency slots
      }
    } catch (err) {
      console.error('Worker polling error:', err.message);
    }
  };

  setInterval(() => {
    if (activeJobs < CONCURRENCY) pollAndProcess();
  }, 2000);
};

runWorker();