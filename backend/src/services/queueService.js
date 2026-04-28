import pool from '../config/database.js';

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
  `).catch(() => {}); // table may already exist
}

/**
 * Enqueue a job — idempotent via UNIQUE constraint.
 * Duplicate payloads are silently ignored (ON CONFLICT DO NOTHING).
 */
export async function enqueueJob(taskType, payload) {
  try {
    await pool.query(
      `INSERT INTO ai_jobs (task_type, payload) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [taskType, JSON.stringify(payload)]
    );
  } catch (err) {
    console.error('Enqueue error:', err.message);
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
    console.error('Clean jobs error:', err.message);
  }
}
