import pool from '../config/database.js';
import { enqueueJob } from '../services/queueService.js';

const type = process.argv[2] || 'all';
const language = process.argv[3] || null;
const types = type === 'all' ? ['test', 'bug', 'blitz', 'code'] : [type];
const allowed = new Set(['test', 'bug', 'blitz', 'code']);

if (types.some(item => !allowed.has(item))) {
  throw new Error('Usage: node src/scripts/prewarm-ai.mjs [test|bug|blitz|code|all] [language]');
}

try {
  const params = language ? [language] : [];
  const whereLanguage = language ? 'AND language = $1' : '';
  const { rows } = await pool.query(
    `SELECT id, question_text, short_answer, category, language
     FROM questions
     WHERE is_active = TRUE ${whereLanguage}
     ORDER BY id`,
    params,
  );

  let queued = 0;
  for (const question of rows) {
    for (const taskType of types) {
      await enqueueJob(taskType, {
        questionId: question.id,
        questionText: question.question_text,
        shortAnswer: question.short_answer,
        category: question.category,
        language: question.language || 'Java',
      });
      queued += 1;
    }
  }

  console.log(JSON.stringify({ questions: rows.length, taskTypes: types, queued, language }, null, 2));
} finally {
  await pool.end();
}
