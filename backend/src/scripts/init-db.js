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
        resume_text TEXT,
        parsed_resume_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "users" created');

    // Create questions table
    await client.query(`
       CREATE TABLE IF NOT EXISTS questions (
         id SERIAL PRIMARY KEY,
         category VARCHAR(100) NOT NULL,
         difficulty VARCHAR(20) DEFAULT 'Junior',
         question_text TEXT NOT NULL,
         short_answer TEXT NOT NULL,
         options JSONB,
         bug_hunting_data JSONB,
         blitz_data JSONB,
         code_completion_data JSONB,
         cached_explanation TEXT,
         company VARCHAR(100),
         is_ugc BOOLEAN DEFAULT FALSE,
         is_active BOOLEAN DEFAULT TRUE,
         language VARCHAR(50) DEFAULT 'Java',
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       );
    `);
    console.log('✅ Table "questions" created');

    // Create user_badges table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        badge_key VARCHAR(50) NOT NULL,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, badge_key)
      );
    `);
    console.log('✅ Table "user_badges" created');

    // Create daily_challenges table
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_challenges (
        id SERIAL PRIMARY KEY,
        challenge_date DATE NOT NULL DEFAULT CURRENT_DATE,
        question_ids INTEGER[] NOT NULL,
        language VARCHAR(50) DEFAULT 'Java',
        streak_bonus INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(challenge_date, language)
      );
    `);
    console.log('✅ Table "daily_challenges" created');

    // Create daily_challenge_results table
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_challenge_results (
        id SERIAL PRIMARY KEY,
        challenge_id INT NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        score INT DEFAULT 0,
        questions_answered INT DEFAULT 0,
        accuracy FLOAT DEFAULT 0,
        completed_at TIMESTAMP,
        UNIQUE(challenge_id, user_id)
      );
    `);
    console.log('✅ Table "daily_challenge_results" created');

    // Create weekly_leaderboard table
    await client.query(`
      CREATE TABLE IF NOT EXISTS weekly_leaderboard (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        week_start DATE NOT NULL,
        known_count INT DEFAULT 0,
        streak INT DEFAULT 0,
        score INT DEFAULT 0,
        UNIQUE(user_id, week_start)
      );
    `);
    console.log('✅ Table "weekly_leaderboard" created');

    // Create weekly_challenges table
    await client.query(`
      CREATE TABLE IF NOT EXISTS weekly_challenges (
        id SERIAL PRIMARY KEY,
        language VARCHAR(50) DEFAULT 'Java',
        theme VARCHAR(100) DEFAULT 'Weekly Challenge',
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(language, start_date)
      );
    `);
    console.log('✅ Table "weekly_challenges" created');

    // Create challenge_results table
    await client.query(`
      CREATE TABLE IF NOT EXISTS challenge_results (
        id SERIAL PRIMARY KEY,
        challenge_id INT NOT NULL REFERENCES weekly_challenges(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        score INT DEFAULT 0,
        questions_answered INT DEFAULT 0,
        accuracy FLOAT DEFAULT 0,
        streak_bonus INT DEFAULT 0,
        completed_at TIMESTAMP,
        UNIQUE(challenge_id, user_id)
      );
    `);
    console.log('✅ Table "challenge_results" created');

    // Create user_submitted_questions table (UGC)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_submitted_questions (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
        category VARCHAR(100) NOT NULL,
        difficulty VARCHAR(20) DEFAULT 'Junior',
        question_text TEXT NOT NULL,
        short_answer TEXT NOT NULL,
         options JSONB,
        language VARCHAR(50) DEFAULT 'Java',
        status VARCHAR(20) DEFAULT 'pending',
        reviewed_by BIGINT REFERENCES users(telegram_id),
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "user_submitted_questions" created');

    // Create index for UGC review
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ugc_status ON user_submitted_questions(status)
    `);
    console.log('✅ Index idx_ugc_status created');

    // Create user_email_preferences table for digest
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_email_preferences (
        user_id BIGINT PRIMARY KEY REFERENCES users(telegram_id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        digest_enabled BOOLEAN DEFAULT TRUE,
        digest_frequency VARCHAR(10) DEFAULT 'daily',
        language VARCHAR(50) DEFAULT 'Java',
        UNIQUE(email)
      );
    `);
    console.log('✅ Table "user_email_preferences" created');

    // Companies GIN index is created by migration 002_add_companies_column

    // Create company_list table
    await client.query(`
      CREATE TABLE IF NOT EXISTS company_list (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        icon VARCHAR(100),
        sort_order INT DEFAULT 0
      );
    `);
    console.log('✅ Table "company_list" created');

    // Create user_preferences table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        telegram_id BIGINT PRIMARY KEY REFERENCES users(telegram_id) ON DELETE CASCADE,
        selected_categories TEXT[],
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "user_preferences" created');

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
