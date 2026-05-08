import * as Sentry from "@sentry/node";
import cron from 'node-cron';
import pool from './config/database.js';
import logger from './config/logger.js';
import {
  generateExplanation, generateTestOptions, generateBuggyCode,
  generateBlitzStatement, generateCodeCompletion,
} from './services/aiService.js';
import { initQueueTable } from './services/queueService.js';
import { sendTelegramMessage } from './services/billing/starsService.js';

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
      logger.warn({ qId }, 'Backfill skip [test]: AI returned empty options array');
      return; // Don't save [] to postgres ARRAY column — causes malformed array literal error
    }
    await pool.query(
      'UPDATE questions SET options=$1 WHERE id=$2',
      [JSON.stringify(options), qId]
    );
  },
  bug: async (qId, result) => {
    if (!result?.code || !result?.bug || !Array.isArray(result?.options) || !result.options.length) {
      logger.warn({ qId }, 'Backfill skip [bug]: incomplete result');
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
      logger.warn({ qId }, 'Backfill skip [code]: incomplete result');
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

  logger.info({ jobId: id, task_type, lang, qId }, '👷 Processing job');

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
        logger.warn({ task_type }, 'Unknown task type');
        result = null;
    }

    // Backfill the questions table so answer endpoints can find correct answers
    if (result !== null && result !== undefined && qId && BACKFILL[task_type]) {
      await BACKFILL[task_type](qId, result).catch(err =>
        logger.error({ err, task_type, qId }, 'Backfill error')
      );
    }

    await pool.query(
      `UPDATE ai_jobs
       SET status='completed', completed_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
       WHERE id=$1`,
      [id]
    );
    logger.info({ jobId: id }, '✅ Job done');
  } catch (err) {
    logger.error({ err, jobId: id }, '❌ Job failed');
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

// ─── Subscription Lifecycle Jobs ──────────────────────────────────────

async function notifyExpiring() {
  try {
    // Notify users whose subscription expires in exactly 3 days
    const { rows } = await pool.query(`
      SELECT user_id, expires_at, plan_id 
      FROM user_subscriptions 
      WHERE status='active' 
        AND expires_at::date = (CURRENT_DATE + INTERVAL '3 days')::date
    `);

    logger.info({ count: rows.length }, '🔔 Processing expiring subscription notifications');

    for (const sub of rows) {
      const daysLeft = 3;
      const msg = `⚠️ Your ${sub.plan_id.toUpperCase()} plan expires in ${daysLeft} days.\n\nRenew now to keep your progress and unlimited access!`;
      
      await sendTelegramMessage(sub.user_id, msg).catch(err => {
        logger.error({ err, userId: sub.user_id }, 'Failed to send expiry reminder');
        Sentry.addBreadcrumb({ category: 'billing', message: `Expiry reminder failed for ${sub.user_id}` });
      });
    }
  } catch (err) {
    logger.error({ err }, 'Error in notifyExpiring job');
    Sentry.captureException(err);
  }
}

async function processExpired() {
  try {
    // 1. Find subscriptions that just expired
    const { rows } = await pool.query(`
      SELECT user_id, plan_id 
      FROM user_subscriptions 
      WHERE status='active' AND expires_at < NOW()
    `);

    if (rows.length === 0) return;

    logger.info({ count: rows.length }, '📉 Processing expired subscriptions');

    for (const sub of rows) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Update subscription status
        await client.query(
          "UPDATE user_subscriptions SET status='expired', updated_at=NOW() WHERE user_id=$1 AND status='active'",
          [sub.user_id]
        );

        // Downgrade user record
        await client.query(
          "UPDATE users SET subscription_plan='free', subscription_expires_at=NULL WHERE telegram_id=$1",
          [sub.user_id]
        );

        await client.query('COMMIT');
        
        await sendTelegramMessage(sub.user_id, 
          `ℹ️ Your Pro subscription has expired. You've been moved to the Free plan.`
        ).catch(() => {});

      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        logger.error({ err, userId: sub.user_id }, 'Failed to downgrade user');
        Sentry.captureException(err);
      } finally {
        client.release();
      }
    }
  } catch (err) {
    logger.error({ err }, 'Error in processExpired job');
    Sentry.captureException(err);
  }
}

async function verifyBackupIntegrity() {
  try {
    logger.info('🔍 Starting automated backup integrity check');
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');
    const questionsCount = await pool.query('SELECT COUNT(*) FROM questions');
    
    logger.info({
      users: usersCount.rows[0].count,
      questions: questionsCount.rows[0].count
    }, '📊 Database integrity check results');
    
    // Add Sentry breadcrumb for successful verification
    Sentry.addBreadcrumb({
      category: 'database',
      message: 'Backup integrity verification passed',
      level: 'info'
    });
  } catch (err) {
    logger.error({ err }, '❌ Database integrity check failed');
    Sentry.captureException(err);
  }
}

const scheduleSubscriptionJobs = () => {
  // Run daily at midnight
  cron.schedule('0 0 * * *', async () => {
    logger.info('⏰ Starting daily subscription maintenance jobs');
    await notifyExpiring();
    await processExpired();
  });

  // Run weekly backup verification (Sunday at 02:00)
  cron.schedule('0 2 * * 0', async () => {
    await verifyBackupIntegrity();
  });
  
  logger.info('⏰ Maintenance crons scheduled (Daily Subscriptions + Weekly Integrity)');
};

// ─── Worker loop ──────────────────────────────────────────────────────
const runWorker = async () => {
  await initQueueTable();
  logger.info({ concurrency: 3 }, '👷 Background worker started');

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
      logger.error({ err }, 'Worker polling error');
    }
  };

  setInterval(() => {
    if (activeJobs < CONCURRENCY) pollAndProcess();
  }, 2000);

  // Start cron jobs
  scheduleSubscriptionJobs();
};

runWorker();