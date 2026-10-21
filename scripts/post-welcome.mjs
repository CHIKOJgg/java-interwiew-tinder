/**
 * Send official launch/welcome message to the Telegram channel
 */

import https from 'https';

const botToken = process.argv[2] || process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const channelId = process.argv[3] || process.env.TELEGRAM_CHANNEL_ID || '@prep_interview_daily';

if (!botToken) {
  console.error('Usage: node scripts/post-welcome.mjs <BOT_TOKEN> [@channel]');
  process.exit(1);
}

const welcomeText = `🚀 <b>Добро пожаловать в канал Prep-it Daily!</b>

Здесь каждый день публикуются актуальные материалы для подготовки к техническим собеседованиям в ведущие IT-компании:

• 🧠 <b>Каверзные вопросы дня</b> по Java, Python, Spring, Multithreading, SQL и System Design.
• 🎯 <b>Интерактивные квизы и опросы</b> — проверяйте свои знания за 1 минуту.
• 💡 <b>Разборы архитектурных паттернов</b> и типичных ошибок на собеседованиях.

🔥 <b>Тренируйтесь в нашем Mini App:</b>
Свайпайте вопросы в формате Tinder, получайте моментальные AI-разборы и готовьтесь к офферу за 10 минут в день!

📚 <b>Полезные материалы и разборы (Instant View):</b>
• <a href="https://telegra.ph/Kak-ya-ustal-zubrit-500-voprosov-k-IT-sobesedovaniyam-i-napisal-Tinder-dlya-intervyu-10-20-2">Как эффективно готовиться к интервью без зубрежки</a>
• <a href="https://telegra.ph/Gid-po-sobesedovaniyu-Voprosy-po-Spring-Boot-Hibernate-i-SQL-s-разборами-10-20">Гид по Spring Boot, Hibernate и SQL</a>
• <a href="https://telegra.ph/SHpargalka-po-Python-k-sobesedovaniyu-GIL-AsyncIO-pamyat-i-slozhnye-koncepcii-10-20">Шпаргалка по Python: GIL, AsyncIO, память</a>`;

const payload = {
  chat_id: channelId,
  text: welcomeText,
  parse_mode: 'HTML',
  disable_web_page_preview: false,
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: '⚡ Запустить тренажер Prep-it',
          url: 'https://t.me/prep_interview_bot',
        },
      ],
      [
        {
          text: '👥 Пригласить друга (+7 дней PRO)',
          url: 'https://t.me/prep_interview_bot?start=share',
        },
        {
          text: '💻 Веб-версия',
          url: 'https://solve-it-rho.vercel.app',
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
        console.log(`🎉 Welcome post successfully published to ${channelId}! Message ID: ${json.result.message_id}`);
      } else {
        console.error('❌ Telegram API error:', json.description);
      }
    } catch (e) {
      console.error('Parse error:', body);
    }
  });
});

req.on('error', (err) => {
  console.error('Request error:', err.message);
});

req.write(data);
req.end();
