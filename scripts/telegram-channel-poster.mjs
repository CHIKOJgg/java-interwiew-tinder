/**
 * Automated Telegram Channel Broadcaster for Prep-it
 * 
 * Automatically posts interactive quizzes or rich interview question cards
 * with spoiler explanations and Mini App inline buttons to any Telegram channel or chat.
 * 
 * Usage:
 *   node scripts/telegram-channel-poster.mjs --dry-run
 *   node scripts/telegram-channel-poster.mjs --channel=@my_channel --mode=card --lang=Java
 *   node scripts/telegram-channel-poster.mjs --channel=@my_channel --mode=quiz --lang=Python
 */

import https from 'https';
import fs from 'fs';
import path from 'path';

// Automatically load BOT_TOKEN from backend/.env if not present in environment
try {
  const envPath = path.resolve('backend/.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (let l of lines) {
      l = l.trim();
      const match = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim();
      }
    }
  }
} catch (e) {}

// Command line arguments parsing
const args = process.argv.slice(2);
function getArg(name, fallback = null) {
  const prefix = `--${name}=`;
  const match = args.find((a) => a.startsWith(prefix));
  if (match) return match.slice(prefix.length);
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('--')) {
    return args[idx + 1];
  }
  return fallback;
}
const isDryRun = args.includes('--dry-run');
const mode = getArg('mode', 'card'); // 'card' | 'quiz'
const targetLang = getArg('lang', 'random'); // 'Java' | 'Python' | 'random'
const channelId = getArg('channel', process.env.TELEGRAM_CHANNEL_ID || '@prep_interview_daily');
const botToken = getArg('token', process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN);
const botUsername = process.env.VITE_TELEGRAM_BOT_USERNAME || 'prep_interview_bot';
const webAppUrl = process.env.VITE_WEBAPP_URL || 'https://solve-it-rho.vercel.app';

// Load questions from seed files
async function getRandomQuestion(requestedLang = 'random') {
  let pool = [];

  try {
    const { newQuestions } = await import('../backend/src/scripts/seed-db-java-2.js');
    if (requestedLang === 'random' || requestedLang.toLowerCase() === 'java') {
      pool.push(...newQuestions.map((q) => ({ ...q, language: 'Java' })));
    }
  } catch (err) {
    console.warn('Could not load Java questions:', err.message);
  }

  try {
    const { pythonQuestions } = await import('../backend/src/scripts/seed-db-python.js');
    if (requestedLang === 'random' || requestedLang.toLowerCase() === 'python') {
      pool.push(...pythonQuestions.map((q) => ({ ...q, language: 'Python' })));
    }
  } catch (err) {
    console.warn('Could not load Python questions:', err.message);
  }

  if (pool.length === 0) {
    throw new Error('No questions found in seed datasets.');
  }

  const selected = pool[Math.floor(Math.random() * pool.length)];
  return selected;
}

// Telegram Bot API request helper
function callTelegram(method, payload) {
  return new Promise((resolve, reject) => {
    if (!botToken) {
      return reject(new Error('TELEGRAM_BOT_TOKEN is required to send messages to Telegram.'));
    }

    const data = JSON.stringify(payload);
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${botToken}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.ok) resolve(json.result);
          else reject(new Error(`Telegram API error: ${json.description || body}`));
        } catch {
          reject(new Error(`Failed to parse Telegram response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Format message as rich card with HTML spoilers & Mini App button
function buildCardPayload(q) {
  const langEmoji = q.language === 'Java' ? '☕' : '🐍';
  const category = q.category || 'Core';
  const difficulty = q.difficulty || 'Middle';

  let optionsText = '';
  if (Array.isArray(q.options) && q.options.length > 0) {
    optionsText = q.options
      .map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`)
      .join('\n');
  }

  const text = `${langEmoji} <b>Вопрос с IT-собеседования [${q.language}]</b>
🏷 <i>Тема: ${category} | Сложность: ${difficulty}</i>

❓ <b>${q.question}</b>

${optionsText ? `<b>Варианты ответа:</b>\n${optionsText}\n\n` : ''}💡 <b>Краткий разбор для ответа:</b>
<tg-spoiler>${q.short_answer}</tg-spoiler>

🔥 <i>Тренируйте более 800+ вопросов в формате карточек за 10 минут в день в приложении Prep-it!</i>`;

  const inlineKeyboard = [
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
  ];

  return {
    chat_id: channelId,
    text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: inlineKeyboard,
    },
  };
}

// Format message as native Telegram Quiz Poll
function buildQuizPayload(q) {
  if (!Array.isArray(q.options) || q.options.length < 2) {
    // Fall back to card if options are missing
    return buildCardPayload(q);
  }

  const question = `${q.language === 'Java' ? '☕' : '🐍'} [${q.category || q.language}] ${q.question}`;
  // Telegram poll question limit is 300 chars, options 100 chars
  const truncatedQuestion = question.length > 290 ? `${question.slice(0, 287)}…` : question;
  const options = q.options.slice(0, 10).map((opt) => (opt.length > 95 ? `${opt.slice(0, 92)}…` : opt));

  let explanation = q.short_answer || 'Правильный ответ!';
  if (explanation.length > 195) {
    explanation = `${explanation.slice(0, 192)}…`;
  }

  return {
    chat_id: channelId,
    question: truncatedQuestion,
    options,
    type: 'quiz',
    correct_option_id: 0, // In seed data, first option is usually the intended correct one
    explanation,
    is_anonymous: true,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🔥 Решать 800+ вопросов в Mini App',
            url: `https://t.me/${botUsername}`,
          },
        ],
      ],
    },
  };
}

async function main() {
  console.log(`📡 Telegram Channel Poster starting... (Mode: ${mode}, Language: ${targetLang})`);
  const q = await getRandomQuestion(targetLang);

  console.log(`✅ Selected Question: "${q.question}" (${q.language} / ${q.category})`);

  let payload;
  let method = 'sendMessage';

  if (mode === 'quiz' && Array.isArray(q.options) && q.options.length >= 2) {
    payload = buildQuizPayload(q);
    method = 'sendPoll';
  } else {
    payload = buildCardPayload(q);
    method = 'sendMessage';
  }

  if (isDryRun || !botToken) {
    console.log('\n--- [DRY RUN / PREVIEW] ---');
    console.log(`Method: ${method}`);
    console.log(`Target: ${channelId}`);
    console.log('Payload:\n', JSON.stringify(payload, null, 2));
    if (!botToken) {
      console.log('\nℹ️ To post to live channel, set TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID.');
    }
    return;
  }

  console.log(`📤 Sending ${method} to ${channelId}...`);
  const result = await callTelegram(method, payload);
  console.log(`🎉 Successfully published message ID: ${result.message_id || result.poll?.id}`);
}

main().catch((err) => {
  console.error('❌ Failed to broadcast to Telegram channel:', err.message);
  process.exit(1);
});
