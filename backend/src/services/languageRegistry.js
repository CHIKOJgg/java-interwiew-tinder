/**
 * Language Registry
 * Each language defines its categories, system prompts, code examples, and validation rules.
 * Adding a new language = adding one entry here + seeding questions.
 */

export const LANGUAGES = {
  Java: {
    id: 'Java',
    name: 'Java',
    categories: [
      'Java Core', 'Collections', 'Multithreading', 'Spring', 'JVM',
      'Exceptions', 'OOP', 'Stream API', 'Design Patterns', 'Database',
      'Testing', 'Microservices', 'Security'
    ],
    systemPrompt: 'Ты — опытный ментор по Java. Объясняй концепции просто и кратко. Используй Markdown и примеры кода на Java. Язык: Русский.',
    prompts: {
      explanation: (q, a) => `Объясни: "${q}". Краткий ответ: ${a}`,
      test: (q, a) => `Вопрос: "${q}". Ответ: "${a}". Сгенерируй 3 неправильных правдоподобных варианта. Верни ТОЛЬКО JSON массив строк.`,
      bug: (q, topic) => `Bug Hunting задача (Java). Тема: "${topic}", вопрос: "${q}".
Создай короткий Java-код(8-15 строк) с одной реальной ошибкой (логической или синтаксической).
Верни ТОЛЬКО валидный JSON без markdown и комментариев:
{"code":"<Java код с ошибкой, \\n для переносов>","bug":"<чёткое описание реальной ошибки>","options":["<описание реальной ошибки (правильный ответ)>","<правдоподобный неверный вариант 1>","<правдоподобный неверный вариант 2>","<правдоподобный неверный вариант 3>"]}
Требования: options[0] должен точно совпадать с bug. Перемешай порядок вариантов в массиве.`,
      blitz: (q, topic) => `Blitz (Java): "${topic}", "${q}". Одно утверждение о Java. Верни ТОЛЬКО JSON: {"statement":"...", "isCorrect":true/false}`,
      code: (q, topic) => `Code Completion задача (Java). Тема: "${topic}", вопрос: "${q}".
Создай короткий Java фрагмент кода с одним пропуском, обозначенным как ___.
Верни ТОЛЬКО валидный JSON без markdown и комментариев:
{"snippet":"<Java код где нужная часть заменена на ___>","correctPart":"<именно то, что нужно вставить вместо ___>","options":["<правильное заполнение>","<неверный, но правдоподобный вариант 1>","<неверный, но правдоподобный вариант 2>","<неверный, но правдоподобный вариант 3>"]}
Требования: options[0] должен точно совпадать с correctPart. Перемешай порядок вариантов.`,
      interview: (q, a) => `Интервью (Java). Вопрос: "${q}". Ответ: "${a}". Оцени. Верни ТОЛЬКО JSON: {"score":1-10, "feedback":"...", "correctVersion":"..."}`,
      resume: (text) => `Проанализируй резюме Java разработчика: "${text}". Верни ТОЛЬКО JSON: {"skills":[], "experienceLevel":"...", "strengths":[], "improvementAreas":[], "suggestedQuestions":[]}`
    },
    codeLanguage: 'java',
    validateAnswer: (userAnswer, correctAnswer) => {
      if (!userAnswer || !correctAnswer) return false;
      return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    }
  },

  Python: {
    id: 'Python',
    name: 'Python',
    categories: [
      'Python Core', 'Data Structures', 'OOP', 'Concurrency', 'Django',
      'Flask', 'FastAPI', 'Testing', 'Decorators', 'Generators',
      'Type Hints', 'Async/Await', 'Design Patterns', 'Database'
    ],
    systemPrompt: 'Ты — опытный ментор по Python. Объясняй концепции просто и кратко. Используй Markdown и примеры кода на Python. Язык: Русский.',
    prompts: {
      explanation: (q, a) => `Объясни (Python): "${q}". Краткий ответ: ${a}`,
      test: (q, a) => `Вопрос (Python): "${q}". Ответ: "${a}". Сгенерируй 3 неправильных правдоподобных варианта. Верни ТОЛЬКО JSON массив строк.`,
      bug: (q, topic) => `Bug Hunting задача (Python). Тема: "${topic}", вопрос: "${q}".
Создай короткий Python-код (8-15 строк) с одной реальной ошибкой (логической или синтаксической).
Верни ТОЛЬКО валидный JSON без markdown и комментариев:
{"code":"<Python код с ошибкой, \\n для переносов>","bug":"<чёткое описание реальной ошибки>","options":["<описание реальной ошибки (правильный ответ)>","<правдоподобный неверный вариант 1>","<правдоподобный неверный вариант 2>","<правдоподобный неверный вариант 3>"]}
Требования: options[0] должен точно совпадать с bug. Перемешай порядок вариантов в массиве.`,
      blitz: (q, topic) => `Blitz (Python): "${topic}", "${q}". Одно утверждение о Python. Верни ТОЛЬКО JSON: {"statement":"...", "isCorrect":true/false}`,
      code: (q, topic) => `Code Completion задача (Python). Тема: "${topic}", вопрос: "${q}".
Создай короткий Python фрагмент кода с одним пропуском, обозначенным как ___.
Верни ТОЛЬКО валидный JSON без markdown и комментариев:
{"snippet":"<Python код где нужная часть заменена на ___>","correctPart":"<именно то, что нужно вставить вместо ___>","options":["<правильное заполнение>","<неверный, но правдоподобный вариант 1>","<неверный, но правдоподобный вариант 2>","<неверный, но правдоподобный вариант 3>"]}
Требования: options[0] должен точно совпадать с correctPart. Перемешай порядок вариантов.`,
      interview: (q, a) => `Интервью (Python). Вопрос: "${q}". Ответ: "${a}". Оцени. Верни ТОЛЬКО JSON: {"score":1-10, "feedback":"...", "correctVersion":"..."}`,
      resume: (text) => `Проанализируй резюме Python разработчика: "${text}". Верни ТОЛЬКО JSON: {"skills":[], "experienceLevel":"...", "strengths":[], "improvementAreas":[], "suggestedQuestions":[]}`
    },
    codeLanguage: 'python',
    validateAnswer: (userAnswer, correctAnswer) => {
      if (!userAnswer || !correctAnswer) return false;
      // Python is more flexible with answers — semantic comparison
      const normalize = s => s.trim().toLowerCase().replace(/\s+/g, ' ');
      return normalize(userAnswer) === normalize(correctAnswer);
    }
  },

  TypeScript: {
    id: 'TypeScript',
    name: 'TypeScript',
    categories: [
      'TypeScript Core', 'Type System', 'Generics', 'Decorators',
      'React', 'Node.js', 'NestJS', 'OOP', 'Async/Await',
      'Testing', 'Design Patterns', 'Modules'
    ],
    systemPrompt: 'Ты — опытный ментор по TypeScript. Объясняй концепции просто и кратко. Используй Markdown и примеры кода на TypeScript. Язык: Русский.',
    prompts: {
      explanation: (q, a) => `Объясни (TypeScript): "${q}". Краткий ответ: ${a}`,
      test: (q, a) => `Вопрос (TypeScript): "${q}". Ответ: "${a}". Сгенерируй 3 неправильных правдоподобных варианта. Верни ТОЛЬКО JSON массив строк.`,
      bug: (q, topic) => `Bug Hunting задача (TypeScript). Тема: "${topic}", вопрос: "${q}".
Создай короткий TypeScript-код (8-15 строк) с одной реальной ошибкой (логической или типизации).
Верни ТОЛЬКО валидный JSON без markdown и комментариев:
{"code":"<TypeScript код с ошибкой, \\n для переносов>","bug":"<чёткое описание реальной ошибки>","options":["<описание реальной ошибки (правильный ответ)>","<правдоподобный неверный вариант 1>","<правдоподобный неверный вариант 2>","<правдоподобный неверный вариант 3>"]}
Требования: options[0] должен точно совпадать с bug. Перемешай порядок вариантов в массиве.`,
      blitz: (q, topic) => `Blitz (TypeScript): "${topic}", "${q}". Одно утверждение о TypeScript. Верни ТОЛЬКО JSON: {"statement":"...", "isCorrect":true/false}`,
      code: (q, topic) => `Code Completion задача (TypeScript). Тема: "${topic}", вопрос: "${q}".
Создай короткий TypeScript фрагмент кода с одним пропуском, обозначенным как ___.
Верни ТОЛЬКО валидный JSON без markdown и комментариев:
{"snippet":"<TypeScript код где нужная часть заменена на ___>","correctPart":"<именно то, что нужно вставить вместо ___>","options":["<правильное заполнение>","<неверный, но правдоподобный вариант 1>","<неверный, но правдоподобный вариант 2>","<неверный, но правдоподобный вариант 3>"]}
Требования: options[0] должен точно совпадать с correctPart. Перемешай порядок вариантов.`,
      interview: (q, a) => `Интервью (TypeScript). Вопрос: "${q}". Ответ: "${a}". Оцени. Верни ТОЛЬКО JSON: {"score":1-10, "feedback":"...", "correctVersion":"..."}`,
      resume: (text) => `Проанализируй резюме TypeScript разработчика: "${text}". Верни ТОЛЬКО JSON: {"skills":[], "experienceLevel":"...", "strengths":[], "improvementAreas":[], "suggestedQuestions":[]}`
    },
    codeLanguage: 'typescript',
    validateAnswer: (userAnswer, correctAnswer) => {
      if (!userAnswer || !correctAnswer) return false;
      const normalize = s => s.trim().toLowerCase().replace(/\s+/g, ' ');
      return normalize(userAnswer) === normalize(correctAnswer);
    }
  }
};

export function getLanguage(langId) {
  return LANGUAGES[langId] || LANGUAGES.Java;
}

export function getAvailableLanguages() {
  return Object.keys(LANGUAGES);
}

export function getCategories(langId) {
  return getLanguage(langId).categories;
}