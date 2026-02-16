# 🎯 Примеры расширения и кастомизации

## Добавление новых вопросов

### Вариант 1: Через скрипт seed

Отредактируйте `backend/src/scripts/seed-db.js`:

```javascript
const questions = [
  // Ваши существующие вопросы...
  
  // Добавьте новые:
  {
    category: 'Hibernate',
    question: 'Что такое lazy loading?',
    short_answer: 'Отложенная загрузка связанных объектов по требованию'
  },
  {
    category: 'Hibernate',
    question: 'В чем разница между get() и load()?',
    short_answer: 'get() возвращает null, load() бросает исключение'
  }
];
```

Затем:
```bash
npm run seed-db
```

### Вариант 2: Напрямую в БД

```sql
INSERT INTO questions (category, question_text, short_answer) VALUES
('Kafka', 'Что такое partition в Kafka?', 'Логический раздел топика для параллельной обработки'),
('Kafka', 'Для чего нужен Consumer Group?', 'Параллельное потребление сообщений несколькими консьюмерами');
```

### Вариант 3: Через API endpoint (TODO)

Создайте admin endpoint:

```javascript
// backend/src/server.js
app.post('/api/admin/questions', async (req, res) => {
  const { category, question, shortAnswer, adminKey } = req.body;
  
  // Проверка admin ключа
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const result = await pool.query(
    'INSERT INTO questions (category, question_text, short_answer) VALUES ($1, $2, $3) RETURNING *',
    [category, question, shortAnswer]
  );
  
  res.json({ question: result.rows[0] });
});
```

## Добавление новой категории

### 1. Добавьте вопросы с новой категорией

```javascript
{
  category: 'Docker',
  question: 'Что такое Docker image?',
  short_answer: 'Неизменяемый шаблон для создания контейнеров'
}
```

### 2. Добавьте цвет для категории

В `frontend/src/components/QuestionCard.jsx`:

```javascript
const categoryColors = {
  // Существующие...
  'Docker': '#0db7ed',
  'Kubernetes': '#326ce5',
  'Микросервисы': '#00d084'
};
```

## Добавление системы уровней (Level System)

### 1. Добавьте поле в БД

```sql
ALTER TABLE questions ADD COLUMN difficulty VARCHAR(20) DEFAULT 'medium';
UPDATE questions SET difficulty = 'easy' WHERE category = 'Java Core';
UPDATE questions SET difficulty = 'hard' WHERE category = 'Multithreading';
```

### 2. Обновите API

```javascript
// backend/src/server.js
app.get('/api/questions/feed', async (req, res) => {
  const { userId, limit, difficulty } = req.query;
  
  let query = `
    SELECT q.id, q.category, q.question_text, q.short_answer, q.difficulty
    FROM questions q
    LEFT JOIN user_progress up ON q.id = up.question_id AND up.user_id = $1
    WHERE up.id IS NULL OR up.status = 'unknown'
  `;
  
  if (difficulty) {
    query += ` AND q.difficulty = $3`;
  }
  
  query += ` ORDER BY RANDOM() LIMIT $2`;
  
  // ... выполнить запрос
});
```

### 3. Обновите Frontend

```javascript
// frontend/src/components/LevelSelector.jsx
export const LevelSelector = ({ onSelect }) => {
  return (
    <div className="level-selector">
      <button onClick={() => onSelect('easy')}>Легкий</button>
      <button onClick={() => onSelect('medium')}>Средний</button>
      <button onClick={() => onSelect('hard')}>Сложный</button>
    </div>
  );
};
```

## Добавление системы достижений (Achievements)

### 1. Создайте таблицу

```sql
CREATE TABLE achievements (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  condition_type VARCHAR(50), -- 'known_count', 'streak_days', 'category_master'
  condition_value INTEGER
);

CREATE TABLE user_achievements (
  id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(telegram_id),
  achievement_id INTEGER REFERENCES achievements(id),
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, achievement_id)
);

-- Пример достижений
INSERT INTO achievements (name, description, icon, condition_type, condition_value) VALUES
('Новичок', 'Изучите первый вопрос', '🌱', 'known_count', 1),
('Знаток', 'Изучите 50 вопросов', '📚', 'known_count', 50),
('Эксперт', 'Изучите 100 вопросов', '🎓', 'known_count', 100),
('Мастер Collections', 'Изучите все вопросы по Collections', '🔧', 'category_master', 'Collections');
```

