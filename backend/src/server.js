import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/database.js';
import {
  validateTelegramWebAppData,
  mockValidation,
} from './utils/telegram.js';
import { generateExplanation } from './services/aiService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV === 'development';

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({ error: 'initData is required' });
    }

    // Validate Telegram data
    let userData;
    if (isDev && !process.env.BOT_TOKEN) {
      console.log('🔧 Development mode: using mock validation');
      userData = mockValidation(initData);
    } else {
      userData = validateTelegramWebAppData(initData, process.env.BOT_TOKEN);
    }

    if (!userData) {
      return res.status(401).json({ error: 'Invalid initData' });
    }

    // Create or update user in database
    const result = await pool.query(
      `INSERT INTO users (telegram_id, username, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (telegram_id) 
       DO UPDATE SET 
         username = EXCLUDED.username,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name
       RETURNING *`,
      [
        userData.telegram_id,
        userData.username,
        userData.first_name,
        userData.last_name,
      ],
    );

    const user = result.rows[0];
    console.log(`✅ User authenticated: ${user.telegram_id}`);

    res.json({
      success: true,
      user: {
        telegram_id: user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    });
  } catch (error) {
    console.error('Error in /auth/login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get question feed
app.get('/api/questions/feed', async (req, res) => {
  try {
    const { userId } = req.query;
    const limit = parseInt(req.query.limit) || 10;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get questions that user hasn't seen yet or got wrong
    const result = await pool.query(
      `SELECT q.id, q.category, q.question_text, q.short_answer
       FROM questions q
       LEFT JOIN user_progress up ON q.id = up.question_id AND up.user_id = $1
       WHERE up.id IS NULL OR up.status = 'unknown'
       ORDER BY RANDOM()
       LIMIT $2`,
      [userId, limit],
    );

    const questions = result.rows.map((row) => ({
      id: row.id,
      category: row.category,
      question: row.question_text,
      shortAnswer: row.short_answer,
    }));

    console.log(`📚 Sent ${questions.length} questions to user ${userId}`);

    res.json({ questions });
  } catch (error) {
    console.error('Error in /questions/feed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record swipe action
app.post('/api/questions/swipe', async (req, res) => {
  try {
    const { userId, questionId, status } = req.body;

    if (!userId || !questionId || !status) {
      return res
        .status(400)
        .json({ error: 'userId, questionId, and status are required' });
    }

    if (!['known', 'unknown'].includes(status)) {
      return res
        .status(400)
        .json({ error: 'status must be "known" or "unknown"' });
    }

    // Insert or update progress
    await pool.query(
      `INSERT INTO user_progress (user_id, question_id, status, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, question_id)
       DO UPDATE SET 
         status = EXCLUDED.status,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, questionId, status],
    );

    console.log(
      `✅ Recorded swipe: user=${userId}, question=${questionId}, status=${status}`,
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error in /questions/swipe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get AI explanation for a question
app.post('/api/questions/explain', async (req, res) => {
  try {
    const { questionId } = req.body;

    if (!questionId) {
      return res.status(400).json({ error: 'questionId is required' });
    }

    // Get question from database
    const result = await pool.query(
      'SELECT id, question_text, short_answer, cached_explanation FROM questions WHERE id = $1',
      [questionId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const question = result.rows[0];

    // Check if we have cached explanation
    if (question.cached_explanation) {
      console.log(`💾 Using cached explanation for question ${questionId}`);
      return res.json({
        explanation: question.cached_explanation,
        cached: true,
      });
    }

    // Generate new explanation
    console.log(`🤖 Generating AI explanation for question ${questionId}...`);
    const explanation = await generateExplanation(
      question.question_text,
      question.short_answer,
    );

    // Cache the explanation
    await pool.query(
      'UPDATE questions SET cached_explanation = $1 WHERE id = $2',
      [explanation, questionId],
    );

    console.log(
      `✅ Generated and cached explanation for question ${questionId}`,
    );

    res.json({
      explanation,
      cached: false,
    });
  } catch (error) {
    console.error('Error in /questions/explain:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user statistics
app.get('/api/stats', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE status = 'known') as known_count,
         COUNT(*) FILTER (WHERE status = 'unknown') as unknown_count,
         COUNT(*) as total_seen
       FROM user_progress
       WHERE user_id = $1`,
      [userId],
    );

    const totalQuestions = await pool.query(
      'SELECT COUNT(*) as total FROM questions',
    );

    const stats = {
      known: parseInt(result.rows[0].known_count),
      unknown: parseInt(result.rows[0].unknown_count),
      totalSeen: parseInt(result.rows[0].total_seen),
      totalQuestions: parseInt(totalQuestions.rows[0].total),
    };

    res.json(stats);
  } catch (error) {
    console.error('Error in /stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// // Start server
// app.listen(PORT, () => {
//   console.log(`
// ╔════════════════════════════════════════════════╗
// ║   🚀 Java Interview Tinder Backend Started   ║
// ╠════════════════════════════════════════════════╣
// ║   Port: ${PORT.toString().padEnd(39)} ║
// ║   Mode: ${(isDev ? 'Development' : 'Production').padEnd(39)} ║
// ║   Database: ${(process.env.DATABASE_URL ? '✅ Connected' : '❌ Not configured').padEnd(32)} ║
// ║   OpenRouter: ${(process.env.OPENROUTER_API_KEY ? '✅ Configured' : '❌ Not configured').padEnd(30)} ║
// ╚════════════════════════════════════════════════╝
//   `);
// });
// Старый код (закомментируйте):
// app.listen(PORT, () => {
//   console.log(`Server started on port ${PORT}`);
// });

// Новый код для Vercel:
// Для локальной разработки
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════╗
║   🚀 Java Interview Tinder Backend Started   ║
╠════════════════════════════════════════════════╣
║   Port: ${PORT.toString().padEnd(39)} ║
║   Mode: ${(isDev ? 'Development' : 'Production').padEnd(39)} ║
║   Database: ${(process.env.DATABASE_URL ? '✅ Connected' : '❌ Not configured').padEnd(32)} ║
║   OpenRouter: ${(process.env.OPENROUTER_API_KEY ? '✅ Configured' : '❌ Not configured').padEnd(30)} ║
╚════════════════════════════════════════════════╝
    `);
  });
}

// Экспорт для Vercel
export default app;

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing server...');
  await pool.end();
  process.exit(0);
});
