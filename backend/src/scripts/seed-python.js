import pool from '../config/database.js';
import { pythonQuestions } from './seed-db-python.js';

async function seedPython() {
  const client = await pool.connect();
  try {
    console.log(`🌱 Seeding ${pythonQuestions.length} Python questions...`);
    
    await client.query('BEGIN');
    
    for (const q of pythonQuestions) {
      await client.query(
        `INSERT INTO questions (category, question_text, short_answer, options, language, difficulty)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (question_text, language) DO NOTHING`,
        [q.category, q.question, q.short_answer, q.options, 'Python', q.difficulty || 'Junior']
      );
    }
    
    await client.query('COMMIT');
    console.log('✅ Python seeding complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seedPython();
