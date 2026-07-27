import pool from '../config/database.js';
import logger from '../config/logger.js';

export async function getCurrentChallenge(language) {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM weekly_challenges
       WHERE language = $1 AND is_active = TRUE AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE
       ORDER BY start_date DESC LIMIT 1`,
      [language]
    );
    return rows[0] || null;
  } catch (err) {
    logger.error({ err, language }, 'getCurrentChallenge failed');
    throw err;
  }
}

export async function getLeaderboard(challengeId, limit = 20) {
  try {
    const { rows } = await pool.query(
      `SELECT cr.user_id, u.first_name, cr.score, cr.questions_answered, cr.accuracy,
              u.current_streak
       FROM challenge_results cr
       JOIN users u ON u.telegram_id = cr.user_id
       WHERE cr.challenge_id = $1
       ORDER BY cr.score DESC, cr.accuracy DESC, u.current_streak DESC
       LIMIT $2`,
      [challengeId, limit]
    );
    return rows.map((r, i) => ({
      ...r,
      rank: i + 1,
      score: parseInt(r.score) + (parseInt(r.streak) || 0) * 2,
    }));
  } catch (err) {
    logger.error({ err, challengeId }, 'getLeaderboard failed');
    throw err;
  }
}

export async function submitChallengeResult(challengeId, userId, score, questionsAnswered, accuracy) {
  try {
    // Get user streak for bonus calculation
    const { rows: userRows } = await pool.query(
      'SELECT current_streak FROM users WHERE telegram_id = $1',
      [userId]
    );
    const streak = userRows[0]?.current_streak || 0;
    const streakBonus = Math.min(streak * 2, 100); // Max 100 bonus points

    const finalScore = Math.min(score + streakBonus, 10000);

    await pool.query(
      `INSERT INTO challenge_results (challenge_id, user_id, score, questions_answered, accuracy, streak_bonus)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (challenge_id, user_id) DO UPDATE SET
         score = GREATEST(challenge_results.score, $3),
         questions_answered = $4,
         accuracy = $5,
         streak_bonus = EXCLUDED.streak_bonus,
         completed_at = NOW()`,
      [challengeId, userId, finalScore, questionsAnswered, accuracy, streakBonus]
    );
  } catch (err) {
    logger.error({ err, challengeId, userId }, 'submitChallengeResult failed');
    throw err;
  }
}

export async function createWeeklyChallenge(language, theme) {
  try {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const { rows } = await pool.query(
      `INSERT INTO weekly_challenges (language, theme, start_date, end_date)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [language, theme || 'Weekly Challenge', monday.toISOString().split('T')[0], sunday.toISOString().split('T')[0]]
    );
    return rows[0] || null;
  } catch (err) {
    logger.error({ err, language, theme }, 'createWeeklyChallenge failed');
    throw err;
  }
}
