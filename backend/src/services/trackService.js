import pool from '../config/database.js';
import logger from '../config/logger.js';

export async function getTracks(language) {
  const { rows } = await pool.query(
    'SELECT * FROM learning_tracks WHERE language = $1 AND is_active = TRUE ORDER BY sort_order',
    [language]
  );
  return rows;
}

export async function getTrackWithProgress(trackId, userId) {
  const track = await pool.query(
    'SELECT * FROM learning_tracks WHERE id = $1', [trackId]
  );
  if (!track.rows[0]) return null;

  const progress = await pool.query(
    'SELECT current_step, completed, completed_at FROM user_track_progress WHERE user_id = $1 AND track_id = $2',
    [userId, trackId]
  );

  const { rows: steps } = await pool.query(
    `SELECT ts.step_order, q.id, q.question_text as question, q.short_answer, q.difficulty
     FROM track_steps ts
     JOIN questions q ON q.id = ts.question_id
     WHERE ts.track_id = $1
     ORDER BY ts.step_order`,
    [trackId]
  );

  return {
    ...track.rows[0],
    totalSteps: steps.length,
    currentStep: progress.rows[0]?.current_step || 0,
    completed: progress.rows[0]?.completed || false,
    completedAt: progress.rows[0]?.completed_at || null,
    steps,
  };
}

export async function getNextTrackQuestion(trackId, userId) {
  const progress = await pool.query(
    `SELECT current_step, completed FROM user_track_progress
     WHERE user_id = $1 AND track_id = $2`,
    [userId, trackId]
  );

  if (progress.rows[0]?.completed) return null;

  const currentStep = progress.rows[0]?.current_step || 0;

  const { rows } = await pool.query(
    `SELECT q.id, q.category, q.difficulty, q.question_text as question,
            q.short_answer, q.language, q.options, q.companies
     FROM track_steps ts
     JOIN questions q ON q.id = ts.question_id
     WHERE ts.track_id = $1 AND ts.step_order = $2`,
    [trackId, currentStep + 1]
  );

  return rows[0] || null;
}

export async function advanceTrack(trackId, userId) {
  const progress = await pool.query(
    `SELECT current_step FROM user_track_progress WHERE user_id = $1 AND track_id = $2`,
    [userId, trackId]
  );

  const currentStep = progress.rows[0]?.current_step || 0;
  const nextStep = currentStep + 1;

  const { rows: [last] } = await pool.query(
    'SELECT MAX(step_order) as max FROM track_steps WHERE track_id = $1',
    [trackId]
  );

  const completed = nextStep >= (last?.max || 0);

  await pool.query(
    `INSERT INTO user_track_progress (user_id, track_id, current_step, completed, completed_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, track_id) DO UPDATE SET
       current_step = $3, completed = $4, completed_at = COALESCE($5, user_track_progress.completed_at)`,
    [userId, trackId, nextStep, completed, completed ? new Date() : null]
  );

  return { currentStep: nextStep, completed };
}