### 2. API endpoint

```javascript
app.get('/api/achievements/:userId', async (req, res) => {
  const { userId } = req.params;
  
  const achievements = await pool.query(`
    SELECT a.*, ua.unlocked_at, 
           CASE WHEN ua.id IS NOT NULL THEN true ELSE false END as unlocked
    FROM achievements a
    LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
    ORDER BY a.id
  `, [userId]);
  
  res.json({ achievements: achievements.rows });
});
```

### 3. UI компонент

```javascript
// AchievementBadge.jsx
export const AchievementBadge = ({ achievement }) => {
  return (
    <div className={`achievement ${achievement.unlocked ? 'unlocked' : 'locked'}`}>
      <div className="icon">{achievement.icon}</div>
      <div className="name">{achievement.name}</div>
      <div className="description">{achievement.description}</div>
    </div>
  );
};
```

## Добавление статистики по категориям

### 1. API endpoint

```javascript
app.get('/api/stats/categories/:userId', async (req, res) => {
  const { userId } = req.params;
  
  const stats = await pool.query(`
    SELECT 
      q.category,
      COUNT(*) FILTER (WHERE up.status = 'known') as known,
      COUNT(*) FILTER (WHERE up.status = 'unknown') as unknown,
      COUNT(DISTINCT q.id) as total_in_category
    FROM questions q
    LEFT JOIN user_progress up ON q.id = up.question_id AND up.user_id = $1
    GROUP BY q.category
    ORDER BY q.category
  `, [userId]);
  
  res.json({ categories: stats.rows });
});
```

### 2. UI компонент

