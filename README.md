# 🚀 Prep-it (Java & Python Interview Tinder)

Интерактивный AI-тренажер для подготовки к IT-собеседованиям в формате свайпов (Tinder-style) с мгновенным объяснением ошибок, интервальным повторением и интеграцией с Telegram.

[![Telegram Bot](https://img.shields.io/badge/Telegram_Bot-@prep__interview__bot-2BA2DF?style=for-the-badge&logo=telegram)](https://t.me/prep_interview_bot)
[![Live Web App](https://img.shields.io/badge/Web_App-solve--it--rho.vercel.app-black?style=for-the-badge&logo=vercel)](https://solve-it-rho.vercel.app)
[![Backend Status](https://img.shields.io/badge/API-Railway_Live-0B0D0E?style=for-the-badge&logo=railway)](https://java-interwiew-tinder-production.up.railway.app/health)
[![Tests Passing](https://img.shields.io/badge/Tests-832%20passed%20(100%25)-success?style=for-the-badge)](https://github.com/CHIKOJgg/java-interwiew-tinder)
[![Telegram Stars](https://img.shields.io/badge/Monetization-Telegram_Stars%20%2B%20TON-gold?style=for-the-badge)](https://t.me/prep_interview_bot)

---

### 📚 Статьи и разборы проекта (Live)
- 📖 [Хабр: Как я устал зубрить 500 вопросов к IT-собеседованиям и написал «Tinder для интервью»](https://telegra.ph/Kak-ya-ustal-zubrit-500-voprosov-k-IT-sobesedovaniyam-i-napisal-Tinder-dlya-intervyu-10-20-2)
- 💼 [VC.ru: Как запустить микро-SaaS в Telegram Mini Apps без бюджета: тренажер IT-собеседований](https://telegra.ph/Kak-zapustit-mikro-SaaS-v-Telegram-Mini-Apps-bez-byudzheta-trenazher-IT-sobesedovanij-10-20-2)
- 💡 [Шпаргалка: Топ каверзных вопросов с собеседований по Java и Python с разборами](https://telegra.ph/SHpargalka-Top-kaverznyh-voprosov-s-sobesedovanij-po-Java-i-Python-s-разборами-10-20-2)
- ☕ [Гид по Spring Boot, Hibernate и SQL на собеседовании: разбор с примерами](https://telegra.ph/Gid-po-sobesedovaniyu-Voprosy-po-Spring-Boot-Hibernate-i-SQL-s-razborami-10-20)
- 🐍 [Шпаргалка по Python к собеседованию: GIL, AsyncIO, память и сложные концепции](https://telegra.ph/SHpargalka-po-Python-k-sobesedovaniyu-GIL-AsyncIO-pamyat-i-slozhnye-koncepcii-10-20)
- 🌐 [SEO Каталог: 665 вопросов с ответами онлайн](https://solve-it-rho.vercel.app/q/)
- 🤖 [LLMs.txt спецификация для AI-поисковиков](https://solve-it-rho.vercel.app/llms.txt)
- 📡 [RSS-лента для автопостинга в Telegram-каналы](https://solve-it-rho.vercel.app/rss.xml)

---

## 📋 Оглавление

- [Описание проекта](#описание-проекта)
- [Технологический стек](#технологический-стек)
- [Быстрый старт](#быстрый-старт)
- [Установка и настройка](#установка-и-настройка)
- [Деплой](#деплой)
- [API документация](#api-документация)
- [Структура проекта](#структура-проекта)

## 📖 Описание проекта

Java Interview Tinder — это Telegram Mini App для изучения вопросов по Java перед собеседованием. Приложение использует:

- **Swipe-механику** (как в Tinder) для интерактивного обучения
- **AI-объяснения** через OpenRouter API для сложных вопросов
- **Систему прогресса** с отслеживанием изученных вопросов
- **Красивый UI** с анимациями и адаптацией под Telegram тему

### Основные функции

- ✅ Свайп вправо — "Знаю" (помечает вопрос изученным)
- ❌ Свайп влево — "Не знаю" (получить AI-объяснение)
- 🔄 Клик по карточке — переворот для просмотра краткого ответа
- 📊 Отслеживание прогресса, серии (streak) и интервальные повторения (spaced repetition)
- 🤖 Кэширование AI-ответов (Postgres + Redis) для экономии токенов
- 🧠 Режимы обучения: **Swipe**, **Test**, **Bug Hunting**, **Blitz**, **Code Completion**, **Concept Linker**, **Mock Interview**
- 🌐 Языки: **Java**, **Python**, **TypeScript** (независимые базы вопросов)
- 💎 Платёжные провайдеры: **Telegram Stars**, **TON**, заглушка Stripe
- 📈 Аналитика, реферальная система, админ-панель и модерация вопросов (жалобы)

## 🛠 Технологический стек

### Frontend
- **React 18** с Vite
- **react-tinder-card** для swipe-механики
- **Zustand** для state management
- **react-markdown** для рендеринга AI-ответов
- **Lucide React** для иконок

### Backend
- **Node.js** + Express (ESM)
- **PostgreSQL** (через `pg`) + пул соединений
- **Redis** (`ioredis`) — кэш AI-ответов и дедуп/rate-limit
- **OpenRouter API** для AI-объяснений и генерации заданий
- **Background Worker** (`worker.js` + `node-cron`) — очередь `ai_jobs`, генерация AI, завершение подписок, напоминания
- Безопасность: валидация Telegram `initData` (HMAC, `timingSafeEqual`), JWT (`jsonwebtoken`), `helmet`, `cors`, `express-rate-limit`, Sentry
- Платежи: Telegram Stars, TON (заглушка Stripe)

### База данных
- PostgreSQL. Схема управляется **миграциями** (`backend/src/scripts/migrate.js` и др.), а не `database/schema.sql` —
  `schema.sql` — справочная копия. При деплое всегда запускайте `npm run setup-db`.
- Ключевые таблицы: `users`, `questions`, `user_progress`, `question_mastery`, `user_preferences`,
  `subscription_plans`, `user_subscriptions`, `user_rate_limits`, `ai_cache`, `ai_jobs`,
  `referrals`, `question_reports`, `analytics_events`, `pending_ton_invoices`.

## ⚡ Быстрый старт

### Требования
- Node.js 18+
- PostgreSQL 14+
- Telegram Bot Token (от [@BotFather](https://t.me/BotFather))
- OpenRouter API Key (опционально, для AI)

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd java-interview-tinder
```

### 2. Установка Backend

```bash
cd backend
npm install

# Создайте .env файл
cp .env.example .env
```

Отредактируйте `.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/java_interview_tinder
BOT_TOKEN=your_telegram_bot_token
OPENROUTER_API_KEY=your_openrouter_key  # Опционально
PORT=3000
NODE_ENV=development
```

### 3. Инициализация базы данных

```bash
# Создайте базу данных
createdb java_interview_tinder

# Инициализируйте таблицы
npm run init-db

# Заполните вопросами
npm run seed-db
```

### 4. Запуск Backend

```bash
npm run dev
```

Backend будет доступен на `http://localhost:3000`

### 5. Установка Frontend

```bash
cd ../frontend
npm install

# Создайте .env файл
cp .env.example .env
```

Отредактируйте `.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

### 6. Запуск Frontend

```bash
npm run dev
```

Frontend будет доступен на `http://localhost:5173`

## 🚀 Деплой

### Backend (Supabase + Vercel/Railway)

#### Вариант 1: Supabase (рекомендуется)

1. Создайте проект на [supabase.com](https://supabase.com)
2. Скопируйте Connection String из Settings → Database
3. Выполните SQL из `backend/src/scripts/init-db.js` в SQL Editor
4. Выполните SQL из `backend/src/scripts/seed-db.js`

#### Вариант 2: Railway

```bash
cd backend
railway login
railway init
railway add postgresql
railway up
```

### Frontend (Vercel/Netlify)

#### Vercel

```bash
cd frontend
npm run build
vercel --prod
```

#### Netlify

```bash
cd frontend
npm run build
netlify deploy --prod --dir=dist
```

### Настройка Telegram Bot

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите токен
3. Настройте Menu Button:

```
/setmenubutton
@your_bot_username
button text: 🚀 Открыть приложение
Web App URL: https://your-frontend-url.com
```

4. Настройте описание и изображение бота

## 📚 API Документация

### Authentication

#### `POST /api/auth/login`

Авторизация пользователя через Telegram initData.

**Body:**
```json
{
  "initData": "string"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "telegram_id": 123456789,
    "username": "user",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

### Questions

#### `GET /api/questions/feed?userId={id}&limit={n}`

Получить следующую порцию вопросов.

**Response:**
```json
{
  "questions": [
    {
      "id": 1,
      "category": "Java Core",
      "question": "В чем разница между == и equals()?",
      "shortAnswer": "== сравнивает ссылки..."
    }
  ]
}
```

#### `POST /api/questions/swipe`

Сохранить результат свайпа.

**Body:**
```json
{
  "userId": 123456789,
  "questionId": 1,
  "status": "known" | "unknown"
}
```

#### `POST /api/questions/explain`

Получить AI-объяснение вопроса.

**Body:**
```json
{
  "questionId": 1
}
```

**Response:**
```json
{
  "explanation": "## Markdown объяснение...",
  "cached": false
}
```

### Statistics

#### `GET /api/stats?userId={id}`

Получить статистику пользователя.

**Response:**
```json
{
  "known": 12,
  "unknown": 5,
  "totalSeen": 17,
  "totalQuestions": 50
}
```

## 📁 Структура проекта

```
java-interview-tinder/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express API (auth, feed, explain, billing, admin)
│   │   ├── worker.js              # Background worker: очередь ai_jobs + cron-задачи
│   │   ├── config/                # database, redis, logger, admin
│   │   ├── middleware/            # auth, rateLimiter, logging
│   │   ├── services/              # aiService, queueService, billingService,
│   │   │                         #   referralService, metricsService, languageRegistry
│   │   ├── services/billing/      # starsService (Telegram Stars), tonService (TON)
│   │   ├── scripts/               # init-db, seed-db, migrate*.js (миграции БД)
│   │   ├── utils/telegram.js      # Валидация Telegram initData (HMAC)
│   │   └── tests/                 # vitest: auth, billing, rateLimiter, telegram, aiService
│   ├── Dockerfile / fly.toml / fly.worker.toml   # Деплой на Fly.io
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx                # Точка входа, роутинг по режимам
    │   ├── api/client.js          # API-клиент
    │   ├── store/useStore.js      # Zustand store
    │   ├── components/            # Режимы: Swipe, Test, BugHunting, Blitz,
    │   │                         #   CodeCompletion, ConceptLinker, MockInterview,
    │   │                         #   SubscriptionPlans, AdminPanel, ResumeAnalyzer, …
    │   └── i18n (ru.json / en.json)
    ├── index.html / nginx.conf / Dockerfile
    └── package.json
```

> ⚠️ **Статус готовности к продакшену**
> - ✅ Валидация Telegram, JWT, helmet, CORS, rate-limit, Sentry, structured logging.
> - ✅ Асинхронная генерация AI через очередь worker (endpoint `/explain` не блокирует поток).
> - ✅ Graceful shutdown (SIGTERM/SIGINT) для API и worker.
> - ✅ Миграции БД идемпотентны; запуск через `npm run setup-db`.
> - ✅ Тесты бэкенда (vitest) и линтеры проходят в CI.
> - ⚠️ Перед деплоем обязательно задайте сильный `JWT_SECRET` и `TELEGRAM_WEBHOOK_SECRET`,
>   настройте бэкап БД и алерты (Sentry/Uptime).

## 🌐 Web App и PWA (доступ вне Telegram)

Приложение больше не привязано жёстко к Telegram Mini App. Тот же бэкенд и
фронтенд работают как обычный сайт и Progressive Web App (устанавливается на
домашний экран как нативное приложение).

### Авторизация (multi-provider)
Эндпоинт `POST /api/auth/login` принимает поле `provider`:
- `telegram` (по умолчанию) — валидация `initData` как раньше.
- `google` — Google ID token (`idToken`). Активируется `ENABLE_GOOGLE_AUTH=true` + `GOOGLE_CLIENT_ID`.
- `email` — magic-link: `POST /api/auth/email/send` → `POST /api/auth/email/verify`. Активируется `ENABLE_EMAIL_AUTH=true`.

Для web-пользователей создаётся синтетический `telegram_id` (`g_<hash>` / `e_<hash>`),
поэтому весь остальной код (прогресс, платежи, подписки) работает без изменений.
Колонки `auth_provider`, `external_id`, `email` добавлены миграцией `023_web_auth_providers`.

### Запуск Web-версии
```bash
cd frontend
npm install
echo "VITE_API_URL=https://your-backend/api" > .env
npm run build && npm run preview
```
- `manifest.webmanifest` + `sw.js` уже в `frontend/public/` — PWA ставится как приложение.
- CORS: добавьте web-домен в `ALLOWED_ORIGINS` на бэкенде.

### Переменные окружения (бэкенд)
```
ENABLE_GOOGLE_AUTH=true
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
ENABLE_EMAIL_AUTH=true
EMAIL_FROM=no-reply@your-domain.com
```

## 🔧 Конфигурация


### Environment Variables

#### Backend (.env)

```env
DATABASE_URL=postgresql://...        # PostgreSQL connection string
BOT_TOKEN=123456:ABC...             # Telegram Bot Token
OPENROUTER_API_KEY=sk-or-...       # OpenRouter API Key (optional)
OPENROUTER_MODEL=google/gemini...   # AI Model (optional)
OPENROUTER_MODEL_FAST=deepseek/...  # Cheap fast model for bulk generation (optional, falls back to OPENROUTER_MODEL)
PORT=3000                           # Server port
NODE_ENV=development|production     # Environment
```

#### Frontend (.env)

```env
VITE_API_URL=http://localhost:3000/api  # Backend API URL
VITE_GOOGLE_CLIENT_ID=                  # optional, enables Google One Tap on web
```

### Деплой фронта (Web/PWA + лендинг)
Лендинг и Mini App собираются вместе (`frontend/dist`). Хостить можно на
Vercel/Netlify как статику; `/api` проксируется на бэкенд (см. `vercel.json`,
`public/_redirects`).

```bash
cd frontend
cp .env.example .env          # укажите VITE_API_URL
..\deploy-frontend.ps1 -Target vercel    # или -Target netlify / -Target build
```
- `manifest.webmanifest` + `sw.js` уже в `public/` → PWA ставится на домашний экран.
- OG/Twitter-теги в `index.html` дают превью ссылок в соцсетях.

### Реферальная программа (виральность)
Пользователь получает **7 дней PRO** за каждого друга, который подписался.
Реферальная ссылка формируется двумя способами:
- **Telegram:** `https://t.me/prep_interview_bot?start=<telegram_id>`
- **Web/PWA:** `https://solve-it-rho.vercel.app/?ref=<telegram_id>` (читается из URL при входе)

После каждой сессии `ShareCard` предлагает поделиться (Telegram / X / Copy link)
с этой ссылкой. Статистика — `api.getReferralStats()`.

## 🎨 Кастомизация

### Добавление новых вопросов

Отредактируйте `backend/src/scripts/seed-db.js` и добавьте вопросы в массив:

```javascript
const questions = [
  {
    category: 'Java Core',
    question: 'Ваш вопрос?',
    short_answer: 'Краткий ответ'
  },
  // ...
];
```

Затем выполните:

```bash
npm run seed-db
```

### Изменение категорий

Цвета категорий настраиваются в `frontend/src/components/QuestionCard.jsx`:

```javascript
const categoryColors = {
  'Java Core': '#ff6b6b',
  'Collections': '#4ecdc4',
  'Ваша категория': '#цвет',
  // ...
};
```

### Настройка AI промпта

Отредактируйте `SYSTEM_PROMPT` в `backend/src/services/aiService.js`

## 🐛 Troubleshooting

### Backend не запускается

1. Проверьте, что PostgreSQL запущен
2. Проверьте `DATABASE_URL` в `.env`
3. Убедитесь, что база данных создана

### Frontend не подключается к Backend

1. Проверьте `VITE_API_URL` в `.env`
2. Убедитесь, что Backend запущен
3. Проверьте CORS настройки в `server.js`

### Telegram Bot не работает

1. Проверьте `BOT_TOKEN` в `.env`
2. Убедитесь, что Menu Button настроен
3. Используйте HTTPS для production

### AI не генерирует ответы

1. Проверьте `OPENROUTER_API_KEY`
2. Убедитесь, что модель доступна
3. В development используется mock-ответ

## 📝 Лицензия

MIT License - используйте свободно для личных и коммерческих проектов.

## 🤝 Contributing

Pull requests приветствуются! Для больших изменений откройте issue для обсуждения.

## 📧 Контакты

Если у вас есть вопросы или предложения, создайте issue в репозитории.

---

**Создано с ❤️ для Java-разработчиков**
