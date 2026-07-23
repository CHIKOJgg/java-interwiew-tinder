import pool from '../config/database.js';

export async function generateCertificate({ userId, trackId, title, score }) {
  const { rows } = await pool.query(
    `INSERT INTO certificates (user_id, track_id, title, score)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, track_id) DO UPDATE SET score = $4, issued_at = NOW()
     RETURNING id, issued_at`,
    [userId, trackId, title, score]
  );

  return {
    id: rows[0].id,
    issuedAt: rows[0].issued_at,
    title,
    score,
  };
}

export async function getUserCertificates(userId) {
  const { rows } = await pool.query(
    `SELECT c.*, lt.name as track_name, lt.level
     FROM certificates c
     LEFT JOIN learning_tracks lt ON lt.id = c.track_id
     WHERE c.user_id = $1
     ORDER BY c.issued_at DESC`,
    [userId]
  );
  return rows;
}
