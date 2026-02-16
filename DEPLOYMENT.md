# 🚀 Инструкция по развертыванию

## Шаг 1: Создание Telegram бота

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте команду `/newbot`
3. Следуйте инструкциям (имя, username)
4. Сохраните полученный токен (например: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

## Шаг 2: Настройка базы данных (Supabase)

### Вариант A: Supabase (Рекомендуется)

1. Зарегистрируйтесь на [supabase.com](https://supabase.com)
2. Создайте новый проект
3. Перейдите в Settings → Database
4. Скопируйте Connection String (будет вида `postgresql://postgres.[id]:[password]@...`)
5. Откройте SQL Editor и выполните следующий SQL:

```sql
-- Создание таблиц
CREATE TABLE users (
  telegram_id BIGINT PRIMARY KEY,
  username VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE progress_status AS ENUM ('known', 'unknown');

CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  question_text TEXT NOT NULL,
  short_answer TEXT NOT NULL,
  cached_explanation TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_progress (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  status progress_status NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, question_id)
);

-- Индексы
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_question_id ON user_progress(question_id);
CREATE INDEX idx_questions_category ON questions(category);
```

6. Затем заполните базу вопросами (можно использовать скрипт из `backend/src/scripts/seed-db.js` или вставить SQL напрямую)

### Вариант B: Локальная база данных

```bash
# Установите PostgreSQL
# macOS: brew install postgresql
# Ubuntu: sudo apt install postgresql

# Создайте базу
createdb java_interview_tinder

# Запустите скрипты
cd backend
npm run init-db
npm run seed-db
```

## Шаг 3: Получение OpenRouter API Key (Опционально)

Если хотите использовать AI-объяснения:

1. Зарегистрируйтесь на [openrouter.ai](https://openrouter.ai)
2. Перейдите в Settings → API Keys
3. Создайте новый ключ
4. Пополните баланс (минимум $5) или используйте бесплатные модели

## Шаг 4: Развертывание Backend

### Вариант A: Railway (Проще всего)

1. Установите Railway CLI:
```bash
npm i -g @railway/cli
```

2. Деплой:
```bash
cd backend
railway login
railway init
railway up
```

3. Добавьте переменные окружения в Railway Dashboard:
   - `DATABASE_URL` — ваш Supabase connection string
   - `BOT_TOKEN` — токен от BotFather
   - `OPENROUTER_API_KEY` — ключ OpenRouter (если есть)
   - `NODE_ENV=production`

4. Скопируйте URL вашего сервиса (например: `https://your-app.railway.app`)

### Вариант B: Vercel

1. Создайте `vercel.json` в папке backend:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/server.js"
    }
  ]
}
```

2. Деплой:
```bash
cd backend
vercel --prod
```

## Шаг 5: Развертывание Frontend

### Vercel (Рекомендуется)

1. Создайте `.env.production` в папке frontend:
```env
VITE_API_URL=https://your-backend-url.railway.app/api
```

2. Деплой:
```bash
cd frontend
npm run build
vercel --prod
```

### Netlify

```bash
cd frontend
npm run build
netlify deploy --prod --dir=dist
```

3. Скопируйте URL фронтенда (например: `https://your-app.vercel.app`)

## Шаг 6: Настройка Mini App в Telegram

1. Откройте [@BotFather](https://t.me/BotFather)
2. Выберите вашего бота: `/mybots` → выберите бота
3. Настройте Menu Button:
   - Bot Settings → Menu Button
   - Button text: `🚀 Открыть приложение`
   - Web App URL: `https://your-frontend-url.vercel.app`

4. Настройте описание:
   - Edit Bot → Edit Description
   - Добавьте описание вашего бота

5. Добавьте изображение:
   - Edit Bot → Edit Botpic
   - Загрузите картинку 512x512

## Шаг 7: Тестирование

1. Откройте бота в Telegram
2. Нажмите на кнопку Menu (☰) внизу
3. Выберите "🚀 Открыть приложение"
4. Приложение должно открыться внутри Telegram

## 🔧 Быстрая проверка

После деплоя проверьте:

1. Backend работает:
```bash
curl https://your-backend-url/health
# Должен вернуть: {"status":"ok","timestamp":"..."}
```

2. Frontend открывается:
   - Откройте `https://your-frontend-url` в браузере
   - Должна появиться страница с карточками

3. Telegram Bot отвечает:
   - Напишите боту `/start`
   - Нажмите кнопку Menu

## 🐛 Частые проблемы

### Backend не запускается

**Проблема:** `Error: connect ECONNREFUSED`
**Решение:** Проверьте DATABASE_URL, убедитесь что база доступна

**Проблема:** `Error: Invalid initData`
**Решение:** Для разработки установите `NODE_ENV=development`

### Frontend не подключается к Backend

**Проблема:** CORS ошибка
**Решение:** Добавьте ваш frontend URL в CORS настройки backend

**Проблема:** API не найден (404)
**Решение:** Проверьте VITE_API_URL в .env

### Telegram Bot не открывает приложение

**Проблема:** Кнопка не появляется
**Решение:** Убедитесь, что Menu Button настроен в BotFather

**Проблема:** Приложение не загружается
**Решение:** Используйте HTTPS для production (HTTP не работает)

## 📝 Чеклист деплоя

- [ ] База данных создана и заполнена
- [ ] Backend задеплоен и работает
- [ ] Frontend задеплоен и открывается
- [ ] Переменные окружения настроены
- [ ] Telegram Bot создан
- [ ] Menu Button настроен
- [ ] Приложение тестируется в Telegram

## 🎉 Готово!

Ваше приложение готово к использованию. Поделитесь ботом с друзьями!

## 💡 Дополнительно

### Мониторинг

- Railway: встроенные логи и метрики
- Vercel: Analytics в dashboard
- Supabase: Database logs и usage

### Обновления

```bash
# Backend
cd backend
git pull
railway up

# Frontend
cd frontend
git pull
vercel --prod
```

### Backup базы данных

Supabase делает автоматические бэкапы, но вы можете экспортировать данные:

```bash
pg_dump DATABASE_URL > backup.sql
```
