# 📦 Структура проекта

Полный список файлов проекта с описанием назначения каждого.

## 📋 Корневые файлы документации

```
├── README.md              # Главная документация проекта
├── QUICKSTART.md          # Быстрый старт для разработчиков
├── DEPLOYMENT.md          # Пошаговая инструкция по деплою
├── ARCHITECTURE.md        # Архитектура и потоки данных
├── EXAMPLES.md            # Примеры расширения функционала
└── .gitignore            # Игнорируемые файлы для Git
```

## 🗄️ Database (SQL схемы)

```
database/
└── schema.sql            # SQL скрипт для создания всех таблиц + seed данные
                          # Можно запустить: psql database_name < schema.sql
```

## 🔙 Backend (Node.js + Express)

```
backend/
├── package.json                    # Зависимости и скрипты Backend
├── .env.example                    # Шаблон переменных окружения
│
├── src/
│   ├── server.js                   # 🚀 Главный файл сервера
│   │                               # Express app + все API endpoints
│   │                               # POST /api/auth/login
│   │                               # GET  /api/questions/feed
│   │                               # POST /api/questions/swipe
│   │                               # POST /api/questions/explain
│   │                               # GET  /api/stats
│   │
│   ├── config/
│   │   └── database.js            # Настройка PostgreSQL connection pool
│   │
│   ├── services/
│   │   └── aiService.js           # OpenRouter API интеграция
│   │                               # Генерация AI объяснений
│   │                               # System prompt настройки
│   │
│   ├── utils/
│   │   └── telegram.js            # Валидация Telegram initData
│   │                               # HMAC-SHA256 проверка
│   │                               # Mock для dev режима
│   │
│   └── scripts/
│       ├── init-db.js             # 🔧 Создание таблиц в БД
│       │                           # npm run init-db
│       │
│       └── seed-db.js             # 🌱 Заполнение БД вопросами
                                    # 50 вопросов по Java
                                    # npm run seed-db
```

### Backend package.json scripts:

```json
{
  "start": "node src/server.js",        // Production запуск
  "dev": "node --watch src/server.js",  // Dev с hot reload
  "init-db": "node src/scripts/init-db.js",  // Создать таблицы
  "seed-db": "node src/scripts/seed-db.js"   // Заполнить вопросы
}
```

## 🎨 Frontend (React + Vite)

```
frontend/
├── package.json                    # Зависимости и скрипты Frontend
├── .env.example                    # Шаблон переменных окружения
├── vite.config.js                  # Конфигурация Vite
├── index.html                      # HTML entry point
│
└── src/
    ├── main.jsx                    # 🚀 React entry point
    │                               # ReactDOM.render(<App />)
    │
    ├── App.jsx                     # 🏠 Главный компонент приложения
    ├── App.css                     # Стили главного компонента
    ├── index.css                   # Глобальные стили + анимации
    │
    ├── api/
    │   └── client.js              # 🌐 API клиент
    │                               # Все HTTP запросы к Backend
    │                               # login(), getQuestionsFeed(), etc.
    │
    ├── store/
    │   └── useStore.js            # 🗂️ Zustand state management
    │                               # Global state: user, questions, stats
    │                               # Actions: login, swipeCard, etc.
    │
    └── components/
        ├── Header.jsx              # 📊 Шапка с прогрессом
        ├── Header.css              # Стили шапки
        │
        ├── QuestionCard.jsx        # 🃏 Карточка с вопросом
        ├── QuestionCard.css        # Стили карточки + flip анимация
        │                           # Swipe механика (react-tinder-card)
        │
        ├── SwipeButtons.jsx        # 🎮 Кнопки управления
        ├── SwipeButtons.css        # Стили кнопок
        │
        ├── ExplanationModal.jsx    # 💬 Модальное окно с объяснением
        └── ExplanationModal.css    # Стили модального окна
                                     # Bottom sheet анимация
                                     # Markdown рендеринг
```

### Frontend package.json scripts:

```json
{
  "dev": "vite",              // Dev server на localhost:5173
  "build": "vite build",      // Production build в /dist
  "preview": "vite preview"   // Просмотр production build
}
```

## 📊 Схема зависимостей

### Backend зависимости:

```
express         # Web framework
cors            # CORS middleware
pg              # PostgreSQL client
dotenv          # Environment variables
crypto          # Built-in (для Telegram валидации)
```

### Frontend зависимости:

```
react                # UI библиотека
react-dom            # React DOM рендеринг
react-tinder-card    # Swipe механика
lucide-react         # Иконки
zustand              # State management
react-markdown       # Markdown рендеринг
```

## 🔄 Порядок загрузки приложения

### Backend (server.js):

```
1. Загрузка .env переменных (dotenv)
2. Создание Express app
3. Настройка middleware (cors, json)
4. Регистрация API endpoints
5. Запуск сервера на PORT
6. Подключение к PostgreSQL
```

