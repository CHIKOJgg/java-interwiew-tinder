import pool from '../config/database.js';

async function seedTracks() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if tracks already exist
    const { rows: existing } = await client.query(
      "SELECT COUNT(*) as cnt FROM learning_tracks WHERE language = 'Java'"
    );
    if (parseInt(existing[0].cnt) > 0) {
      console.log('⏭️  Java tracks already exist, skipping.');
      await client.query('ROLLBACK');
      return;
    }

    // Check questions exist
    const { rows: qcheck } = await client.query(
      "SELECT COUNT(*) as cnt FROM questions WHERE language = 'Java' AND is_active = TRUE"
    );
    console.log(`📊 Found ${qcheck[0].cnt} active Java questions`);

    if (parseInt(qcheck[0].cnt) === 0) {
      console.error('❌ No active Java questions found! Run migration 036 first.');
      await client.query('ROLLBACK');
      return;
    }

    // Insert tracks
    const tracksResult = await client.query(`
      INSERT INTO learning_tracks (language, name, description, level, icon, sort_order, is_active)
      VALUES
        ('Java', 'Java Core Fundamentals', 'Master OOP, exceptions, and core Java concepts', 'Junior', '☕', 1, TRUE),
        ('Java', 'Multithreading Mastery', 'Thread management, synchronization, and concurrent APIs', 'Middle', '⚡', 2, TRUE),
        ('Java', 'Collections & Stream API', 'Data structures, algorithms, and functional streaming', 'Junior', '📦', 3, TRUE),
        ('Java', 'Spring Framework', 'Spring Boot, DI, REST APIs, and enterprise patterns', 'Middle', '🌱', 4, TRUE),
        ('Java', 'JVM Deep Dive', 'Memory model, GC tuning, classloading, and performance', 'Senior', '🔧', 5, TRUE),
        ('Java', 'Design Patterns', 'Gang of Four patterns and modern Java approaches', 'Middle', '🏗️', 6, TRUE)
      RETURNING id, name
    `);
    console.log(`✅ Inserted ${tracksResult.rowCount} tracks`);

    const trackMap = {};
    for (const row of tracksResult.rows) {
      trackMap[row.name] = row.id;
    }

    // Helper to insert steps
    async function insertSteps(trackName, categories) {
      const trackId = trackMap[trackName];
      if (!trackId) { console.error(`❌ Track "${trackName}" not found`); return; }

      let stepOrder = 1;
      for (const { category, limit } of categories) {
        const { rows: questions } = await client.query(
          'SELECT id FROM questions WHERE language = $1 AND category = $2 AND is_active = TRUE ORDER BY id LIMIT $3',
          ['Java', category, limit]
        );
        for (const q of questions) {
          await client.query(
            'INSERT INTO track_steps (track_id, question_id, step_order) VALUES ($1, $2, $3)',
            [trackId, q.id, stepOrder++]
          );
        }
      }
      console.log(`  📝 ${trackName}: ${stepOrder - 1} steps`);
    }

    await insertSteps('Java Core Fundamentals', [
      { category: 'OOP', limit: 4 },
      { category: 'Exceptions', limit: 3 },
      { category: 'Java Core', limit: 3 },
    ]);

    await insertSteps('Multithreading Mastery', [
      { category: 'Multithreading', limit: 10 },
    ]);

    await insertSteps('Collections & Stream API', [
      { category: 'Collections', limit: 6 },
      { category: 'Stream API', limit: 4 },
    ]);

    await insertSteps('Spring Framework', [
      { category: 'Spring', limit: 10 },
    ]);

    await insertSteps('JVM Deep Dive', [
      { category: 'JVM', limit: 8 },
    ]);

    await insertSteps('Design Patterns', [
      { category: 'Design Patterns', limit: 8 },
    ]);

    await client.query('COMMIT');
    console.log('\n🎉 Track seeding complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Track seeding failed:', err.message);
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedTracks();
