/**
 * Post an announcement about the Reddit launch to @prep_interview_daily
 */

import https from 'https';
import fs from 'fs';
import path from 'path';

let botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const channelId = process.env.TELEGRAM_CHANNEL_ID || '@prep_interview_daily';

if (!botToken) {
  try {
    const envPath = path.resolve('backend/.env');
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split('\n');
      for (let l of lines) {
        l = l.trim();
        const m = l.match(/^BOT_TOKEN=(.*)$/);
        if (m) botToken = m[1].trim();
      }
    }
  } catch (e) {}
}

const text = `🔥 <b>Международный запуск Prep-it на Reddit (r/learnprogramming)!</b>

Мы официально опубликовали анонс нашего тренажера в крупнейшем мировом сообществе программистов (более 4 000 000 участников):
👉 <a href="https://www.reddit.com/r/learnprogramming/comments/1xbift4/i_built_prepit_a_tinderstyle_swipe_app_for/">Читать обсуждение на Reddit</a>

В посте мы рассказали о:
• Свайп-механике (Tinder-style) для подготовки к IT-собеседованиям
• Системе интервальных повторений (SuperMemo-2)
• Разборах сложных вопросов на ИИ прямо внутри Telegram
• Опыте запуска Telegram Mini App с оплатой через Telegram Stars

💬 Поддержите пост апвоутом и комментарием — это поможет вывести его в топ сабреддита и привлечь больше соискателей в сообщество!`;

const payload = {
  chat_id: channelId,
  text: text,
  parse_mode: 'HTML',
  disable_web_page_preview: false,
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: '🌐 Открыть пост на Reddit',
          url: 'https://www.reddit.com/r/learnprogramming/comments/1xbift4/i_built_prepit_a_tinderstyle_swipe_app_for/',
        },
      ],
      [
        {
          text: '⚡ Запустить тренажер в Telegram',
          url: 'https://t.me/prep_interview_bot',
        },
      ],
    ],
  },
};

const data = JSON.stringify(payload);
const options = {
  hostname: 'api.telegram.org',
  port: 443,
  path: `/bot${botToken}/sendMessage`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (c) => (body += c));
  res.on('end', () => {
    try {
      const json = JSON.parse(body);
      if (json.ok) {
        console.log(`🎉 Announcement successfully posted to ${channelId}! Message ID: ${json.result.message_id}`);
      } else {
        console.error('Telegram error:', json.description);
      }
    } catch (e) {
      console.error('Parse error:', body);
    }
  });
});

req.on('error', (err) => console.error('Request error:', err.message));
req.write(data);
req.end();
