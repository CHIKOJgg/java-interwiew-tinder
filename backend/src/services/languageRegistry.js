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
      bug: (q, topic) => `Bug Hunting (Java): "${topic}", вопрос: "${q}". Код на Java с 1 ошибкой. Верни ТОЛЬКО JSON: {"code":"...", "bug":"правильный", "options":["правильный", "непр1", "непр2", "непр3"]}`,
      blitz: (q, topic) => `Blitz (Java): "${topic}", "${q}". Одно утверждение о Java. Верни ТОЛЬКО JSON: {"statement":"...", "isCorrect":true/false}`,
      code: (q, topic) => `Code Completion (Java): "${topic}", "${q}". Код на Java с пропуском "___". Верни ТОЛЬКО JSON: {"snippet":"...", "correctPart":"...", "options":["правильный", "непр1", "непр2", "непр3"]}`,
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
      bug: (q, topic) => `Bug Hunting (Python): "${topic}", вопрос: "${q}". Код на Python с 1 ошибкой. Верни ТОЛЬКО JSON: {"code":"...", "bug":"правильный", "options":["правильный", "непр1", "непр2", "непр3"]}`,
      blitz: (q, topic) => `Blitz (Python): "${topic}", "${q}". Одно утверждение о Python. Верни ТОЛЬКО JSON: {"statement":"...", "isCorrect":true/false}`,
      code: (q, topic) => `Code Completion (Python): "${topic}", "${q}". Код на Python с пропуском "___". Верни ТОЛЬКО JSON: {"snippet":"...", "correctPart":"...", "options":["правильный", "непр1", "непр2", "непр3"]}`,
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
      bug: (q, topic) => `Bug Hunting (TypeScript): "${topic}", вопрос: "${q}". Код на TypeScript с 1 ошибкой. Верни ТОЛЬКО JSON: {"code":"...", "bug":"правильный", "options":["правильный", "непр1", "непр2", "непр3"]}`,
      blitz: (q, topic) => `Blitz (TypeScript): "${topic}", "${q}". Одно утверждение о TypeScript. Верни ТОЛЬКО JSON: {"statement":"...", "isCorrect":true/false}`,
      code: (q, topic) => `Code Completion (TypeScript): "${topic}", "${q}". Код на TypeScript с пропуском "___". Верни ТОЛЬКО JSON: {"snippet":"...", "correctPart":"...", "options":["правильный", "непр1", "непр2", "непр3"]}`,
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
