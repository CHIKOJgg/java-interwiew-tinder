import express from 'express';

const router = express.Router();

router.get('/languages', (req, res) => {
  res.json({ languages: req.app.locals.getAvailableLanguages() });
});

router.get('/stats', async (req, res) => {
  try {
    const result = await req.app.locals.pool.query('SELECT COUNT(*) AS total FROM questions');
    res.json({ totalQuestions: parseInt(result.rows[0].total) });
  } catch (error) {
    req.log.error({ err: error }, 'Failed to fetch public stats');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;