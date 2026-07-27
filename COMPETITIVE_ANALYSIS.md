# Конкурентный анализ и Roadmap — Java Interview Tinder

> **Дата**: 2026-07-27
> **Статус**: Phase 1 IMPLEMENTED
> **Цель**: Сделать продукт конкурентоспособным на рынке EdTech для подготовки к техническим собеседованиям

---

## 1. Обзор конкурентного ландшафта

### 1.1 Прямые конкуренты (preparation platforms)

| Продукт | Аудитория | Сильные стороны | Слабые стороны |
|---------|-----------|-----------------|----------------|
| **LeetCode** | 5M+ месячных — глобальная | 2000+ задач, контесты, компилятор, премиум-резюме, HR-интеграции | Платная подписка ($35/мес), нет геймификации, сухой UI |
| **HackerRank** | 7M+ разработчиков | Enterprise-инструменты, скрининг, сертификация | Не для обучения, а для тестирования |
| **GeeksforGeeks** | 10M+ ежемесячно | Огромная база статей + код, бесплатно | Устаревший UI, нет персонализации |
| **InterviewBit** | 1M+ | Треки по компаниям, прогресс-бар, mock interviews | Только для опытных (много задач сразу) |
| **CodeSignal** | 500K+ | Аркадный UI, gamification, "мгновенный" фидбек | Закрытая платформа, не для обучения |
| **Educative.io** | 300K+ | Grokking курсы, интерактив | Платно ($20/мес), нет вопросов |
| **Pramp** | 100K+ | Peer-to-peer mock интервью | Только английский, нет теории |
| **Codewars** | 3M+ | Kumite-задачи, рейтинг | Сложный порог входа |

### 1.2 Косвенные конкуренты (формат обучения)

| Продукт | Формат | Чем опасен |
|---------|--------|------------|
| **ChatGPT / Claude** | AI-диалог | Пользователь может просто попросить AI объяснить вопрос |
| **Telegram-каналы** (Java/Interview) | Карточки + текст | Низкий порог входа, большое комьюнити |
| **YouTube-каналы** (Javarush, etc.) | Видео-уроки | Глубокое погружение, бесплатно |
| **Stepik / Coursera** | Курсы | Сертификация, структурированность |

---

## 2. SWOT-анализ Java Interview Tinder

### Сильные стороны (Strengths)
- Уникальная Tinder-механика (swipe) — эмоциональная вовлечённость
- 7 режимов обучения (Swipe, Test, Bug Hunting, Blitz, Code Completion, Concept Linker, Mock Interview, System Design)
- Telegram Mini App + PWA — доступность
- AI-объяснения с кэшированием — мгновенный фидбек
- Spaced Repetition (SM-2)
- Три языка: Java, Python, TypeScript
- Полноценная система платежей (Stars, TON, YooKassa)
- Поддержка русского и английского языков
- Реферальная система

### Слабые стороны (Weaknesses)
- **Малая база вопросов** (~150-200) vs LeetCode (2000+)
- **Нет онлайн-компилятора** — нельзя реально писать код
- **Нет контестов / турниров** — теряется соревновательный момент
- **Нет лидерборда** — нет мотивации соревноваться
- **Нет company-tagged вопросов** — нельзя готовиться к конкретному работодателю
- **Нет системы достижений (badges)** — слабая геймификация
- **Нет интеграции с GitHub** — нельзя похвастаться прогрессом
- **Много багов P0/P1** — продукт не готов к продакшену
- **Монотонный UI** — нет кастомизации (dark/light theme)
- **Слабая i18n** — русский хардкодом, не все компоненты переведены

### Возможности (Opportunities)
- Рост рынка EdTech (CAGR 15-20%)
- Ниша "подготовка к интервью" — стремительно растёт
- Telegram как канал дистрибуции — слабо освоен конкурентами
- AI-фидбек — конкурентное преимущество перед LeetCode
- Возможность B2B (HR-скрининг для компаний)

### Угрозы (Threats)
- ChatGPT/LLM могут заменить платформы для обучения
- LeetCode запускает Telegram-версию
- HackerRank заходит в EdTech
- Пиратские базы вопросов

---

## 3. Gap-анализ: что есть у конкурентов, но нет у вас

### 3.1 Core Features (влияют на сам продукт)

