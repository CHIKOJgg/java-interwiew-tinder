import pool from './config/database.js';
import { generateExplanation, generateTestOptions, generateBuggyCode, generateBlitzStatement, generateCodeCompletion } from './services/aiService.js';
import { initQueueTable } from './services/queueService.js';

const processJob = async (job) => {
  const { id, task_type, payload } = job;
  const p = typeof payload === 'string' ? JSON.parse(payload) : payload;
  const lang = p.language || 'Java';

  console.log(`👷 Job ${id}: ${task_type} [${lang}]`);

  try {
    switch (task_type) {
      case 'explanation':
        await generateExplanation(p.questionText, p.shortAnswer, p.userId, lang);
        break;
      case 'test':
        await generateTestOptions(p.questionText, p.shortAnswer, p.userId, lang);
        break;
      case 'bug':
        await generateBuggyCode(p.questionText, p.category, p.userId, lang);
        break;
      case 'blitz':
        await generateBlitzStatement(p.questionText, p.category, p.userId, lang);
        break;
      case 'code':
        await generateCodeCompletion(p.questionText, p.category, p.userId, lang);
        break;
      default:
        console.warn(`Unknown task type: ${task_type}`);
    }

    await pool.query("UPDATE ai_jobs SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
    console.log(`✅ Job ${id} completed`);
  } catch (err) {
    console.error(`❌ Job ${id} failed:`, err.message);
    await pool.query(`
      UPDATE ai_jobs SET status = 'failed', attempts = attempts + 1, error_message = $2,
        next_run_at = CURRENT_TIMESTAMP + (power(2, LEAST(attempts, 6)) || ' minutes')::interval, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id, err.message]).catch(() => {});
  }
};

const runWorker = async () => {
  await initQueueTable();
  console.log('👷 Background worker started with concurrency = 3');

  const CONCURRENCY = 3;
  let activeJobs = 0;

  const pollAndProcess = async () => {
    if (activeJobs >= CONCURRENCY) return;

    try {
      const { rows } = await pool.query(`
        UPDATE ai_jobs SET status = 'processing', started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = (
          SELECT id FROM ai_jobs
          WHERE (status = 'pending' OR (status = 'failed' AND attempts < max_attempts))
            AND next_run_at <= CURRENT_TIMESTAMP
          ORDER BY created_at ASC FOR UPDATE SKIP LOCKED LIMIT 1
        ) RETURNING *;
      `);

      if (rows.length > 0) {
        activeJobs++;
        processJob(rows[0]).finally(() => {
          activeJobs--;
          pollAndProcess(); // immediately check for next
        });
        pollAndProcess(); // try to fill concurrency
      }
    } catch (err) {
      console.error('Worker polling error:', err.message);
    }
  };

  // Poll every 2 seconds if not active
  setInterval(() => {
    if (activeJobs < CONCURRENCY) pollAndProcess();
  }, 2000);
};

runWorker();
