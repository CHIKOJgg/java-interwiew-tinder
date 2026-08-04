import pool from '../config/database.js';
import logger from '../config/logger.js';

// Map raw DB rows to the camelCase shape QuestionCard expects
// (question, shortAnswer, options...) — without this, the flipped card shows
// an empty short answer in Track mode.
function stepToQuestion(row) {
  return {
    id: row.id,
    category: row.category,
    difficulty: row.difficulty,
    question: row.question,
    shortAnswer: row.short_answer,
    language: row.language || 'Java',
    options: row.options || [],
    companies: row.companies || null,
    prevStatus: null,
  };
}

export async function getTracks(language) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM learning_tracks WHERE language = $1 AND is_active = TRUE ORDER BY sort_order',
      [language]
    );
    return rows;
  } catch (err) {
    logger.error({ err, language }, 'getTracks failed');
    throw err;
  }
}

export async function getTrackWithProgress(trackId, userId) {
  try {
    const track = await pool.query(
      'SELECT * FROM learning_tracks WHERE id = $1', [trackId]
    );
    if (!track.rows[0]) return null;

    const progress = await pool.query(
      'SELECT current_step, completed, completed_at FROM user_track_progress WHERE user_id = $1 AND track_id = $2',
      [userId, trackId]
    );

    const { rows: steps } = await pool.query(
      `SELECT ts.step_order, q.id, q.category, q.difficulty,
              q.question_text as question, q.short_answer, q.language, q.options, q.companies
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
      steps: steps.map(stepToQuestion),
    };
  } catch (err) {
    logger.error({ err, trackId, userId }, 'getTrackWithProgress failed');
    throw err;
  }
}

export async function getNextTrackQuestion(trackId, userId) {
  try {
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

    return rows[0] ? stepToQuestion(rows[0]) : null;
  } catch (err) {
    logger.error({ err, trackId, userId }, 'getNextTrackQuestion failed');
    throw err;
  }
}

export async function advanceTrack(trackId, userId) {
  try {
    // Reject unknown tracks — previously a bogus id marked the track "completed".
    const track = await pool.query('SELECT id FROM learning_tracks WHERE id = $1', [trackId]);
    if (!track.rows[0]) {
      const err = new Error('Track not found');
      err.status = 404;
      throw err;
    }

    const { rows: [last] } = await pool.query(
      'SELECT MAX(step_order) as max FROM track_steps WHERE track_id = $1',
      [trackId]
    );
    if (!last || last.max == null) {
      const err = new Error('Track has no steps');
      err.status = 400;
      throw err;
    }
    const maxStep = last.max;

    const progress = await pool.query(
      `SELECT current_step, completed FROM user_track_progress WHERE user_id = $1 AND track_id = $2`,
      [userId, trackId]
    );

    if (progress.rows[0]?.completed) {
      return { currentStep: progress.rows[0].current_step, completed: true };
    }

    const currentStep = Math.min(progress.rows[0]?.current_step || 0, maxStep);
    const nextStep = currentStep + 1;
    const completed = nextStep >= maxStep;

    await pool.query(
      `INSERT INTO user_track_progress (user_id, track_id, current_step, completed, completed_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, track_id) DO UPDATE SET
         current_step = GREATEST(user_track_progress.current_step, $3),
         completed = user_track_progress.completed OR $4,
         completed_at = CASE WHEN $4 THEN COALESCE(user_track_progress.completed_at, NOW()) ELSE user_track_progress.completed_at END`,
      [userId, trackId, nextStep, completed, completed ? new Date() : null]
    );

    return { currentStep: nextStep, completed };
  } catch (err) {
    logger.error({ err, trackId, userId }, 'advanceTrack failed');
    throw err;
  }
}
