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
import { billingService } from './services/billingService.js';
import { metricsService } from './services/metricsService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV === 'development';
const ADMIN_IDS = new Set(
  (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
);

// ─── Global Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const allowed = ['localhost', 'vercel.app', 'pages.dev', 'workers.dev', 'fly.dev', 'telegram.org', 'web.telegram.org'];
    if (allowed.some(d => origin.includes(d))) return cb(null, true);
    if (process.env.ALLOWED_ORIGIN && origin.includes(process.env.ALLOWED_ORIGIN)) return cb(null, true);
    console.warn(`CORS blocked: ${origin}`);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(sanitizeBody);
app.use(requestLogger);

// ─── Health ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── Languages ───────────────────────────────────────────────────────
app.get('/api/languages', (req, res) => res.json({ languages: getAvailableLanguages() }));

// ─── Categories (language-aware) ─────────────────────────────────────
app.get('/api/categories', async (req, res) => {
  try {
    const language = req.query.language || 'Java';
    const result = await pool.query(
      `SELECT DISTINCT category, COUNT(*) as count FROM questions WHERE language = $1 GROUP BY category ORDER BY category`,
      [language]
    );
    res.json({ language, categories: result.rows.map(r => ({ name: r.category, count: parseInt(r.count) })) });
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
       ON CONFLICT (telegram_id) DO UPDATE SET
         username = EXCLUDED.username,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name
       RETURNING *`,
      [userData.telegram_id, userData.username, userData.first_name, userData.last_name]
    );
    const user = result.rows[0];

    // Auto-grant admin plan if user is in ADMIN_TELEGRAM_IDS
    if (ADMIN_IDS.has(String(user.telegram_id))) {
      try {
        await pool.query(
          `INSERT INTO user_subscriptions (user_id, plan_id, status, expires_at, payment_id, payment_provider)
           VALUES ($1, 'admin', 'active', NULL, 'admin_grant', 'system')
           ON CONFLICT DO NOTHING`,
          [user.telegram_id]
        ).catch(async () => {
          // Try 'pro' plan if 'admin' plan doesn't exist
          await pool.query(
            `INSERT INTO user_subscriptions (user_id, plan_id, status, expires_at, payment_id, payment_provider)
             VALUES ($1, 'pro', 'active', NULL, 'admin_grant', 'system')
             ON CONFLICT DO NOTHING`,
            [user.telegram_id]
          ).catch(() => { });
        });
        await pool.query(
          `UPDATE users SET subscription_plan = 'pro' WHERE telegram_id = $1`,
          [user.telegram_id]
        ).catch(() => { });
      } catch { }
    }

    // Background warm-up: pre-enqueue AI generation jobs for this user's next questions
    try {
      const preload = await pool.query(
        `SELECT q.question_text, q.short_answer, q.language FROM questions q
         LEFT JOIN user_progress up ON q.id = up.question_id AND up.user_id = $1
         WHERE up.id IS NULL OR up.status = 'unknown' ORDER BY RANDOM() LIMIT 5`,
        [user.telegram_id]
      );
      preload.rows.forEach(q => {
        enqueueJob('explanation', { questionText: q.question_text, shortAnswer: q.short_answer, userId: user.telegram_id, language: q.language || 'Java' }).catch(() => { });
      });
    } catch (e) { console.error('Preload error:', e.message); }

    // Resolve plan
    let plan = 'free';
    if (ADMIN_IDS.has(String(user.telegram_id))) {
      plan = 'admin'; // always admin regardless of DB
    } else {
      try {
        const subResult = await pool.query(
          `SELECT plan_id FROM user_subscriptions WHERE user_id = $1 AND status = 'active'
           AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
           ORDER BY created_at DESC LIMIT 1`,
          [user.telegram_id]
        );
        if (subResult.rows.length > 0) plan = subResult.rows[0].plan_id;
      } catch { }
    }

    res.json({
      success: true,
      user: {
        telegram_id: user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        resume_text: user.resume_text,
        parsed_resume_data: user.parsed_resume_data,
        language: user.language || 'Java',
        plan,
        is_admin: ADMIN_IDS.has(String(user.telegram_id)),
      },
    });
  } catch (error) {
    console.error('Error in /auth/login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Preferences ─────────────────────────────────────────────────────
app.get('/api/preferences/:userId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT selected_categories, selected_language FROM user_preferences WHERE telegram_id = $1',
      [req.params.userId]
    );
    res.json({
      selectedCategories: rows[0]?.selected_categories || [],
      selectedLanguage: rows[0]?.selected_language || 'Java',
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

app.post('/api/preferences', validateBody({ userId: { required: true }, categories: { required: true } }), async (req, res) => {
  try {
    const { userId, categories, language } = req.body;
    await pool.query(
      `INSERT INTO user_preferences (telegram_id, selected_categories, selected_language, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (telegram_id) DO UPDATE SET
         selected_categories = $2,
         selected_language = $3,
         updated_at = NOW()`,
      [userId, categories, language || 'Java']
    );
    if (language) {
      await pool.query('UPDATE users SET language = $1 WHERE telegram_id = $2', [language, userId]).catch(() => { });
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// ─── Language switch (updates preference, clears category filter for new lang) ──
app.post('/api/preferences/language', validateBody({ userId: { required: true }, language: { required: true } }), async (req, res) => {
  try {
    const { userId, language } = req.body;
    // Clear categories so the new language shows all questions (not filtered by old lang's cats)
    await pool.query(
      `INSERT INTO user_preferences (telegram_id, selected_categories, selected_language, updated_at)
       VALUES ($1, ARRAY[]::TEXT[], $2, NOW())
       ON CONFLICT (telegram_id) DO UPDATE SET
         selected_categories = ARRAY[]::TEXT[],
         selected_language = $2,
         updated_at = NOW()`,
      [userId, language]
    );
    await pool.query('UPDATE users SET language = $1 WHERE telegram_id = $2', [language, userId]).catch(() => { });
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating language preference:', err);
    res.status(500).json({ error: 'Failed to update language' });
  }
});

// ─── Question Feed ────────────────────────────────────────────────────
app.get('/api/questions/feed', async (req, res) => {
  try {
    const { userId } = req.query;
    const language = req.query.language || 'Java';
    const mode = req.query.mode || 'swipe';
    const limit = Math.min(parseInt(req.query.limit) || 5, 10);
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    // Load user's category preferences (only apply if they match current language)
    const prefsResult = await pool.query(
      'SELECT selected_categories, selected_language FROM user_preferences WHERE telegram_id = $1',
      [userId]
    );
    const prefs = prefsResult.rows[0];
    const savedLang = prefs?.selected_language || 'Java';
    const selectedCategories = (savedLang === language) ? (prefs?.selected_categories || []) : [];

    // ── Mode-specific WHERE clause ─────────────────────────────────────
    // Exclude questions that are missing required AI-generated data for the
    // mode — they'd cause 404s on answer submission.
    // Test mode: ONLY return questions with pre-populated options (array length >= 4).
    // All other modes get all questions and load AI data on-demand.
    // This eliminates all fetchGeneration calls from TestMode.
    const modeFilter = (mode === 'test')
      ? `AND COALESCE(jsonb_array_length(to_jsonb(q.options)), 0) >= 4`
      : '';

    const catFilter = selectedCategories.length > 0
      ? 'AND q.category = ANY($cat)'
      : '';

    // Build query with named-position params to handle dynamic cat filter
    let query, params;
    if (selectedCategories.length > 0) {
      query = `
        SELECT q.id, q.category, q.difficulty, q.question_text, q.short_answer,
               q.options, q.bug_hunting_data, q.blitz_data, q.code_completion_data, q.language
        FROM questions q
        LEFT JOIN user_progress up ON q.id = up.question_id AND up.user_id = $1
        WHERE (up.id IS NULL OR up.status = 'unknown')
          AND q.language = $2
          AND q.category = ANY($3)
          ${modeFilter}
        ORDER BY RANDOM() LIMIT $4`;
      params = [userId, language, selectedCategories, limit];
    } else {
      query = `
        SELECT q.id, q.category, q.difficulty, q.question_text, q.short_answer,
               q.options, q.bug_hunting_data, q.blitz_data, q.code_completion_data, q.language
        FROM questions q
        LEFT JOIN user_progress up ON q.id = up.question_id AND up.user_id = $1
        WHERE (up.id IS NULL OR up.status = 'unknown')
          AND q.language = $2
          ${modeFilter}
        ORDER BY RANDOM() LIMIT $3`;
      params = [userId, language, limit];
    }

    const result = await pool.query(query, params);

    // If no questions found, return empty array with helpful meta
    // (don't 500 — TypeScript or newly added languages may legitimately have 0 questions)
    const questions = result.rows.map(row => ({
      id: row.id,
      category: row.category,
      difficulty: row.difficulty,
      question: row.question_text,
      shortAnswer: row.short_answer,
      options: row.options || [],
      bugHuntingData: row.bug_hunting_data || null,
      blitzData: row.blitz_data || null,
      codeCompletionData: row.code_completion_data || null,
      language: row.language || 'Java',
    }));

    res.json({ questions, meta: { language, mode, total: questions.length } });
  } catch (error) {
    console.error('Error in /questions/feed:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── AI Generation (cache-first, non-blocking) ────────────────────────
app.post('/api/generate/:type', rateLimit('ai_generation'), async (req, res) => {
  try {
    const { type } = req.params;
    const { questionText, shortAnswer, category, userId, questionId, language = 'Java' } = req.body;
    if (!questionText) return res.status(400).json({ error: 'questionText is required' });

    const modeMap = { explanation: 'explanation', test: 'test', blitz: 'blitz', bug: 'bug', code: 'code' };
    const mode = modeMap[type];
    if (!mode) return res.status(400).json({ error: 'Invalid generation type' });

    const cachedRaw = await checkCache(questionText, mode, null, language);
    if (cachedRaw) {
      // Bug 2 fix: parse JSON modes before sending so the client gets a real object,
      // not a string. Text modes (explanation) are sent as-is.
      const JSON_MODES = new Set(['test', 'bug', 'blitz', 'code']);
      let data = cachedRaw;
      if (JSON_MODES.has(mode)) {
        try { data = JSON.parse(cachedRaw); } catch { /* keep raw string */ }
      }
      return res.json({ status: 'ready', data });
    }

    // Include questionId in job payload so worker can backfill questions table
    await enqueueJob(type, { questionText, shortAnswer, category, userId, questionId, language });
    return res.json({ status: 'pending' });
  } catch (err) {
    console.error('Error in /api/generate/:type:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────

// Resolve AI-generated data for a question.
// Priority: questions table column (fast, backfilled by worker)
//           → ai_cache (slower, direct lookup)
//           → null (not yet generated)
async function resolveAIData(questionId, columnName, cacheMode) {
  const qRes = await pool.query(
    `SELECT question_text, language, ${columnName} FROM questions WHERE id=$1`,
    [questionId]
  );
  if (!qRes.rows[0]) return { data: null, question: null };

  const row = qRes.rows[0];
  let data = row[columnName];

  if (!data) {
    // Fall back to ai_cache
    const cached = await checkCache(row.question_text, cacheMode, null, row.language || 'Java');
    if (cached) {
      try {
        data = JSON.parse(cached);
        // Opportunistically backfill so next hit is fast
        pool.query(`UPDATE questions SET ${columnName}=$1 WHERE id=$2`, [JSON.stringify(data), questionId]).catch(() => { });
      } catch { data = null; }
    }
  }

  return { data, question: row };
}

async function recordProgress(userId, questionId, isCorrect) {
  const status = isCorrect ? 'known' : 'unknown';
  await pool.query(
    `INSERT INTO user_progress (user_id, question_id, status, updated_at)
     VALUES ($1,$2,$3,CURRENT_TIMESTAMP)
     ON CONFLICT (user_id, question_id) DO UPDATE
       SET status=EXCLUDED.status, updated_at=CURRENT_TIMESTAMP`,
    [userId, questionId, status]
  );
}

// ─── Swipe ────────────────────────────────────────────────────────────
app.post('/api/questions/swipe',
  validateBody({ userId: { required: true }, questionId: { required: true }, status: { required: true, enum: ['known', 'unknown'] } }),
  async (req, res) => {
    try {
      const { userId, questionId, status } = req.body;
      await pool.query(
        `INSERT INTO user_progress (user_id, question_id, status, updated_at) VALUES ($1,$2,$3,CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, question_id) DO UPDATE SET status=EXCLUDED.status, updated_at=CURRENT_TIMESTAMP`,
        [userId, questionId, status]
      );
      res.json({ success: true });
    } catch { res.status(500).json({ error: 'Internal server error' }); }
  }
);

// ─── Test answer ──────────────────────────────────────────────────────
app.post('/api/questions/test-answer',
  validateBody({ userId: { required: true }, questionId: { required: true }, answer: { required: true } }),
  async (req, res) => {
    try {
      const { userId, questionId, answer } = req.body;
      const qRes = await pool.query('SELECT short_answer FROM questions WHERE id=$1', [questionId]);
      if (!qRes.rows[0]) return res.status(404).json({ error: 'Question not found' });
      const correctAnswer = qRes.rows[0].short_answer;
      const norm = s => (s || '').trim().toLowerCase();
      const isCorrect = norm(answer) === norm(correctAnswer);
      await recordProgress(userId, questionId, isCorrect);
      res.json({ success: true, isCorrect, correctAnswer });
    } catch { res.status(500).json({ error: 'Internal server error' }); }
  }
);

// ─── Bug hunt answer ──────────────────────────────────────────────────
app.post('/api/questions/bug-hunt-answer',
  validateBody({ userId: { required: true }, questionId: { required: true }, answer: { required: true } }),
  async (req, res) => {
    try {
      const { userId, questionId, answer } = req.body;
      const { data } = await resolveAIData(questionId, 'bug_hunting_data', 'bug');
      if (!data) return res.status(404).json({ error: 'Bug hunt data not generated yet — please wait' });
      const correctBug = data.bug;
      const norm = s => (s || '').trim().toLowerCase();
      const isCorrect = norm(answer) === norm(correctBug);
      await recordProgress(userId, questionId, isCorrect);
      res.json({ success: true, isCorrect, correctAnswer: correctBug });
    } catch (err) {
      console.error('bug-hunt-answer error:', err.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── Blitz answer ─────────────────────────────────────────────────────
app.post('/api/questions/blitz-answer',
  validateBody({ userId: { required: true } }),
  async (req, res) => {
    try {
      const { userId, questionId, answer, clientIsCorrect } = req.body;
      let isCorrect;
      try {
        const { data } = await resolveAIData(questionId, 'blitz_data', 'blitz');
        if (data) {
          isCorrect = Boolean(answer) === Boolean(data.isCorrect);
        } else {
          // Blitz data not in DB yet (fallback statement used) — trust client evaluation
          isCorrect = Boolean(clientIsCorrect);
        }
      } catch {
        isCorrect = Boolean(clientIsCorrect);
      }
      await recordProgress(userId, questionId, isCorrect);
      res.json({ success: true, isCorrect });
    } catch (err) {
      console.error('blitz-answer error:', err.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── Code completion answer ───────────────────────────────────────────
app.post('/api/questions/code-completion-answer',
  validateBody({ userId: { required: true }, questionId: { required: true }, answer: { required: true } }),
  async (req, res) => {
    try {
      const { userId, questionId, answer } = req.body;
      const { data } = await resolveAIData(questionId, 'code_completion_data', 'code');
      if (!data) return res.status(404).json({ error: 'Code completion data not generated yet — please wait' });
      const correctPart = data.correctPart;
      const normC = s => (s || '').trim().toLowerCase();
      const isCorrect = normC(answer) === normC(correctPart);
      await recordProgress(userId, questionId, isCorrect);
      res.json({ success: true, isCorrect, correctAnswer: correctPart });
    } catch (err) {
      console.error('code-completion-answer error:', err.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── Interview Evaluation ─────────────────────────────────────────────
app.post('/api/questions/interview-evaluate', rateLimit('interview'), async (req, res) => {
  try {
    const { question, answer, language = 'Java' } = req.body;
    if (!question || !answer) return res.status(400).json({ error: 'question and answer are required' });
    const evaluation = await evaluateInterviewAnswer(question, answer, null, language);
    res.json(evaluation);
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

// ─── Explanation ──────────────────────────────────────────────────────
app.post('/api/questions/explain', async (req, res) => {
  try {
    const { questionId, userId } = req.body;
    if (!questionId) return res.status(400).json({ error: 'questionId is required' });

    // ── 1. Check DB-cached explanation first (no AI needed) ──────────
    const result = await pool.query(
      'SELECT id, question_text, short_answer, cached_explanation, language FROM questions WHERE id = $1',
      [questionId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Question not found' });

    const question = result.rows[0];
    if (question.cached_explanation) {
      return res.json({ explanation: question.cached_explanation, cached: true });
    }

    // ── 2. Check AI cache (also cached, no model call needed) ─────────
    const cachedAI = await checkCache(question.question_text, 'explanation', null, question.language || 'Java');
    if (cachedAI) {
      // Backfill the questions table cache too
      pool.query('UPDATE questions SET cached_explanation=$1 WHERE id=$2', [cachedAI, questionId]).catch(() => { });
      return res.json({ explanation: cachedAI, cached: true });
    }

    // ── 3. Call AI — let errors bubble so the client knows what failed ─
    console.log(`🤖 Generating explanation for question ${questionId} (${question.language || 'Java'})`);
    const explanation = await generateExplanation(
      question.question_text, question.short_answer, userId || null, question.language || 'Java'
    );

    // Backfill both caches asynchronously
    pool.query('UPDATE questions SET cached_explanation=$1 WHERE id=$2', [explanation, questionId]).catch(() => { });

    res.json({ explanation, cached: false });
  } catch (error) {
    console.error('Error in /questions/explain:', error.message);
    // Return the real error message — helps diagnose model/key issues in production
    res.status(500).json({
      error: 'AI explanation failed',
      detail: error.message,
    });
  }
});

// ─── Resume Analysis ──────────────────────────────────────────────────
app.post('/api/user/analyze-resume', rateLimit('resume'), async (req, res) => {
  try {
    const { userId, resumeText, language = 'Java' } = req.body;
    if (!userId || !resumeText) return res.status(400).json({ error: 'userId and resumeText are required' });
    const parsedData = await analyzeResume(resumeText, userId, language);
    await pool.query(
      'UPDATE users SET resume_text = $1, parsed_resume_data = $2 WHERE telegram_id = $3',
      [resumeText, parsedData, userId]
    ).catch(() => { });
    res.json({ success: true, parsedData });
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/api/user/resume/:userId', async (req, res) => {
  try {
    const result = await pool.query('SELECT resume_text, parsed_resume_data FROM users WHERE telegram_id = $1', [req.params.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

// ─── Subscription ─────────────────────────────────────────────────────
app.get('/api/subscription/plans', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM subscription_plans ORDER BY price_monthly ASC');
    if (rows.length === 0) {
      // Return default plans if table is empty or missing
      return res.json({
        plans: [
          { id: 'free', name: 'Free', price_monthly: 0, requests_per_day: 200, available_languages: ['Java', 'Python', 'TypeScript'], available_modes: ['swipe', 'test'] },
          { id: 'pro', name: 'Pro', price_monthly: 9, requests_per_day: 1000, available_languages: ['Java', 'Python', 'TypeScript'], available_modes: ['swipe', 'test', 'bug-hunting', 'blitz', 'mock-interview', 'concept-linker', 'code-completion'], resume_analysis_limit: 10, interview_eval_limit: 50 },
        ],
      });
    }
    res.json({ plans: rows });
  } catch {
    res.json({
      plans: [
        { id: 'free', name: 'Free', price_monthly: 0 },
        { id: 'pro', name: 'Pro', price_monthly: 9 },
      ],
    });
  }
});

app.get('/api/subscription/status/:userId', async (req, res) => {
  try {
    const isAdmin = ADMIN_IDS.has(String(req.params.userId));
    if (isAdmin) {
      return res.json({ plan: 'admin', plan_name: 'Admin (Unlimited)', status: 'active', is_admin: true });
    }
    const { rows } = await pool.query(
      `SELECT us.*, sp.name as plan_name, sp.available_languages, sp.available_modes
       FROM user_subscriptions us JOIN subscription_plans sp ON us.plan_id = sp.id
       WHERE us.user_id = $1 AND us.status = 'active'
         AND (us.expires_at IS NULL OR us.expires_at > CURRENT_TIMESTAMP)
       ORDER BY us.created_at DESC LIMIT 1`,
      [req.params.userId]
    );
    if (rows.length === 0) return res.json({ plan: 'free', plan_name: 'Free', status: 'active' });
    res.json(rows[0]);
  } catch { res.json({ plan: 'free', status: 'active' }); }
});

app.post('/api/subscription/subscribe',
  validateBody({ userId: { required: true }, planId: { required: true } }),
  async (req, res) => {
    try {
      const result = await billingService.createSubscription(req.body.userId, req.body.planId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.get('/api/subscription/history/:userId', async (req, res) => {
  try {
    const history = await billingService.getHistory(req.params.userId);
    res.json({ history });
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

// Cancel subscription
app.post('/api/subscription/cancel',
  validateBody({ userId: { required: true } }),
  async (req, res) => {
    try {
      const result = await billingService.cancelSubscription(req.body.userId);
      res.json(result);
    } catch (err) {
      console.error('Cancel subscription error:', err.message);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }
);

// ─── Admin Endpoints ──────────────────────────────────────────────────

// Grant plan (admin-only)
app.post('/api/admin/grant-plan', async (req, res) => {
  try {
    const { adminUserId, targetUserId, planId, months = 12 } = req.body;
    if (!ADMIN_IDS.has(String(adminUserId))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const expiresAt = months === 0 ? null : new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000);
    await pool.query('BEGIN');
    await pool.query(
      `UPDATE user_subscriptions SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND status = 'active'`,
      [targetUserId]
    );
    await pool.query(
      `INSERT INTO user_subscriptions (user_id, plan_id, status, expires_at, payment_id, payment_provider)
       VALUES ($1, $2, 'active', $3, 'admin_grant', 'admin')`,
      [targetUserId, planId, expiresAt]
    );
    await pool.query(
      `UPDATE users SET subscription_plan = $1, subscription_expires_at = $2 WHERE telegram_id = $3`,
      [planId, expiresAt, targetUserId]
    );
    await pool.query('COMMIT');
    res.json({ success: true, message: `Granted ${planId} to ${targetUserId}` });
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => { });
    res.status(500).json({ error: err.message });
  }
});

// List all users (admin-only)
app.get('/api/admin/users', async (req, res) => {
  try {
    const { adminUserId } = req.query;
    if (!ADMIN_IDS.has(String(adminUserId))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { rows } = await pool.query(`
      SELECT u.telegram_id, u.username, u.first_name, u.subscription_plan,
             u.subscription_expires_at, u.created_at,
             COUNT(up.id) as questions_seen
      FROM users u
      LEFT JOIN user_progress up ON up.user_id = u.telegram_id
      GROUP BY u.telegram_id, u.username, u.first_name, u.subscription_plan, u.subscription_expires_at, u.created_at
      ORDER BY u.created_at DESC LIMIT 100
    `);
    res.json({ users: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/metrics', async (req, res) => {
  try {
    const metrics = await metricsService.getSystemOverview();
    res.json(metrics);
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

app.post('/api/admin/clear-cache', async (req, res) => {
  try {
    await pool.query('DELETE FROM ai_cache');
    res.json({ success: true, message: 'AI Cache cleared' });
  } catch { res.status(500).json({ error: 'Internal server error' }); }
});

// ─── Category-scoped stats (§3 topic counter) ────────────────────────
app.get('/api/stats/categories', async (req, res) => {
  try {
    const { userId, language = 'Java', categories } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    let cats = [];
    try { cats = JSON.parse(decodeURIComponent(categories || '[]')); } catch { }

    if (cats.length === 0) return res.json({ known: 0, total: 0 });

    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE up.status = 'known') AS known,
         COUNT(q.id)                                  AS total
       FROM questions q
       LEFT JOIN user_progress up ON q.id = up.question_id AND up.user_id = $1
       WHERE q.language = $2 AND q.category = ANY($3)`,
      [userId, language, cats]
    );
    res.json({
      known: parseInt(result.rows[0].known || 0),
      total: parseInt(result.rows[0].total || 0),
    });
  } catch (err) {
    console.error('Category stats error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Stats ────────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const { userId } = req.query;
    const language = req.query.language || 'Java';
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    // Join with questions so stats are language-scoped
    // Switching language shows only that language's progress
    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE up.status = 'known')   AS known_count,
         COUNT(*) FILTER (WHERE up.status = 'unknown') AS unknown_count,
         COUNT(*)                                       AS total_seen
       FROM user_progress up
       JOIN questions q ON q.id = up.question_id
       WHERE up.user_id = $1 AND q.language = $2`,
      [userId, language]
    );
    const totalResult = await pool.query(
      'SELECT COUNT(*) as total FROM questions WHERE language = $1', [language]
    );

    res.json({
      known: parseInt(result.rows[0].known_count || 0),
      unknown: parseInt(result.rows[0].unknown_count || 0),
      totalSeen: parseInt(result.rows[0].total_seen || 0),
      totalQuestions: parseInt(totalResult.rows[0].total || 0),
    });
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Server ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║   🚀 Interview Tinder Backend                  ║
╠════════════════════════════════════════════════╣
║   Port: ${String(PORT).padEnd(39)}║
║   Mode: ${(isDev ? 'Development' : 'Production').padEnd(39)}║
║   Admins: ${String(ADMIN_IDS.size).padEnd(37)}║
╚════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', async () => { await pool.end(); process.exit(0); });
process.on('SIGINT', async () => { await pool.end(); process.exit(0); });

export default app;