| Feature | Есть у | Priority | Сложность |
|---------|--------|----------|-----------|
| Online compiler | LeetCode, HackerRank, CodeSignal | **P0** | Высокая |
| Live contests / турниры | LeetCode (Weekly Contest) | **P1** | Средняя |
| Company-specific questions | InterviewBit, LeetCode Premium | **P1** | Средняя |
| Peer-to-peer mock interviews | Pramp | **P2** | Средняя |
| Achievement system / badges | CodeSignal, HackerRank | **P1** | Низкая |
| Leaderboard | LeetCode, Codewars | **P2** | Низкая |
| Dark/Light theme | Все | **P2** | Низкая |
| Interactive tutorials (Grokking-style) | Educative.io | **P2** | Высокая |
| User-generated content (UGC) quetsions | — | **P3** | Средняя |

### 3.2 Social / Retention Features

| Feature | Есть у | Priority | Сложность |
|---------|--------|----------|-----------|
| Daily challenges with rewards | LeetCode, CodeSignal | **P1** | Низкая |
| Streak rewards / multiplier | Duolingo | **P1** | Низкая |
| GitHub integration (show progress) | Codewars | **P2** | Низкая |
| Email digest (question of the day) | GeeksforGeeks | **P2** | Низкая |
| Progress export (PDF/CSV resume stats) | LinkedIn Learning | **P2** | Низкая |
| Comments / discussions on questions | LeetCode | **P2** | Средняя |
| Study groups / teams | — | **P3** | Высокая |

### 3.3 Monetization Features

| Feature | Есть у | Priority | Сложность |
|---------|--------|----------|-----------|
| Yearly subscription discount | Все | **P1** | Низкая |
| Team / enterprise plans | HackerRank | **P2** | Средняя |
| Interview-as-a-Service (HR-скрининг) | HackerRank | **P3** | Высокая |
| Certificate on completion | Coursera, Stepik | **P2** | Средняя |

---

## 4. Roadmap: 3 фазы

### Фаза 0: Reliability Sprint (2-3 недели)
**Цель**: Исправить все P0/P1 баги, сделать продукт стабильным

| # | Задача | Статус |
|---|--------|--------|
| 0.1 | Переротировать все скомпрометированные секреты (Supabase DB, Bot Token, OpenRouter, JWT) | **TODO** |
| 0.2 | Исправить валидацию Telegram initData (BUG-02) | **TODO** |
| 0.3 | Добавить `const` в server.js (BUG-03) | **TODO** |
| 0.4 | Исправить транзакции в admin grant-plan (BUG-04) | **TODO** |
| 0.5 | Исправить rate limiter — читать userId из req.userId (BUG-05) | **TODO** |
| 0.6 | Исправить передачу referralId в client.js (BUG-06) | **TODO** |
| 0.7 | Исправить BlitzMode — добавить advanceQuestion (BUG-07) | **TODO** |
| 0.8 | Исправить CodeCompletionMode — добавить advanceQuestion в destructure (BUG-08) | **TODO** |
| 0.9 | Увеличить AI_TIMEOUT_MS с 3000 до 30000 (BUG-12) | **TODO** |
| 0.10 | Заменить все `.catch(() => {})` на логирование (BUG-11) | **TODO** |
| 0.11 | Исправить `writeCache` — валидация parsed (BUG-22) | **TODO** |
| 0.12 | Исправить множественные утечки ошибок в production (BUG-17) | **TODO** |

### Фаза 1: V1.1 — Battle-ready (3-4 недели)
**Цель**: Достичь паритета с конкурентами по базовым фичам

#### Feature Group A: Core improvements

**1. Онлайн-компилятор (P1)**
- Интеграция с Piston API (code execution service)
- Улучшить существующий `executionService` — добавить поддержку большего числа языков
- Сделать встроенный редактор кода в компоненте `PlaygroundMode`
- Режим: пользователь может писать код и проверять его выполнение прямо в приложении

**2. Company-Tagged база вопросов (P1)**
- Добавить поле `company` в таблицу `questions`
- Создать seed-данные: Яндекс, Сбер, Тинькофф, Amazon, Google, Meta, etc.
- Фильтр на фронте "Я готовлюсь в компанию X"
- Показать: "N вопросов от Amazon" / "30% users from Yandex"

**3. Badge / Achievement System (P1)**
- Создать таблицу `user_badges`
- Бейджи:
  - "First 10 questions" 🏅
  - "7-day streak" 🔥
  - "50 questions in one day" ⚡
  - "100% accuracy in Test mode" 🎯
  - "Bug Hunter" (10 bugs found) 🐛
  - "Code Master" (50 code completions) 💻
