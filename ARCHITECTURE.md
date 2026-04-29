# 🏗️ Архитектура проекта

## Обзор системы
baababab
```
┌─────────────────┐
│  Telegram Bot   │
│   (@BotFather)  │
└────────┬────────┘
         │
         │ initData
         ▼
┌─────────────────────────────────────────┐
│          Telegram Mini App              │
│  ┌───────────────────────────────────┐  │
│  │         React Frontend            │  │
│  │  ┌──────────────────────────┐    │  │
│  │  │  Components:             │    │  │
│  │  │  - Header (прогресс)     │    │  │
│  │  │  - QuestionCard (свайп)  │    │  │
│  │  │  - SwipeButtons          │    │  │
│  │  │  - ExplanationModal      │    │  │
│  │  └──────────────────────────┘    │  │
│  │                                   │  │
│  │  ┌──────────────────────────┐    │  │
│  │  │  State (Zustand):        │    │  │
│  │  │  - user                  │    │  │
│  │  │  - questions             │    │  │
│  │  │  - stats                 │    │  │
│  │  └──────────────────────────┘    │  │
│  └───────────────┬───────────────────┘  │
└──────────────────┼──────────────────────┘
                   │ REST API
                   │ (fetch)
                   ▼
┌──────────────────────────────────────────┐
│          Node.js Backend (Express)       │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  API Endpoints:                    │ │
│  │  POST /api/auth/login              │ │
│  │  GET  /api/questions/feed          │ │
│  │  POST /api/questions/swipe         │ │
│  │  POST /api/questions/explain       │ │
│  │  GET  /api/stats                   │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  Services:                         │ │
│  │  - aiService (OpenRouter)          │ │
│  │  - telegram (валидация)            │ │
│  └────────────────────────────────────┘ │
└──────────────┬───────────────┬───────────┘
               │               │
               │               │ HTTP Request
               │               ▼
               │    ┌──────────────────────┐
               │    │   OpenRouter API     │
               │    │  (AI генерация)      │
               │    │  google/gemini-2.0   │
               │    └──────────────────────┘
               │
               │ SQL Queries
               ▼
┌──────────────────────────────────────────┐
│          PostgreSQL Database             │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  Table: users                    │   │
│  │  - telegram_id (PK)              │   │
│  │  - username, first_name          │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  Table: questions                │   │
│  │  - id (PK)                       │   │
│  │  - category                      │   │
│  │  - question_text                 │   │
│  │  - short_answer                  │   │
│  │  - cached_explanation (AI кэш)   │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  Table: user_progress            │   │
│  │  - id (PK)                       │   │
│  │  - user_id (FK → users)          │   │
│  │  - question_id (FK → questions)  │   │
│  │  - status (known/unknown)        │   │
│  └──────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

## Поток данных

### 1. Аутентификация

```
User → Telegram Bot → Mini App
                        ↓
                   initData (зашифрованная строка)
                        ↓
                   Frontend (React)
                        ↓
                   POST /api/auth/login
                        ↓
                   Backend валидирует initData
                        ↓
                   Создает/обновляет user в БД
                        ↓
                   Возвращает user данные
                        ↓
                   Frontend сохраняет в Zustand
```

### 2. Получение вопросов

```
Frontend (mounted)
    ↓
GET /api/questions/feed?userId=X&limit=10
    ↓
Backend:
    1. Выбирает вопросы которых пользователь не видел
    2. Или видел давно и ответил неверно
    3. Сортирует случайно (RANDOM())
    ↓
Frontend получает массив questions
    ↓
Отображает карточки стеком
```

### 3. Свайп вправо (Знаю)

```
User свайпает карточку →
    ↓
Frontend: onSwipe('right')
    ↓
POST /api/questions/swipe
    body: { userId, questionId, status: 'known' }
    ↓
Backend:
    INSERT/UPDATE user_progress
    SET status = 'known'
    ↓
Frontend:
    - Обновляет локальную статистику
    - Показывает следующую карточку
    - Подгружает новые вопросы если < 3 осталось
```

### 4. Свайп влево (Не знаю)

```
User свайпает карточку ←
    ↓
Frontend: onSwipe('left')
    ↓
1) POST /api/questions/swipe
   body: { userId, questionId, status: 'unknown' }
    ↓
2) POST /api/questions/explain
   body: { questionId }
    ↓
Backend проверяет cached_explanation:
    ↓
    Если есть в кэше → возвращает сразу
    ↓
    Если нет:
        1. Отправляет запрос в OpenRouter API
        2. Получает AI объяснение
        3. Сохраняет в questions.cached_explanation
        4. Возвращает клиенту
    ↓
Frontend:
    - Открывает ExplanationModal
    - Показывает skeleton (loading)
    - Отображает Markdown ответ
    - Кнопка "Далее" → следующая карточка
```

## Компоненты Frontend

### Header.jsx
```
Отображает:
- Название приложения
- Прогресс: "Изучено: 12 / 500"
- Progress bar с визуализацией
```

### QuestionCard.jsx
```
Функции:
- Отображение вопроса (front)
- Отображение краткого ответа (back)
- Flip анимация по клику
- Swipe механика (react-tinder-card)
- Цветовая категоризация

