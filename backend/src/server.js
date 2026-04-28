import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/database.js';
import { validateTelegramWebAppData, mockValidation } from './utils/telegram.js';
import { generateExplanation, evaluateInterviewAnswer, analyzeResume, checkCache } from './services/aiService.js';
import { enqueueJob } from './services/queueService.js';
import { getLanguage, getAvailableLanguages, getCategories } from './services/languageRegistry.js';
import { requestLogger, validateBody, sanitizeBody } from './middleware/logging.js';
import { rateLimit, requireEntitlement, trackEvent } from './middleware/rateLimiter.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV === 'development';

// ─── Global Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || origin.includes('localhost') || origin.includes('vercel.app')) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(sanitizeBody);
app.use(requestLogger);

// ─── Health ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Languages ───────────────────────────────────────────────────────
app.get('/api/languages', (req, res) => {
  res.json({ languages: getAvailableLanguages() });
});

// ─── Categories (language-aware) ─────────────────────────────────────
app.get('/api/categories', async (req, res) => {
  try {
    const language = req.query.language || 'Java';
    const result = await pool.query(
      `SELECT DISTINCT category, COUNT(*) as count FROM questions WHERE language = $1 GROUP BY category ORDER BY category`,
      [language]
    );
    res.json({
      language,
      categories: result.rows.map(r => ({ name: r.category, count: parseInt(r.count) }))
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ─── Auth ────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { initData } = req.body;
    let userData;

    if (process.env.BOT_TOKEN && initData) {
      userData = validateTelegramWebAppData(initData, process.env.BOT_TOKEN);
    }
    if (!userData) {
      if (!isDev) return res.status(401).json({ error: 'Invalid initData' });
      userData = mockValidation(initData);
    }
    if (!userData) return res.status(401).json({ error: 'Invalid initData' });

    const result = await pool.query(
      `INSERT INTO users (telegram_id, username, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (telegram_id) DO UPDATE SET username = EXCLUDED.username, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name
       RETURNING *`,
      [userData.telegram_id, userData.username, userData.first_name, userData.last_name]
    );
    const user = result.rows[0];

    // Preload 5 questions in background
    try {
      const preload = await pool.query(
        `SELECT q.question_text, q.short_answer, q.category, q.language FROM questions q
         LEFT JOIN user_progress up ON q.id = up.question_id AND up.user_id = $1
         WHERE up.id IS NULL OR up.status = 'unknown' ORDER BY RANDOM() LIMIT 5`,
        [user.telegram_id]
      );
      preload.rows.forEach(q => {
        enqueueJob('explanation', { questionText: q.question_text, shortAnswer: q.short_answer, userId: user.telegram_id, language: q.language || 'Java' }).catch(() => {});
        enqueueJob('test', { questionText: q.question_text, shortAnswer: q.short_answer, userId: user.telegram_id, language: q.language || 'Java' }).catch(() => {});
      });
    } catch (e) { console.error('Preload error:', e.message); }

    // Get subscription info
    let plan = 'free';
    try {
      const subResult = await pool.query(
        `SELECT plan_id FROM user_subscriptions WHERE user_id = $1 AND status = 'active' AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP) ORDER BY created_at DESC LIMIT 1`,
        [user.telegram_id]
      );
      if (subResult.rows.length > 0) plan = subResult.rows[0].plan_id;
    } catch (e) { /* no subscription tables yet is fine */ }

    res.json({
      success: true,
      user: {
        telegram_id: user.telegram_id, username: user.username,
        first_name: user.first_name, last_name: user.last_name,
        resume_text: user.resume_text, parsed_resume_data: user.parsed_resume_data,
        language: user.language || 'Java', plan
      }
    });
  } catch (error) {
    console.error('Error in /auth/login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Preferences ─────────────────────────────────────────────────────
app.get('/api/preferences/:userId', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT selected_categories, selected_language FROM user_preferences WHERE telegram_id = $1', [req.params.userId]);
    res.json({ selectedCategories: rows[0]?.selected_categories || [], selectedLanguage: rows[0]?.selected_language || 'Java' });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch preferences' }); }
});

app.post('/api/preferences', validateBody({ userId: { required: true }, categories: { required: true } }), async (req, res) => {
  try {
    const { userId, categories, language } = req.body;
    await pool.query(
      `INSERT INTO user_preferences (telegram_id, selected_categories, selected_language, updated_at) VALUES ($1, $2, $3, NOW())
       ON CONFLICT (telegram_id) DO UPDATE SET selected_categories = $2, selected_language = $3, updated_at = NOW()`,
      [userId, categories, language || 'Java']
    );
    if (language) {
      await pool.query('UPDATE users SET language = $1 WHERE telegram_id = $2', [language, userId]).catch(() => {});
    }
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Failed to update preferences' }); }
});

// ─── Question Feed (static data only, no AI blocking) ────────────────
app.get('/api/questions/feed', async (req, res) => {
  try {
    const { userId } = req.query;
    const language = req.query.language || 'Java';
    const limit = Math.min(parseInt(req.query.limit) || 5, 10);
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const prefsResult = await pool.query('SELECT selected_categories FROM user_preferences WHERE telegram_id = $1', [userId]);
    const selectedCategories = prefsResult.rows[0]?.selected_categories;

    let query, params;
    if (selectedCategories?.length > 0) {
      query = `SELECT q.id, q.category, q.difficulty, q.question_text, q.short_answer, q.options, q.bug_hunting_data, q.blitz_data, q.code_completion_data, q.language
               FROM questions q LEFT JOIN user_progress up ON q.id = up.question_id AND up.user_id = $1
               WHERE (up.id IS NULL OR up.status = 'unknown') AND q.category = ANY($2) AND q.language = $3
               ORDER BY RANDOM() LIMIT $4`;
      params = [userId, selectedCategories, language, limit];
    } else {
      query = `SELECT q.id, q.category, q.difficulty, q.question_text, q.short_answer, q.options, q.bug_hunting_data, q.blitz_data, q.code_completion_data, q.language
               FROM questions q LEFT JOIN user_progress up ON q.id = up.question_id AND up.user_id = $1
               WHERE (up.id IS NULL OR up.status = 'unknown') AND q.language = $2
               ORDER BY RANDOM() LIMIT $3`;
      params = [userId, language, limit];
    }

    const result = await pool.query(query, params);

    const questions = result.rows.map(row => {
      // Fire-and-forget background generation
      enqueueJob('explanation', { questionText: row.question_text, shortAnswer: row.short_answer, userId, language }).catch(() => {});
      enqueueJob('test', { questionText: row.question_text, shortAnswer: row.short_answer, userId, language }).catch(() => {});
      return {
        id: row.id, category: row.category, difficulty: row.difficulty,
        question: row.question_text, shortAnswer: row.short_answer,
        options: row.options || [], bugHuntingData: row.bug_hunting_data || null,
        blitzData: row.blitz_data || null, codeCompletionData: row.code_completion_data || null,
        language: row.language || 'Java'
      };
    });

    res.json({ questions });
  } catch (error) {
    console.error('Error in /questions/feed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Generation Endpoints (non-blocking, cache-first) ────────────────
app.post('/api/generate/:type', rateLimit('ai_generation'), async (req, res) => {
  try {
    const { type } = req.params;
    const { questionText, shortAnswer, category, userId, language = 'Java' } = req.body;
    if (!questionText) return res.status(400).json({ error: 'questionText is required' });

    const typeConfig = {
      explanation: { mode: 'explanation', model: 'openrouter/quality-model' },
      test: { mode: 'test', model: 'openrouter/fast-model' },
      blitz: { mode: 'blitz', model: 'openrouter/fast-model' },
      bug: { mode: 'bug', model: 'openrouter/fast-model' },
      code: { mode: 'code', model: 'openrouter/fast-model' }
    };
    const config = typeConfig[type];
    if (!config) return res.status(400).json({ error: 'Invalid generation type' });

    const cached = await checkCache(questionText, config.mode, config.model, language);
    if (cached) {
      trackEvent({ userId, eventType: 'ai_cache_hit', endpoint: `/generate/${type}`, cacheHit: true });
      return res.json({ status: 'ready', data: cached });
    }

    await enqueueJob(type, { questionText, shortAnswer, category, userId, language });
    return res.json({ status: 'pending' });
  } catch (err) {
    console.error('Error in /api/generate/:type:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Answer Submission Endpoints (idempotent via UPSERT) ─────────────
app.post('/api/questions/swipe', validateBody({ userId: { required: true }, questionId: { required: true }, status: { required: true, enum: ['known', 'unknown'] } }), async (req, res) => {
  try {
    const { userId, questionId, status } = req.body;
    await pool.query(
      `INSERT INTO user_progress (user_id, question_id, status, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, question_id) DO UPDATE SET status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP`,
      [userId, questionId, status]
    );
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

app.post('/api/questions/test-answer', validateBody({ userId: { required: true }, questionId: { required: true }, answer: { required: true } }), async (req, res) => {
  try {
    const { userId, questionId, answer } = req.body;
    const result = await pool.query('SELECT short_answer FROM questions WHERE id = $1', [questionId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Question not found' });

    const correctAnswer = result.rows[0].short_answer;
    const isCorrect = answer === correctAnswer;
    await pool.query(
      `INSERT INTO user_progress (user_id, question_id, status, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, question_id) DO UPDATE SET status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP`,
      [userId, questionId, isCorrect ? 'known' : 'unknown']
    );
    res.json({ success: true, isCorrect, correctAnswer });
  } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

app.post('/api/questions/bug-hunt-answer', validateBody({ userId: { required: true }, questionId: { required: true }, answer: { required: true } }), async (req, res) => {
  try {
    const { userId, questionId, answer } = req.body;
    const result = await pool.query('SELECT bug_hunting_data FROM questions WHERE id = $1', [questionId]);
    if (result.rows.length === 0 || !result.rows[0].bug_hunting_data) return res.status(404).json({ error: 'Bug hunt data not found' });

    const correctBug = result.rows[0].bug_hunting_data.bug;
    const isCorrect = answer === correctBug;
    await pool.query(
      `INSERT INTO user_progress (user_id, question_id, status, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, question_id) DO UPDATE SET status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP`,
      [userId, questionId, isCorrect ? 'known' : 'unknown']
    );
    res.json({ success: true, isCorrect, correctAnswer: correctBug });
  } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

app.post('/api/questions/blitz-answer', validateBody({ userId: { required: true } }), async (req, res) => {
  try {
    const { userId, questionId, answer } = req.body;
    const result = await pool.query('SELECT blitz_data FROM questions WHERE id = $1', [questionId]);
    if (result.rows.length === 0 || !result.rows[0].blitz_data) return res.status(404).json({ error: 'Blitz data not found' });

    const isActuallyCorrect = result.rows[0].blitz_data.isCorrect;
    const isCorrect = answer === isActuallyCorrect;
    await pool.query(
      `INSERT INTO user_progress (user_id, question_id, status, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, question_id) DO UPDATE SET status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP`,
      [userId, questionId, isCorrect ? 'known' : 'unknown']
    );
    res.json({ success: true, isCorrect, correctAnswer: isActuallyCorrect });
  } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

app.post('/api/questions/code-completion-answer', validateBody({ userId: { required: true }, questionId: { required: true }, answer: { required: true } }), async (req, res) => {
  try {
    const { userId, questionId, answer } = req.body;
    const result = await pool.query('SELECT code_completion_data FROM questions WHERE id = $1', [questionId]);
    if (result.rows.length === 0 || !result.rows[0].code_completion_data) return res.status(404).json({ error: 'Code completion data not found' });

    const correctPart = result.rows[0].code_completion_data.correctPart;
    const isCorrect = answer === correctPart;
    await pool.query(
      `INSERT INTO user_progress (user_id, question_id, status, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, question_id) DO UPDATE SET status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP`,
      [userId, questionId, isCorrect ? 'known' : 'unknown']
    );
    res.json({ success: true, isCorrect, correctAnswer: correctPart });
  } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

// ─── Interview Evaluation ────────────────────────────────────────────
app.post('/api/questions/interview-evaluate', rateLimit('interview'), async (req, res) => {
  try {
    const { question, answer, language = 'Java' } = req.body;
    if (!question || !answer) return res.status(400).json({ error: 'question and answer are required' });
    const evaluation = await evaluateInterviewAnswer(question, answer, null, language);
    res.json(evaluation);
  } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

// ─── Explanation ─────────────────────────────────────────────────────
app.post('/api/questions/explain', rateLimit('ai_generation'), async (req, res) => {
  try {
    const { questionId } = req.body;
    if (!questionId) return res.status(400).json({ error: 'questionId is required' });

    const result = await pool.query('SELECT id, question_text, short_answer, cached_explanation, language FROM questions WHERE id = $1', [questionId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Question not found' });

    const question = result.rows[0];
    if (question.cached_explanation) return res.json({ explanation: question.cached_explanation, cached: true });

    const explanation = await generateExplanation(question.question_text, question.short_answer, null, question.language || 'Java');
    await pool.query('UPDATE questions SET cached_explanation = $1 WHERE id = $2', [explanation, questionId]).catch(() => {});
    res.json({ explanation, cached: false });
  } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

// ─── Resume Analysis ─────────────────────────────────────────────────
app.post('/api/user/analyze-resume', rateLimit('resume'), async (req, res) => {
  try {
    const { userId, resumeText, language = 'Java' } = req.body;
    if (!userId || !resumeText) return res.status(400).json({ error: 'userId and resumeText are required' });

    const parsedData = await analyzeResume(resumeText, userId, language);
    await pool.query('UPDATE users SET resume_text = $1, parsed_resume_data = $2 WHERE telegram_id = $3', [resumeText, parsedData, userId]).catch(() => {});
    res.json({ success: true, parsedData });
  } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/api/user/resume/:userId', async (req, res) => {
  try {
    const result = await pool.query('SELECT resume_text, parsed_resume_data FROM users WHERE telegram_id = $1', [req.params.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

// ─── Subscription Endpoints ──────────────────────────────────────────
app.get('/api/subscription/plans', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM subscription_plans ORDER BY price_monthly ASC');
    res.json({ plans: rows });
  } catch (error) { res.json({ plans: [{ id: 'free', name: 'Free', price_monthly: 0 }] }); }
});

app.get('/api/subscription/status/:userId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT us.*, sp.name as plan_name, sp.available_languages, sp.available_modes
       FROM user_subscriptions us JOIN subscription_plans sp ON us.plan_id = sp.id
       WHERE us.user_id = $1 AND us.status = 'active' ORDER BY us.created_at DESC LIMIT 1`,
      [req.params.userId]
    );
    if (rows.length === 0) return res.json({ plan: 'free', status: 'active' });
    res.json(rows[0]);
  } catch (error) { res.json({ plan: 'free', status: 'active' }); }
});

// ─── Stats ───────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const { userId } = req.query;
    const language = req.query.language || 'Java';
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const result = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'known') as known_count,
              COUNT(*) FILTER (WHERE status = 'unknown') as unknown_count,
              COUNT(*) as total_seen
       FROM user_progress WHERE user_id = $1`, [userId]
    );
    const totalQuestions = await pool.query('SELECT COUNT(*) as total FROM questions WHERE language = $1', [language]);

    res.json({
      known: parseInt(result.rows[0].known_count),
      unknown: parseInt(result.rows[0].unknown_count),
      totalSeen: parseInt(result.rows[0].total_seen),
      totalQuestions: parseInt(totalQuestions.rows[0].total)
    });
  } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

// ─── Server ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║   🚀 Interview Tinder Backend Started        ║
╠════════════════════════════════════════════════╣
║   Port: ${PORT.toString().padEnd(39)} ║
║   Mode: ${(isDev ? 'Development' : 'Production').padEnd(39)} ║
╚════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', async () => { await pool.end(); process.exit(0); });
process.on('SIGINT', async () => { await pool.end(); process.exit(0); });

export default app;