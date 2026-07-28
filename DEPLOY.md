# 🚀 Гайд по деплою — Interview Tinder на Railway + Supabase

> **Читать целиком перед началом.** Весь процесс занимает ~30–45 минут.

---

## 📦 Ага 1: Supabase — база данных

### 1.1 Создай проект

1. Зайди на [supabase.com](https://supabase.com) → **New project**
2. **Name:** `java-interview-tinder` (или своё)
3. **Database password** — сгенерируй и **сохрани в менеджер паролей** (он больше нигде не покажется)
4. **Region** — выбери ближайший к твоим пользователям (например, `EU West` (Frankfurt), `EU East` (Warsaw))
5. **Pricing** — **Free Plan** (500 MB, 2 concurrent connections — хватит на старт)

### 1.2 Забери Connection String

1. В дашборде проекта → **Project Settings** → **Database**
2. Скопируй **URI** из секции `Connection string` (поле `URI`)
3. Выглядит так:
   ```
   postgresql://postgres:YOUR_PASSWORD@db.xxxxxxxxxxxxx.supabase.co:6543/postgres
   ```
4. **Замени `YOUR_PASSWORD`** на тот, что сохранил в п. 1.1
5. **Сохрани эту строку** — она понадобится в Railway

### 1.3 Включи pgcrypto (опционально, но не повредит)

В Supabase **SQL Editor** → New query → выполни:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

---

## 🚂 Ага 2: Railway — бэкенд

### 2.1 Создай проект

1. Зайди на [railway.app](https://railway.app) → **New Project**
2. **Deploy from GitHub repo** → выбери `CHIKOJgg/java-interwiew-tinder`
3. **Root Directory:** `backend` (важно! Railway должен смотреть в папку `backend/`)
4. Railway сам найдёт `railway.toml` и `Dockerfile` и начнёт билдить

### 2.2 Настрой переменные окружения

После деплоя (он упадёт — это норм!) зайди в **Variables** своего сервиса и добавь:

| Variable | Значение | Откуда брать |
|----------|----------|-------------|
| `NODE_ENV` | `production` | Статично |
| `PORT` | `10000` | Railway даёт 10000 по умолчанию |
| `DATABASE_URL` | `postgresql://postgres:...` | Из Supabase (ага 1.2) |
| `BOT_TOKEN` | `123456:ABC-DEF...` | От [@BotFather](https://t.me/botfather) |
| `JWT_SECRET` | `случайная строка >= 16 символов` | `openssl rand -hex 32` |
| `TELEGRAM_WEBHOOK_SECRET` | `случайная строка` | `openssl rand -hex 32` |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` | От [openrouter.ai](https://openrouter.ai/keys) |
| `OPENROUTER_MODEL` | `google/gemini-2.0-flash-exp:free` | Твоя любимая модель |
| `ALLOWED_ORIGINS` | `https://java-interview-tinder.vercel.app` | Твой фронтенд (веселый ага 4) |
| `REDIS_URL` | *(см. ага 2.3)* | Из Railway Redis |
| `ADMIN_TELEGRAM_IDS` | `123456789,987654321` | Твои Telegram ID (через запятую) |
| `FRONTEND_URL` | `https://java-interview-tinder.vercel.app` | Твой фронтенд |
| `SENTRY_DSN` | *(опционально)* | От [sentry.io](https://sentry.io) |
| `LOGTAIL_TOKEN` | *(опционально)* | От [betterstack.com](https://betterstack.com) |
| `ALLOW_RB_PII` | *(оставь пустым)* | GDPR/Закон РБ — не трогай |
| `UKASSA_TOKEN` | *(оставь пустым)* | ЮKassa — опционально |

### 2.3 Добавь Redis

1. В твоём Railway проекте → **New** → **Add Plugin** → **Redis**
2. Дождись, пока появится зелёный `⏺ Running`
3. Зайди в **Variables** этого Redis-плагина → скопируй `REDIS_URL`
4. **Вставь** в переменные сервиса как `REDIS_URL`

### 2.4 Инициализируй БД

После того, как сервис запустился и переменные стоят:

1. Открой **Railway Dashboard** → твой сервис → **Shell**
2. Выполни:

```bash
npm run init-db
npm run migrate
npm run migrate-stars
npm run migrate-ton
npm run migrate-ukassa
```

Или одной командой:

```bash
npm run setup-db
```

Это создаст все таблицы, индексы и планы подписок. Если `seed` не нужен (только структура) — пропусти последний шаг.

> **⚠️ Если после деплоя 502 / 503:** подожди 30 секунд. Railway запускает два процесса (API + worker) последовательно, healthcheck может не пройти с первого раза. После рестарта всё стабильно.

### 2.5 Настрой healthcheck (уже в Dockerfile)

Ручных действий не требуется. Dockerfile проверяет `/health` каждые 15 секунд.

---

## 🤖 Ага 3: Telegram Bot Webhook

После деплоя нужно сказать Telegram, куда слать запросы.

1. Открой браузер и перейди по ссылке (замени `<TOKEN>` и `<YOUR_RAILWAY_URL>`):

```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<YOUR_RAILWAY_URL>/webhook/telegram
```

Пример:
```
https://api.telegram.org/bot123456:ABC-DEF123/setWebhook?url=https://java-interview-tinder.up.railway.app/webhook/telegram
```

2. Должен прийти JSON: `{"ok": true, "result": true, "description": "Webhook was set"}`

3. Проверить можно так:
```
https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

---

## 🎨 Ага 4: Фронтенд на Vercel

Репозиторий уже настроен на авто-деплой на Vercel из GitHub Actions (см. `.github/workflows/deploy.yml`).

1. Зайди на [vercel.com](https://vercel.com) → **Add New Project**
2. Импортируй `CHIKOJgg/java-interwiew-tinder`
3. **Root Directory:** `frontend` (если фронт в отдельной папке)
4. **Framework Preset:** `Vite`
5. **Environment Variables:**
   - `VITE_API_URL` → `https://java-interview-tinder.up.railway.app`
6. **Deploy**

---

## 🔬 Ага 5: Проверка

### 5.1 Health endpoint

Перейди по адресу:
```
https://java-interview-tinder.up.railway.app/health
```

Ожидаемый ответ:
```json
{"status":"ok","timestamp":"2026-07-28T...","uptime":42}
```

### 5.2 Webhook Telegram

Напиши боту любое сообщение. Если он ответил — всё работает.

### 5.3 Логи

В Railway Dashboard → сервис → **Logs**. Ты увидишь:

```
[supervisor] launching worker...
[supervisor] launching api...
[worker] Worker started and waiting for jobs...
[api] Server running on port 10000
```

### 5.4 Тесты (локально)

```bash
cd backend
npm test    # 433 теста, все зелёные
npm run lint  # 0 errors
```

---

## 💰 Ага 6: Цены

| Сервис | План | Цена |
|--------|------|------|
| **Railway** | Hobby | $5/мес (512 MB RAM, always-on) |
| **Supabase** | Free | $0 (500 MB, 2 conn) |
| **Redis (Railway)** | входит в Hobby | $0 (25 MB) |
| **Vercel** | Hobby | $0 |
| **OpenRouter** | Pay-as-you-go | ~$0.50–2/мес на Gemini Flash Free |
| **Telegram Stars** | комиссия Telegram | 30% от продаж |

**Итого:** ~$5–8/мес на старт.

---

## ⚡ Ага 7: Полезные команды Railway

**Railway CLI** (опционально):
```bash
# установка
npm i -g @railway/cli

# логи в реальном времени
railway logs

# запустить shell в контейнере
railway shell

# переменные
railway variables

# открыть дашборд
railway open
```

**Без CLI — всё в дашборде:** https://railway.app/dashboard

---

## 🧯 Ага 8: Если что-то пошло не так

### 502 Bad Gateway
- Жди 30–60 сек, worker + api запускаются последовательно
- Проверь `PORT=10000` в переменных (Railway по умолчанию 10000, не 3000!)
- Проверь `Dockerfile` — healthcheck может валить контейнер, если порт не совпадает

### Webhook не отвечает
- Проверь `BOT_TOKEN` — не перепутан ли?
- `setWebhook` возвращает ошибку? Проверь URL без `http://` (только `https://`)
- Логи Railway: есть ли `POST /webhook/telegram`?

### База не подключается
- `DATABASE_URL` — точная строка из Supabase, пароль без спецсимволов?
- В Supabase → **Settings** → **Database** → убедись, что IP не заблокирован
- Для Railway IP-блокировки нет (подключение по паролю)

### 429 Too Many Requests (Telegram)
- Telegram лимитирует запросы. Если бот популярный — это норма.
- Решение: подожди 1–2 минуты, Telegram сам восстановит.

---

**Всё! 🚀** Если на каком-то шаге застрял — пиши, помогу разобраться.
