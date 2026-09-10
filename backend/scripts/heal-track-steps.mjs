import pool from '../src/config/database.js';

async function healTracks() {
  const client = await pool.connect();
  try {
    console.log('🩹 Healing learning tracks and steps...');
    await client.query('BEGIN');

    // Get all active tracks
    const tracksRes = await client.query(`
      SELECT id, language, name, level
      FROM learning_tracks
      WHERE is_active = TRUE
      ORDER BY language, sort_order, id
    `);

    console.log(`Found ${tracksRes.rows.length} tracks.`);

    for (const track of tracksRes.rows) {
      // Find candidate active questions for this language
      // Try matching by track name keywords or category
      const words = track.name.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !['mastery', 'fundamentals', 'deep', 'dive', 'core'].includes(w));
      
      // Look for active questions matching category or text
      let qRes = await client.query(`
        SELECT id FROM questions
        WHERE language = $1
          AND is_active = TRUE
          AND (
            category ILIKE ANY($2::text[])
            OR question_text ILIKE ANY($2::text[])
          )
        ORDER BY id ASC
        LIMIT 10
      `, [track.language, words.map(w => `%${w}%`)]);

      // If not enough questions found by keyword, fill with general active questions for that language
      if (qRes.rows.length < 5) {
        qRes = await client.query(`
          SELECT id FROM questions
          WHERE language = $1
            AND is_active = TRUE
          ORDER BY id ASC
          LIMIT 10
        `, [track.language]);
      }

      if (qRes.rows.length > 0) {
        // Delete old/dead steps for this track
        await client.query('DELETE FROM track_steps WHERE track_id = $1', [track.id]);
        
        let order = 1;
        for (const q of qRes.rows) {
          await client.query(`
            INSERT INTO track_steps (track_id, question_id, step_order)
            VALUES ($1, $2, $3)
          `, [track.id, q.id, order++]);
        }
        console.log(`  ✅ Track "${track.name}" (${track.language}): assigned ${qRes.rows.length} clean steps.`);
      } else {
        console.log(`  ⚠️ Track "${track.name}" (${track.language}): no questions found!`);
      }
    }

    await client.query('COMMIT');
    console.log('\n🎉 All tracks successfully healed!');

    // Verify
    const check = await client.query(`
      SELECT lt.language, lt.name AS track, COUNT(ts.id) AS steps,
       COUNT(*) FILTER (WHERE q.id IS NULL OR q.is_active = FALSE) AS dead_steps
      FROM learning_tracks lt
      LEFT JOIN track_steps ts ON ts.track_id = lt.id
      LEFT JOIN questions q ON q.id = ts.question_id
      WHERE lt.is_active = TRUE
      GROUP BY 1,2 ORDER BY 1,2
    `);
    console.table(check.rows);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error healing tracks:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

healTracks().catch(console.error);
