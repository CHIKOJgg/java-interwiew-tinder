import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const { rows: questions } = await pool.query(
    'SELECT id, question_text, category FROM questions WHERE companies IS NULL OR companies = ARRAY[]::TEXT[]'
  );

  console.log(`Found ${questions.length} questions without company tags`);

  for (const q of questions) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-lite-preview-02-05:free',
          messages: [{
            role: 'user',
            content: `Which IT companies ask this question in interviews? Reply ONLY with a JSON array of company names. Question: "${q.question_text}"`
          }],
        }),
      });

      const data = await response.json();
      let companies = [];
      try {
        companies = JSON.parse(data.choices[0].message.content);
        if (!Array.isArray(companies)) companies = [];
      } catch {
        companies = [];
      }

      await pool.query('UPDATE questions SET companies = $1 WHERE id = $2', [companies, q.id]);
      console.log(`Tagged q#${q.id} (${q.category}): [${companies.join(', ')}]`);
    } catch (err) {
      console.error(`Failed to tag q#${q.id}:`, err.message);
    }
  }

  console.log('Done tagging companies');
  await pool.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
