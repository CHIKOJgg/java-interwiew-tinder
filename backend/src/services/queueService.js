import pool from '../config/database.js';
import logger from '../config/logger.js';

export async function initQueueTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_jobs (
      id SERIAL PRIMARY KEY,
      task_type VARCHAR(50) NOT NULL,
      payload JSONB NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      attempts INT DEFAULT 0,
      max_attempts INT DEFAULT 5,
      next_run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_type, payload)
    );
  `).catch((err) => { logger.warn({ err }, 'initQueueTable: table may already exist'); });
}

/**
 * Enqueue a job — idempotent via UNIQUE constraint.
 * Duplicate payloads are silently ignored (ON CONFLICT DO NOTHING), EXCEPT
 * for permanently dead jobs: a job that exhausted its retries (failed with
 * attempts >= max_attempts) would otherwise block every future generation
 * for that question forever. Such a job is reset to pending so a later
 * request (or a fresh worker) can retry it.
 */
export async function enqueueJob(taskType, payload) {
  try {
    await pool.query(
      `INSERT INTO ai_jobs (task_type, payload) VALUES ($1, $2)
       ON CONFLICT (task_type, payload) DO UPDATE
         SET status = 'pending',
             attempts = 0,
             error_message = NULL,
             next_run_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE ai_jobs.status = 'failed' AND ai_jobs.attempts >= ai_jobs.max_attempts`,
      [taskType, JSON.stringify(payload)]
    );
  } catch (err) {
    logger.error({ err }, 'Enqueue error');
  }
}

/**
 * Clean old completed jobs (call periodically)
 */
export async function cleanOldJobs(daysOld = 7) {
  try {
    await pool.query(
      `DELETE FROM ai_jobs WHERE status = 'completed' AND completed_at < CURRENT_TIMESTAMP - ($1 || ' days')::interval`,
      [daysOld]
    );
  } catch (err) {
    logger.error({ err }, 'Clean jobs error');
  }
}
