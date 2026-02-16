import pool from '../config/database.js';

const initDatabase = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting database initialization...');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        telegram_id BIGINT PRIMARY KEY,
        username VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "users" created');

    // Create questions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        question_text TEXT NOT NULL,
        short_answer TEXT NOT NULL,
        cached_explanation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "questions" created');

    // Create user_progress table
    await client.query(`
      CREATE TYPE progress_status AS ENUM ('known', 'unknown');
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_progress (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        status progress_status NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, question_id)
      );
    `);
    console.log('✅ Table "user_progress" created');

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_progress_question_id ON user_progress(question_id);
      CREATE INDEX IF NOT EXISTS idx_user_progress_status ON user_progress(status);
      CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
    `);
    console.log('✅ Indexes created');

    console.log('🎉 Database initialization completed successfully!');
  } catch (error) {
    if (error.code === '42710') {
      // Type already exists, ignore
      console.log('⚠️ Type already exists, skipping...');
    } else {
      console.error('❌ Error during database initialization:', error);
      throw error;
    }
  } finally {
    client.release();
    await pool.end();
  }
};

initDatabase().catch(console.error);
