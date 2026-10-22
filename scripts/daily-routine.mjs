/**
 * Daily Automated Routine for Prep-it:
 * 1. Picks an interview question/topic.
 * 2. Posts an interactive quiz or card to @prep_interview_daily.
 * 3. Can generate a quick Telegra.ph micro-guide and post the Instant View link.
 * 4. Pings IndexNow for instant search indexing.
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// 1. Ensure BOT_TOKEN is loaded
let botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const channelId = process.env.TELEGRAM_CHANNEL_ID || '@prep_interview_daily';
const botUsername = process.env.VITE_TELEGRAM_BOT_USERNAME || 'prep_interview_bot';
const webAppUrl = process.env.VITE_WEBAPP_URL || 'https://solve-it-rho.vercel.app';

try {
  const envPath = path.resolve(ROOT_DIR, 'backend', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (let l of lines) {
      l = l.trim();
      const m = l.match(/^BOT_TOKEN=(.*)$/);
      if (m && !botToken) botToken = m[1].trim();
    }
  }
} catch (e) {}

if (!botToken) {
  console.error('❌ BOT_TOKEN is not set.');
  process.exit(1);
}

// Helper for Telegram API
function callTelegram(method, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = https.request(
      {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${botToken}/${method}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (json.ok) resolve(json.result);
            else reject(new Error(json.description || body));
          } catch (e) {
            reject(new Error(`Parse error: ${body}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Intelligent detection of the correct quiz option index
function detectCorrectOptionId(q) {
  if (typeof q.correct_option_id === 'number') return q.correct_option_id;
  if (typeof q.correct_index === 'number') return q.correct_index;
  if (!Array.isArray(q.options) || q.options.length === 0) return 0;
  if (!q.short_answer) return 0;

  // In RU hand-authored batches, option 0 is authored as the correct answer
  if (['Go', 'TypeScript', 'Rust', 'Kotlin', 'React'].includes(q.language)) {
    return 0;
  }

  // For Java & Python from seed-db, calculate semantic token overlap against short_answer
  const normalize = (str) =>
    str.toLowerCase().replace(/[^a-zа-я0-9s]/gi, ' ').split(/s+/).filter((w) => w.length > 2);

  const answerWords = new Set(normalize(q.short_answer));
  let bestIdx = 1;
  let bestScore = -1;

  q.options.forEach((opt, idx) => {
    const optWords = normalize(opt);
    let matches = 0;
    for (const w of optWords) {
      if (answerWords.has(w)) matches++;
    }
    const score = matches * 10 - (optWords.length - matches);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  });

  return bestIdx >= 0 && bestIdx < q.options.length ? bestIdx : 0;
}

// Load random question across all available curated languages
async function getRandomQuestion() {
  let pool = [];
  try {
    const { newQuestions } = await import('../backend/src/scripts/seed-db-java-2.js');
    pool.push(...newQuestions.map((q) => ({ ...q, language: 'Java' })));
  } catch (e) {}

  try {
    const { pythonQuestions } = await import('../backend/src/scripts/seed-db-python.js');
    pool.push(...pythonQuestions.map((q) => ({ ...q, language: 'Python' })));
  } catch (e) {}

  const ruBatches = [
    'seed-ru-ts1.mjs', 'seed-ru-ts2.mjs',
    'seed-ru-go1.mjs', 'seed-ru-go2.mjs',
    'seed-ru-rust1.mjs', 'seed-ru-rust2.mjs',
    'seed-ru-react1.mjs', 'seed-ru-kotlin1.mjs'
  ];
  for (const b of ruBatches) {
    try {
      const mod = await import('../backend/src/scripts/' + b);
      if (Array.isArray(mod.questions)) {
        pool.push(...mod.questions);
      }
    } catch (e) {}
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

async function runDailyRoutine() {
  console.log(`🌅 Running Daily Prep-it Routine at ${new Date().toISOString()}...`);

  const q = await getRandomQuestion();
  const isQuizDay = Math.random() > 0.4; // 60% quiz, 40% card with spoiler

  if (isQuizDay && Array.isArray(q.options) && q.options.length >= 2) {
    console.log(`🎯 Posting Daily Quiz: "${q.question}"`);
    const questionText = `${q.language === 'Java' ? '☕' : '🐍'} [${q.category || q.language}] ${q.question}`;
    const truncatedQuestion = questionText.length > 290 ? `${questionText.slice(0, 287)}…` : questionText;
    const options = q.options.slice(0, 10).map((opt) => (opt.length > 95 ? `${opt.slice(0, 92)}…` : opt));

    let explanation = q.short_answer || 'Правильный ответ!';
    if (explanation.length > 195) explanation = `${explanation.slice(0, 192)}…`;

    const correctOptionId = detectCorrectOptionId(q);
    console.log(`🎯 Detected correct option index: ${correctOptionId} ("${options[correctOptionId]}")`);

    const result = await callTelegram('sendPoll', {
      chat_id: channelId,
      question: truncatedQuestion,
      options,
      type: 'quiz',
      correct_option_id: correctOptionId,
      explanation,
      is_anonymous: true,
    });
    console.log(`✅ Daily Quiz published! Message ID: ${result.message_id}`);
  } else {
    console.log(`💡 Posting Daily Question Card: "${q.question}"`);
    const langEmoji = q.language === 'Java' ? '☕' : '🐍';
    let optionsText = '';
    if (Array.isArray(q.options) && q.options.length > 0) {
      optionsText = q.options.map((opt, idx) => `${String.fromCharCode(65 + idx)}) ${opt}`).join('\n');
    }

    const text = `${langEmoji} <b>Вопрос дня к собеседованию [${q.language}]</b>
🏷 <i>Тема: ${q.category || 'General'} | Сложность: ${q.difficulty || 'Middle'}</i>

❓ <b>${q.question}</b>

${optionsText ? `<b>Варианты ответа:</b>\n${optionsText}\n\n` : ''}💡 <b>Краткий разбор для ответа:</b>
<tg-spoiler>${q.short_answer}</tg-spoiler>

🔥 <i>Тренируйте более 800+ вопросов в формате Tinder-карточек за 10 минут в день в @${botUsername}!</i>`;

    const result = await callTelegram('sendMessage', {
      chat_id: channelId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '⚡ Открыть вопрос в Prep-it Mini App',
              url: `https://t.me/${botUsername}`,
            },
          ],
          [
            {
              text: '👥 Пригласить друга (+7 дней PRO)',
              url: `https://t.me/${botUsername}?start=share`,
            },
            {
              text: '💻 Решать в браузере',
              url: webAppUrl,
            },
          ],
        ],
      },
    });
    console.log(`✅ Daily Card published! Message ID: ${result.message_id}`);
  }

  console.log('🎉 Routine finished successfully.');
}

runDailyRoutine().catch(console.error);