### Frontend (main.jsx → App.jsx):

```
1. ReactDOM.render
2. App компонент монтируется
3. useEffect: инициализация Telegram WebApp
4. useEffect: автоматическая авторизация (login)
5. После login: загрузка questions + stats
6. Рендеринг Header + QuestionCard + SwipeButtons
```

## 🎯 Основные файлы для редактирования

### Для добавления вопросов:

```
backend/src/scripts/seed-db.js   # Массив questions
database/schema.sql               # INSERT statements
```

### Для изменения AI промпта:

```
backend/src/services/aiService.js   # SYSTEM_PROMPT константа
```

### Для изменения дизайна:

```
frontend/src/components/*.css       # Все стили компонентов
frontend/src/index.css              # Глобальные стили
```

### Для добавления категорий:

```
backend/src/scripts/seed-db.js          # Добавить вопросы
frontend/src/components/QuestionCard.jsx # categoryColors
```

### Для настройки API:

```
backend/src/server.js    # Все endpoints
frontend/src/api/client.js   # API клиент
```

## 🚀 Критические файлы для Production

### Обязательно настроить:

```
backend/.env             # DATABASE_URL, BOT_TOKEN, OPENROUTER_API_KEY
frontend/.env            # VITE_API_URL
```

### Проверить перед деплоем:

```
backend/src/server.js    # CORS настройки
backend/src/config/database.js   # SSL для production
frontend/vite.config.js  # Build настройки
```

## 📝 Файлы конфигурации

### Backend:

```
package.json      # Версии зависимостей, scripts
.env.example      # Шаблон переменных
```

### Frontend:

```
package.json      # Версии зависимостей, scripts
.env.example      # Шаблон переменных
vite.config.js    # Vite настройки
index.html        # HTML template
```

## 🔍 Навигация по коду

### Ищете как работает...

**Авторизация:**
- Backend: `backend/src/server.js` → `/api/auth/login`
- Валидация: `backend/src/utils/telegram.js`
- Frontend: `frontend/src/store/useStore.js` → `login()`

**Свайп карточки:**
- UI: `frontend/src/components/QuestionCard.jsx`
- Логика: `frontend/src/App.jsx` → `handleSwipe()`
- Store: `frontend/src/store/useStore.js` → `swipeCard()`
- API: `backend/src/server.js` → `/api/questions/swipe`

**AI объяснение:**
- UI: `frontend/src/components/ExplanationModal.jsx`
- Store: `frontend/src/store/useStore.js` → `loadExplanation()`
- API: `backend/src/server.js` → `/api/questions/explain`
- Service: `backend/src/services/aiService.js`

**Загрузка вопросов:**
- Store: `frontend/src/store/useStore.js` → `loadQuestions()`
- API: `backend/src/server.js` → `/api/questions/feed`
- SQL: Запрос с LEFT JOIN

**Статистика:**
- UI: `frontend/src/components/Header.jsx`
- Store: `frontend/src/store/useStore.js` → `stats`
- API: `backend/src/server.js` → `/api/stats`

## 📦 Размер файлов

Примерные размеры (строк кода):

```
Backend:
  server.js           ~230 строк
  aiService.js        ~100 строк
  seed-db.js          ~250 строк
  database.js         ~20 строк
  telegram.js         ~70 строк
  init-db.js          ~80 строк
  
Frontend:
  App.jsx             ~100 строк
  QuestionCard.jsx    ~80 строк
  ExplanationModal.jsx ~50 строк
  Header.jsx          ~30 строк
  SwipeButtons.jsx    ~30 строк
  useStore.js         ~150 строк
  client.js           ~90 строк
  
CSS файлы:          ~800 строк всего

Документация:       ~1500 строк всего

Итого кода:         ~2200 строк
```

## 🎓 Советы по навигации

1. **Начните с README.md** - общее понимание проекта
2. **QUICKSTART.md** - если нужно быстро запустить
3. **ARCHITECTURE.md** - если нужно понять как все работает
4. **EXAMPLES.md** - если нужно расширить функционал
5. **DEPLOYMENT.md** - когда готовы к продакшену

## 🔧 Порядок разработки

### Для новых фич:

1. Добавьте таблицу/поле в БД (если нужно)
2. Создайте API endpoint в `backend/src/server.js`
3. Добавьте метод в `frontend/src/api/client.js`
4. Создайте UI компонент в `frontend/src/components/`
5. Интегрируйте в `App.jsx` или добавьте в store

### Для bugfix:

1. Найдите где происходит ошибка (console.log)
2. Backend ошибка → `backend/src/server.js` + логи
3. Frontend ошибка → React DevTools + компонент
4. API ошибка → проверьте Network tab

Удачи в разработке! 🚀