- UI: страница достижений + уведомление при получении
- Бейдж в профиле пользователя

**4. Daily Challenges (P1)**
- Каждый день — 3 специально отобранных вопроса
- Дополнительный прогресс-бар за день
- "Challenge of the Day" — вопрос дня с AI-разбором
- Таблица `daily_challenges` с ежедневным ресетом

#### Feature Group B: Social & Motivation

**5. Leaderboard (P2)**
- Глобальный: по total known + streak + points
- По языку: отдельно Java, Python, TypeScript
- По компаниям: кто лучше готов к Amazon (фильтр)
- Топ-10 пользователей (только для PRO?)
- Еженедельный сброс для "гигиены" доски
- Анонимность (nickname или "User #1337")

**6. Streak Multiplier & Rewards (P2)**
- За 3 дня подряд — +1 ежедневное AI-объяснение (было 5 → 6)
- За 7 дней — "Streak Saver" (можно пропустить 1 день без потери)
- За 30 дней — специальный PRO-бейдж
- UI: визуализация предстоящих наград ("ещё 2 дня → награда")

#### Feature Group C: UX

**7. Dark/Light Theme (P2)**
- Использовать CSS-переменные (уже частично есть в App.css)
- Сохранять выбор в localStorage
- Toggle в Header

**8. Progress Export (P2)**
- PDF с readiness % + known topics + streak
- PNG с достижениями (для соцсетей)
- JSON export для тех, кто хочет данные
- Кнопка "Export resume stats" для LinkedIn

### Фаза 2: V1.2 — Growth Engine (4-6 недель)
**Цель**: Виральность, монетизация, комьюнити

#### Feature Group D: Community

**9. Peer-to-Peer Mock Interviews (P2)**
- Улучшить существующий `PeerToPeerSignaling` — сейчас он есть как заглушка
- Добавить матчинг: "готов пройти интервью сейчас" → подбор партнёра
- Система рейтинга интервьюера
- Поддержка голосовых/видео-звонков (через WebRTC)

**10. Discussions / Comments (P2)**
- Улучшить существующий `discussionService`
- Комментарии к вопросам с рейтингом (upvote/downvote)
- "Best answer" от AI vs User
- Отметки "помогло" (как StackOverflow)
- Модерация через admin

**11. User-Generated Questions (P3)**
- Форма: "Добавить вопрос"
- Модерация через admin panel
- UGC-категория в фильтре
- Бейдж контрибьютора

#### Feature Group E: Monetization

**12. Yearly Plan Discount (P1)**
- Monthly: 250 Stars (~$5)
- Yearly: 2500 Stars (2 месяца бесплатно, ~$50)
- Промо: "Save 17% with annual plan"
- UI: показать экономию

**13. Interview-as-a-Service / HR Integration (P3)**
- API для HR: ссылка на тест для кандидата
- Результаты теста — HR видит readiness + accuracy + topics
- Белый список компаний
- Пример: "Send this link to candidates"

**14. Certificates (P2)**
- Улучшить существующий `certificateService`
- Certification "Java Interview Ready" после прохождения трека
- Проверка через QR-код
- LinkedIn integration (button "Add to Profile")

---

## 5. Технические задачи для каждой фазы

### Фаза 1 — Backend changes

```sql
-- New tables
CREATE TABLE user_badges (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(telegram_id),
  badge_key VARCHAR(50) NOT NULL,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, badge_key)
);

CREATE TABLE daily_challenges (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  question_ids INTEGER[] NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE questions ADD COLUMN IF NOT EXISTS company VARCHAR(100);
ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_ugc BOOLEAN DEFAULT FALSE;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS ugc_author_id BIGINT REFERENCES users(telegram_id);

CREATE TABLE user_daily_attempts (
  user_id BIGINT REFERENCES users(telegram_id),
  date DATE DEFAULT CURRENT_DATE,
  attempts_used INT DEFAULT 0,
  PRIMARY KEY (user_id, date)
);
```

### Фаза 1 — Frontend components

```
frontend/src/components/
├── OnlineCompiler.jsx         # Встроенный компилятор кода
├── CompanyFilter.jsx          # Фильтр по компаниям
├── BadgeCard.jsx              # Достижение
├── BadgesScreen.jsx           # Страница всех достижений
├── DailyChallenge.jsx         # Ежедневный челлендж
├── Leaderboard.jsx            # Таблица лидеров
├── StreakRewards.jsx          # Награды за серию
├── ThemeToggle.jsx            # Dark/Light переключатель
├── ExportProgress.jsx         # Экспорт прогресса
└── ChallengeOfDay.jsx         # Вопрос дня
```