События:
- onClick → flip карточки
- onSwipe(direction) → передает в родителя
```

### SwipeButtons.jsx
```
Две кнопки:
- ❌ Не знаю (левая, красная)
- ✅ Знаю (правая, зеленая)

Программно триггерят swipe на активной карточке
```

### ExplanationModal.jsx
```
Bottom sheet модальное окно:
- Анимация появления снизу
- Loading состояние (spinner)
- Рендеринг Markdown (react-markdown)
- Поддержка code blocks
- Кнопка закрытия
```

### App.jsx
```
Главный компонент:
- Инициализация Telegram WebApp
- Аутентификация при загрузке
- Управление стеком карточек
- Координация между компонентами
```

## Backend API Endpoints

### POST /api/auth/login
```javascript
Input:  { initData: "string" }
Action: Валидация через crypto, создание user
Output: { success: true, user: {...} }
```

### GET /api/questions/feed
```javascript
Query:  userId=X, limit=10
Action: SELECT вопросы с LEFT JOIN user_progress
Output: { questions: [...] }

SQL логика:
WHERE up.id IS NULL          -- не видел
   OR up.status = 'unknown'  -- или ответил неверно
ORDER BY RANDOM()
```

### POST /api/questions/swipe
```javascript
Input:  { userId, questionId, status: 'known'|'unknown' }
Action: INSERT INTO user_progress ON CONFLICT UPDATE
Output: { success: true }
```

### POST /api/questions/explain
```javascript
Input:  { questionId }
Action: 
  1. Проверить cached_explanation
  2. Если нет → вызвать OpenRouter API
  3. Сохранить в кэш
Output: { explanation: "markdown", cached: boolean }

OpenRouter request:
POST https://openrouter.ai/api/v1/chat/completions
{
  model: "google/gemini-2.0-flash-lite-preview-02-05:free",
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: "Объясни: ..." }
  ]
}
```

### GET /api/stats
```javascript
Query:  userId=X
Action: COUNT(*) FILTER (WHERE status = 'known/unknown')
Output: { known, unknown, totalSeen, totalQuestions }
```

## State Management (Zustand)

```javascript
const store = {
  // Auth
  user: null,
  isAuthenticated: false,
  
  // Questions
  questions: [],      // массив вопросов
  currentIndex: 0,    // индекс текущей карточки
  
  // Stats
  stats: {
    known: 0,
    unknown: 0,
    totalSeen: 0,
    totalQuestions: 0
  },
  
  // Modal
  showExplanation: false,
  currentExplanation: null,
  isLoadingExplanation: false,
  
  // Actions
  login(initData),
  loadQuestions(),
  swipeCard(questionId, direction),
  loadExplanation(questionId),
  closeExplanation()
}
```

## База данных

### Связи

```
users (1) ───< (M) user_progress
                       │
                       │ (M) >─── (1) questions
                       
user_progress связывает users и questions
(Many-to-Many с дополнительными полями)
```

### Индексы

```sql
-- Для быстрого поиска прогресса пользователя
idx_user_progress_user_id ON user_progress(user_id)

-- Для быстрого поиска всех ответов на вопрос
idx_user_progress_question_id ON user_progress(question_id)

-- Для фильтрации по категориям
idx_questions_category ON questions(category)
```

## Оптимизации

### 1. Кэширование AI ответов
```
questions.cached_explanation → сохраняет ответ
Экономит: токены, время, деньги
```

### 2. Предзагрузка вопросов
```
Когда осталось < 3 вопроса → подгружаем еще 10
Пользователь не ждет
```

### 3. Батчинг
```
Загружаем сразу 10 вопросов, а не по одному
Меньше запросов к API
```

### 4. Индексы БД
```
Ускоряют SELECT с JOIN и WHERE
```

## Безопасность

### 1. Валидация Telegram initData
```javascript
HMAC-SHA256 проверка подписи
Предотвращает подделку авторизации
```

### 2. API Key на сервере
```
OPENROUTER_API_KEY только в Backend
Frontend не имеет доступа
```

### 3. SQL Injection защита
```
Используем параметризованные запросы ($1, $2)
Никогда не конкатенируем SQL строки
```

### 4. Rate limiting (TODO)
```
Ограничение количества запросов к AI
Защита от злоупотреблений
```

## Production Deployment

```
Frontend (Vercel):
- Static hosting
- CDN
- Automatic HTTPS

Backend (Railway):
- Managed Node.js
- Environment variables
- Logs & metrics

Database (Supabase):
- Managed PostgreSQL
- Automatic backups
- Connection pooling
```

## Метрики и мониторинг (рекомендуется)

```
1. API Response time
2. AI generation time
3. Cache hit rate (cached_explanation)
4. User engagement:
   - Questions per session
   - Known vs Unknown ratio
   - Daily active users
5. Error rates
```
