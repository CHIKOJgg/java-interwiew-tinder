import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const readmePath = path.resolve(ROOT_DIR, 'README.md');
let content = fs.readFileSync(readmePath, 'utf8');

const oldHeaderRegex = /^# 🚀 Java Interview Tinder[\s\S]*?(?=## 📋 Оглавление)/m;
const newHeader = `# 🚀 Prep-it (Java & Python Interview Tinder)

Интерактивный AI-тренажер для подготовки к IT-собеседованиям в формате свайпов (Tinder-style) с мгновенным объяснением ошибок, интервальным повторением и интеграцией с Telegram.

[![Telegram Bot](https://img.shields.io/badge/Telegram_Bot-@prep__interview__bot-2BA2DF?style=for-the-badge&logo=telegram)](https://t.me/prep_interview_bot)
[![Live Web App](https://img.shields.io/badge/Web_App-solve--it--rho.vercel.app-black?style=for-the-badge&logo=vercel)](https://solve-it-rho.vercel.app)
[![Backend Status](https://img.shields.io/badge/API-Railway_Live-0B0D0E?style=for-the-badge&logo=railway)](https://java-interwiew-tinder-production.up.railway.app/health)
[![Tests Passing](https://img.shields.io/badge/Tests-832%20passed%20(100%25)-success?style=for-the-badge)](https://github.com/CHIKOJgg/java-interwiew-tinder)
[![Telegram Stars](https://img.shields.io/badge/Monetization-Telegram_Stars%20%2B%20TON-gold?style=for-the-badge)](https://t.me/prep_interview_bot)

---

### 📚 Статьи и разборы проекта (Live)
- 📖 [Хабр / Telegra.ph: Как я устал зубрить 500 вопросов к IT-собеседованиям и написал «Tinder для интервью»](https://telegra.ph/Kak-ya-ustal-zubrit-500-voprosov-k-IT-sobesedovaniyam-i-napisal-Tinder-dlya-intervyu-10-20)
- 💼 [VC.ru / Telegra.ph: Как запустить микро-SaaS в Telegram Mini Apps без бюджета: тренажер IT-собеседований](https://telegra.ph/Kak-zapustit-mikro-SaaS-v-Telegram-Mini-Apps-bez-byudzheta-trenazher-IT-sobesedovanij-10-20)
- 💡 [Шпаргалка: Топ каверзных вопросов с собеседований по Java и Python с разборами](https://telegra.ph/SHpargalka-Top-kaverznyh-voprosov-s-sobesedovanij-po-Java-i-Python-s-razborami-10-20)
- 🌐 [SEO Каталог: 665 вопросов с ответами онлайн](https://solve-it-rho.vercel.app/q/)

---

`;

content = content.replace(oldHeaderRegex, newHeader);
content = content.replace(/https:\/\/t\.me\/JavaInterviewTinderBot\?start=/g, 'https://t.me/prep_interview_bot?start=');
content = content.replace(/https:\/\/your-domain\.com\/\?ref=/g, 'https://solve-it-rho.vercel.app/?ref=');

fs.writeFileSync(readmePath, content, 'utf8');
console.log('✅ README.md updated successfully!');