---

## 6. Metriki для трекинга

| Метрика | Сейчас | Цель | Инструмент |
|---------|--------|------|------------|
| D7 Retention | ? | > 25% | analytics_events |
| Free → PRO conversion | ? | > 3% | subscriptions table |
| Daily active users | ? | > 100 | analytics_events |
| AI explanation success rate | < 50% (timeout) | > 85% | ai_cache + logs |
| Questions per session | ? | > 10 | user_progress |
| Streak recovery | ? | > 30% | users.stats |
| Referral conversion | 0 (broken) | > 15% | referrals table |
| Average session duration | ? | > 5 min | analytics_events |
| NPS | — | > 40 | feedback form |

---

## 7. P0/P1 Баги — техническое задание на исправление

### Bug-01: Secrets committed
```
1. git filter-branch или BFG для удаления .env из истории
2. Переротировать все credentials:
   - Supabase: reset DB password в Supabase dashboard
   - Telegram Bot: /revoke в @BotFather → новый токен
   - OpenRouter: новый ключ в dashboard
   - JWT: openssl rand -base64 32
   - Redis: reset password
3. Удалить set-secrets-*.ps1 из репозитория
4. Добавить .env в .gitignore (ПРОВЕРИТЬ ЧТО УЖЕ ДОБАВЛЕН)
```

### Bug-02: Telegram validation bypass
```javascript
// backend/src/utils/telegram.js:40-50
// Заменить:
if (calculatedHash !== hash) {
  console.log('Hash mismatch');
  console.log('⚠️ Skipping hash validation for now');
}
// На:
if (calculatedHash !== hash) {
  logger.warn({ hash, calculatedHash }, 'Telegram hash validation failed');
  return null;
}
```

### Bug-05: Rate limiter disabled
```javascript
// backend/src/middleware/rateLimiter.js:126
// Заменить:
const userId = req.body?.userId || req.query?.userId;
// На:
const userId = req.userId;
```

### Bug-11: Empty catches
```bash
# Найти все пустые catch:
rg '\.catch\(\(\)\s*=>\s*\{\s*\}\)' backend/
rg 'catch\s*\{\s*\}' backend/
# Заменить каждое на catch(err => logger.error({ err, context }, '...'))
```

---

## 8. UX/UI улучшения

### 8.1 Онбординг (улучшить существующий)
- Показать 3 вопроса demo без регистрации
- "Вы знаете лучше чем X% пользователей" → мотивация зарегистрироваться
- Промпт: "Это займёт 10 секунд, ваш прогресс сохранится"

### 8.2 После авторизации
- "Вы пропустили X дней" → push-уведомление в Telegram
- "N вопросов ждут вас" → персонализация
- "Ваша текущая серия: X дней" → мотивация

### 8.3 Во время сессии
- Progress bar не просто "N/500" а "Вы на X% ближе к цели"
- После 10 свайпов — ShareCard с процентилем
- "AI объяснил вам N вопросов" → ценность AI

### 8.4 После сессии
- "Сегодня вы узнали N нового" → сравнение со вчера
- "Лучший ответ" — AI оценка
- "Поделиться" → Telegram / X / WhatsApp

---

## 9. План действий (следующие шаги)

### Этап 1: Немедленно (1-2 дня)
1. Переротировать все секреты (Bug-01)
2. Исправить валидацию Telegram (Bug-02)
3. Исправить rate limiter (Bug-05)
4. Увеличить AI_TIMEOUT_MS до 30000 (Bug-12)
5. Исправить Blitz + CodeCompletion (Bug-07, Bug-08)

### Этап 2: Stability Sprint (1 неделя)
6. Исправить все P0/P1 из BUGS_AND_IMPROVEMENTS.md
7. Заменить пустые catch на логирование (Bug-11)
8. Исправить writeCache (Bug-22)
9. Закрыть утечки ошибок в production (Bug-17)

### Этап 3: Core Features (2-3 недели)
10. Онлайн-компилятор (реальный редактор + Piston API)
11. Company-specific вопросы
12. Система бейджей/достижений
13. Ежедневные челленджи
14. Dark/Light theme

### Этап 4: Social Features (1-2 недели)
15. Leaderboard
16. Streak rewards
17. Progress export

### Этап 5: Growth (2-3 недели)
18. Peer-to-peer интервью
19. UGC questions
20. Годовой план
21. Email-рассылка

