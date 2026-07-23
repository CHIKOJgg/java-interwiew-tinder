import pool from '../config/database.js';

export async function getCurrentChallenge(language) {
  const { rows } = await pool.query(
    `SELECT * FROM weekly_challenges
     WHERE language = $1 AND is_active = TRUE AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE
     ORDER BY start_date DESC LIMIT 1`,
    [language]
  );
  return rows[0] || null;
}

export async function getLeaderboard(challengeId, limit = 20) {
  const { rows } = await pool.query(
    `SELECT cr.user_id, u.first_name, cr.score, cr.questions_answered, cr.accuracy
     FROM challenge_results cr
     JOIN users u ON u.telegram_id = cr.user_id
     WHERE cr.challenge_id = $1
     ORDER BY cr.score DESC, cr.accuracy DESC
     LIMIT $2`,
    [challengeId, limit]
  );
  return rows;
}

export async function submitChallengeResult(challengeId, userId, score, questionsAnswered, accuracy) {
  await pool.query(
    `INSERT INTO challenge_results (challenge_id, user_id, score, questions_answered, accuracy)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (challenge_id, user_id) DO UPDATE SET
       score = GREATEST(challenge_results.score, $3),
       questions_answered = $4,
       accuracy = $5,
       completed_at = NOW()`,
    [challengeId, userId, score, questionsAnswered, accuracy]
  );
}

export async function createWeeklyChallenge(language, theme) {
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
}
