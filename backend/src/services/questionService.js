import pool from '../config/database.js';
import logger from '../config/logger.js';

/**
 * SuperMemo 2 (SM-2) Algorithm Implementation
 * 
 * q: quality of response (0-5)
 * n: number of repetitions
 * ef: ease factor
 * i: interval (days)
 * 
 * New values:
 * I(1) := 1
 * I(2) := 6
 * for n > 2: I(n) := I(n-1) * EF
 * EF' := EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
 * if EF' < 1.3 then EF' := 1.3
 * 
 * Quality mapping:
 * 5: perfect (Know it)
 * 3: good but with hesitation (Flipped then Right)
 * 0: complete blackout (Don't know)
 */
export async function updateMastery(userId, questionId, quality) {
  try {
    const { rows } = await pool.query(
      'SELECT ease_factor, interval_days, repetitions FROM question_mastery WHERE user_id = $1 AND question_id = $2',
      [userId, questionId]
    );

    let ef = 2.5;
    let interval = 1;
    let reps = 0;

    if (rows.length > 0) {
      ef = parseFloat(rows[0].ease_factor);
      interval = rows[0].interval_days;
      reps = rows[0].repetitions;
    }

    if (quality >= 3) {
      // Correct response
      if (reps === 0) {
        interval = 1;
      } else if (reps === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * ef);
      }
      reps++;
    } else {
      // Incorrect response
      reps = 0;
      interval = 1;
    }

    // Update Ease Factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (ef < 1.3) ef = 1.3;

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    await pool.query(
      `INSERT INTO question_mastery (user_id, question_id, ease_factor, interval_days, repetitions, next_review)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, question_id) DO UPDATE SET
         ease_factor = EXCLUDED.ease_factor,
         interval_days = EXCLUDED.interval_days,
         repetitions = EXCLUDED.repetitions,
         next_review = EXCLUDED.next_review`,
      [userId, questionId, ef, interval, reps, nextReview]
    );

    return { ef, interval, reps, nextReview };
  } catch (err) {
    logger.error({ err, userId, questionId }, 'Failed to update mastery');
    throw err;
  }
}

export async function getDueCount(userId, language = 'Java') {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) 
       FROM question_mastery qm
       JOIN questions q ON q.id = qm.question_id
       WHERE qm.user_id = $1 
         AND q.language = $2
         AND qm.next_review <= CURRENT_DATE`,
      [userId, language]
    );
    return parseInt(rows[0].count);
  } catch (err) {
    logger.error({ err, userId }, 'Failed to get due count');
    return 0;
  }
}
