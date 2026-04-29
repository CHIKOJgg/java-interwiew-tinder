import pool from '../config/database.js';
import { newQuestions } from './seed-db-java-2.js';

async function seedJava2() {
  const client = await pool.connect();
  try {
    console.log(`🌱 Seeding ${newQuestions.length} new Java questions...`);
    
    await client.query('BEGIN');
    
    for (const q of newQuestions) {
      await client.query(
        `INSERT INTO questions (category, question_text, short_answer, options, language, difficulty)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (question_text, language) DO NOTHING`,
        [q.category, q.question, q.short_answer, q.options, 'Java', q.difficulty || 'Junior']
      );
    }
    
    await client.query('COMMIT');
    console.log('✅ New Java questions seeding complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seedJava2();