```javascript
export const CategoryStats = () => {
  const [stats, setStats] = useState([]);
  
  useEffect(() => {
    // fetch stats
  }, []);
  
  return (
    <div className="category-stats">
      {stats.map(cat => (
        <div key={cat.category} className="category-stat">
          <h3>{cat.category}</h3>
          <div className="progress">
            <div className="known">{cat.known}</div>
            <div className="unknown">{cat.unknown}</div>
            <div className="total">{cat.total_in_category}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

## Добавление режима тренировки (Practice Mode)

### Повторение пройденных вопросов

```javascript
// backend
app.get('/api/questions/practice', async (req, res) => {
  const { userId, limit } = req.query;
  
  const questions = await pool.query(`
    SELECT q.id, q.category, q.question_text, q.short_answer
    FROM questions q
    INNER JOIN user_progress up ON q.id = up.question_id
    WHERE up.user_id = $1 AND up.status = 'known'
    ORDER BY RANDOM()
    LIMIT $2
  `, [userId, limit]);
  
  res.json({ questions: questions.rows });
});
```

### UI переключатель режимов

```javascript
export const ModeSelector = ({ mode, onModeChange }) => {
  return (
    <div className="mode-selector">
      <button 
        className={mode === 'learn' ? 'active' : ''}
        onClick={() => onModeChange('learn')}
      >
        📚 Изучение
      </button>
      <button 
        className={mode === 'practice' ? 'active' : ''}
        onClick={() => onModeChange('practice')}
      >
        💪 Тренировка
      </button>
    </div>
  );
};
```

## Добавление таймера

### Ограничение времени на ответ

```javascript
export const QuestionCardWithTimer = ({ question, onSwipe, timeLimit = 30 }) => {
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onSwipe('left'); // Автоматический свайп влево при истечении времени
          return timeLimit;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [question.id]);
  
  return (
    <div className="card-with-timer">
      <div className="timer">{timeLeft}s</div>
      <QuestionCard question={question} onSwipe={onSwipe} />
    </div>
  );
};
```

## Добавление поиска по вопросам

### Backend

```javascript
app.get('/api/questions/search', async (req, res) => {
  const { query, category } = req.query;
  
  let sql = `
    SELECT id, category, question_text, short_answer
    FROM questions
    WHERE question_text ILIKE $1
  `;
  
  const params = [`%${query}%`];
  
  if (category) {
    sql += ` AND category = $2`;
    params.push(category);
  }
  
  sql += ` ORDER BY category, id LIMIT 20`;
  
  const result = await pool.query(sql, params);
  res.json({ questions: result.rows });
});
```

### Frontend

```javascript
export const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  
  const handleSearch = async () => {
    const response = await apiClient.searchQuestions(query);
    onSearch(response.questions);
  };
  
  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Поиск вопросов..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
      />
      <button onClick={handleSearch}>🔍</button>
    </div>
  );
};
```

## Добавление экспорта прогресса

### Скачать статистику в CSV

```javascript
app.get('/api/export/:userId', async (req, res) => {
  const { userId } = req.params;
  
  const result = await pool.query(`
    SELECT 
      q.category,
      q.question_text,
      q.short_answer,
      up.status,
      up.updated_at
    FROM user_progress up
    JOIN questions q ON up.question_id = q.id
    WHERE up.user_id = $1
    ORDER BY up.updated_at DESC
  `, [userId]);
  
  // Формируем CSV
  let csv = 'Category,Question,Answer,Status,Date\n';
  result.rows.forEach(row => {
    csv += `"${row.category}","${row.question_text}","${row.short_answer}","${row.status}","${row.updated_at}"\n`;
  });
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=progress.csv');
  res.send(csv);
});
```

## Добавление социальных функций

### Таблица лидеров

```javascript
app.get('/api/leaderboard', async (req, res) => {
  const result = await pool.query(`
    SELECT 
      u.username,
      u.first_name,
      COUNT(*) FILTER (WHERE up.status = 'known') as known_count
    FROM users u
    LEFT JOIN user_progress up ON u.telegram_id = up.user_id
    GROUP BY u.telegram_id
    ORDER BY known_count DESC
    LIMIT 10
  `);
  
  res.json({ leaderboard: result.rows });
});
```

### Поделиться результатами

```javascript
export const ShareButton = ({ stats }) => {
  const handleShare = () => {
    const text = `Я изучил ${stats.known} вопросов по Java! 🎉\nПопробуй и ты: @YourBotUsername`;
    
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(
        `https://t.me/share/url?url=t.me/YourBotUsername&text=${encodeURIComponent(text)}`
      );
    }
  };
  
  return (
    <button onClick={handleShare}>
      📤 Поделиться результатом
    </button>
  );
};
```

## Кастомизация AI промпта

Отредактируйте `backend/src/services/aiService.js`:

```javascript
const SYSTEM_PROMPT = `
Ты — опытный Java разработчик и преподаватель.

Твоя задача:
1. Объяснить концепцию простым языком
2. Привести практический пример кода
3. Указать распространенные ошибки
4. Дать совет для собеседования

Формат:
## Объяснение
[краткое объяснение]

## Пример
\`\`\`java
[код]
\`\`\`

## Частые ошибки
- [ошибка 1]
- [ошибка 2]

## Совет для интервью
[практический совет]

Язык: Русский
Объем: до 1000 символов
`;
```

## Использование других AI моделей

### Переключение модели

В `.env`:
```env
# Бесплатные модели:
OPENROUTER_MODEL=google/gemini-2.0-flash-lite-preview-02-05:free
OPENROUTER_MODEL=meta-llama/llama-3.2-3b-instruct:free
OPENROUTER_MODEL=mistralai/mistral-7b-instruct:free

# Платные модели (лучше качество):
OPENROUTER_MODEL=openai/gpt-4o
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

### Использование локальной модели (Ollama)

```javascript
// aiService.js
const generateExplanation = async (questionText, shortAnswer) => {
  if (process.env.USE_OLLAMA === 'true') {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        model: 'llama2',
        prompt: `Объясни: ${questionText}\n\nОтвет: ${shortAnswer}`,
        stream: false
      })
    });
    
    const data = await response.json();
    return data.response;
  }
  
  // OpenRouter fallback...
};
```

## Добавление темной темы

```css
/* index.css */
[data-theme="dark"] {
  --bg-color: #1a1a1a;
  --text-color: #ffffff;
  --card-bg: #2d2d2d;
  --border-color: #3d3d3d;
}

[data-theme="light"] {
  --bg-color: #ffffff;
  --text-color: #000000;
  --card-bg: #f5f5f5;
  --border-color: #e0e0e0;
}

body {
  background: var(--bg-color);
  color: var(--text-color);
}
```

```javascript
// ThemeToggle.jsx
export const ThemeToggle = () => {
  const [theme, setTheme] = useState('light');
  
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };
  
  return (
    <button onClick={toggleTheme}>
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
};
```

Все эти расширения можно добавлять постепенно, в зависимости от ваших потребностей!