---

## 10. Резюме

### Статус реализации (по состоянию на 2026-07-27)

| Этап | Статус | Что сделано |
|------|--------|-------------|
| **Фаза 0: Надёжность** | ✅ Done | Большинство багов из BUGS_AND_IMPROVEMENTS.md уже пофикшены |
| **Фаза 1: Core Features** | ✅ Done | Company filter, badges/achievements, daily challenges, global leaderboard, progress export, dark/light theme, companies screen |
| **Фаза 2: Social Features** | ✅ Done | Streak multiplier rewards, streak milestone notifications, enhanced weekly challenges with streak bonus |
| **Фаза 3: Growth** | ✅ Done | Annual plan, UGC questions with admin moderation, email digest subscription, user profile screen, peer mock interview screen |

### Что реализовано:

1. **Company filter** — `companies` JSONB колонка + GIN-индекс, seed-companies.js с AI-тегированием, CompaniesScreen UI
2. **Badges/Achievements** — таблица `user_badges` + 12 бейджей + API `/api/badges` + `/api/badges/check` + автоматическое начисление
3. **Daily Challenges** — таблицы `daily_challenges` + `daily_challenge_results` + API
4. **Global Leaderboard** — `GET /api/leaderboard` с периодом (week/month/all)
5. **Progress Export** — `GET /api/progress/export?format=json|csv`
6. **Dark/Light Theme** — toggleTheme в store, CSS переменные `[data-theme]`, ThemeToggle компонент
7. **Companies Screen** — `GET /api/companies` + UI для фильтрации по компании
8. **Annual Pro Plan** — `annual_pro` план за $79.99/год со скидкой 17%
9. **UGC Questions** — таблица `user_submitted_questions` + API submit/list + admin moderation
10. **Email Digest** — подписка/отписка + ежедневный челлендж для рассылки
11. **Streak Rewards** — бонус AI объяснений за 3/7/30 дни серии
12. **Streak Milestones** — Telegram-уведомления при достижении рубежей
13. **Enhanced Weekly Challenges** — streak bonus очки в leaderboard
14. **User Profile Screen** — `ProfileScreen` component + `GET /api/me` + `PUT /api/me`
15. **Peer Mock Interview** — `PeerInterviewScreen` component + WebSocket P2P signaling at `/ws/peer`

### Что ещё предстоит (при необходимости):
- Заполнить `company_list` таблицу вручную или via seed-companies.js
- Поднять Sentry/uptime алерты перед запуском

---

### Конкурентный разрыв

> **Важно**: Платформа уже имеет AI-тьютор + Telegram-дистрибуцию — это уникальное преимущество. Главное теперь — довести геймификацию (бейджи, челленджи, лидерборд) до рабочего состояния и выложить продукт.

### Ключевые метрики успеха
- D7 Retention > 25%
- Free → PRO > 3%
- Запуск в течение 2-3 недель (после исправления багов)

### Стратегическая рекомендация
> Сделайте ставку на AI-фидбек и Telegram-дистрибуцию — это ваше уникальное преимущество перед LeetCode. Не пытайтесь догнать их по количеству вопросов (2000+ vs 200), а сделайте качественно другой опыт: персонализированный, с AI-тьютором, в Telegram.

---

### Деплой: Railway (Production)

| Элемент | Статус | Заметка |
|---------|--------|---------|
| Dockerfile | ✅ Готов | `node:22-alpine`, порты из `PORT` env, `start:all` |
| railway.toml | ✅ Готов | backend/backend/, restart 5 attempts, port 10000 |
| start-all.mjs | ✅ Готов | API + worker в одном контейнере |
| /health | ✅ Готов | Проверяет DB (Postgres) + Redis |
| .dockerignore | ✅ Добавлен | root + backend/ |
| DEPLOY.md | ✅ Авторитетный гайд | Полный пошаговый гайд для Railway |
| ENV vars | ✅ Документированы | Все в `.env.example` + DEPLOY.md |

**Следующий шаг перед запуском:**
- Прокрутить все секреты (DB, Telegram, OpenRouter, JWT, Redis, TON) — убрать `.env` из рабочего дерева
- Задеплоить backend на Railway → задеплоить фронтенд на Vercel → настроить `VITE_API_URL`
- Запустить `npm run setup-db` один раз на production DB
- Проверить `/health` и `/api/companies` endpoints

---

*Документ создан 27 июля 2026 на основе анализа кодовой базы и рыночных данных.*
