# 🚀 Java Interview Tinder

Интерактивный тренажер для подготовки к собеседованиям по Java с геймификацией в стиле Tinder.

![Java Interview Tinder](https://img.shields.io/badge/platform-Telegram-blue)
![Tech Stack](https://img.shields.io/badge/stack-React%20%7C%20Node.js%20%7C%20PostgreSQL-green)

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
- 📊 Отслеживание прогресса обучения
- 🤖 Кэширование AI-ответов для экономии токенов

## 🛠 Технологический стек

### Frontend
- **React 18** с Vite
- **react-tinder-card** для swipe-механики
- **Zustand** для state management
- **react-markdown** для рендеринга AI-ответов
- **Lucide React** для иконок

### Backend
- **Node.js** + Express
- **PostgreSQL** для хранения данных
- **OpenRouter API** для AI-объяснений
- Валидация через Telegram initData

### База данных
- PostgreSQL с 3 таблицами:
  - `users` — пользователи
  - `questions` — вопросы с кэшем AI-ответов
  - `user_progress` — прогресс пользователя

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
│   │   ├── config/
│   │   │   └── database.js          # Настройка PostgreSQL
│   │   ├── scripts/
│   │   │   ├── init-db.js           # Создание таблиц
│   │   │   └── seed-db.js           # Заполнение вопросами
│   │   ├── services/
│   │   │   └── aiService.js         # OpenRouter интеграция
│   │   ├── utils/
│   │   │   └── telegram.js          # Валидация Telegram data
│   │   └── server.js                # Express сервер + API
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── client.js            # API клиент
    │   ├── components/
    │   │   ├── Header.jsx           # Шапка с прогрессом
    │   │   ├── QuestionCard.jsx     # Карточка вопроса
    │   │   ├── SwipeButtons.jsx     # Кнопки управления
    │   │   └── ExplanationModal.jsx # Модальное окно
    │   ├── store/
    │   │   └── useStore.js          # Zustand store
    │   ├── App.jsx                  # Главный компонент
    │   ├── main.jsx                 # Точка входа
    │   └── index.css                # Глобальные стили
    ├── index.html
    ├── package.json
    └── .env.example
```

## 🔧 Конфигурация

### Environment Variables

#### Backend (.env)

```env
DATABASE_URL=postgresql://...        # PostgreSQL connection string
BOT_TOKEN=123456:ABC...             # Telegram Bot Token
OPENROUTER_API_KEY=sk-or-...       # OpenRouter API Key (optional)
OPENROUTER_MODEL=google/gemini...   # AI Model (optional)
PORT=3000                           # Server port
NODE_ENV=development|production     # Environment
```

#### Frontend (.env)

```env
VITE_API_URL=http://localhost:3000/api  # Backend API URL
```

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
