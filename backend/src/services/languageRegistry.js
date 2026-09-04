/**
 * Language Registry
 * Each language defines its system prompts and per-mode prompts.
 *
 * PROMPT RULES (critical — free models are literal):
 * 1. System message must say "JSON API" and show the exact required structure.
 * 2. User message must show a FILLED example, not a schema description.
 * 3. Never use "..." in examples — models copy the ellipsis literally.
 * 4. Never say "return only JSON" without showing what JSON looks like.
 */

// ─── Shared JSON system prompt ─────────────────────────────────────────
const jsonSystem = (schema) =>
  `You are a JSON API. You MUST respond with ONLY a raw JSON object — no markdown, no prose, no code fences, no explanation.
Your response must start with { and be valid JSON.
Required schema: ${JSON.stringify(schema)}`;

// ─── Per-mode schemas and example builders ─────────────────────────────
const PROMPTS = {
  explanation: {
    system: () => jsonSystem({
      title: "string — topic name",
      theory: "string — clear explanation in 2-4 sentences",
      where_used: ["string — real usage example"],
      code_example: "string — short runnable code snippet",
      key_points: ["string — bullet point"],
    }),
    user: (lang, q, a) =>
      `Ответь ТОЛЬКО на русском языке. Весь текст, примеры и варианты должны быть на русском.
Language: ${lang}
Question: ${q}
Short answer: ${a}

Respond with a JSON explanation. Example of the exact format:
{
  "title": "HashMap против TreeMap",
  "theory": "HashMap хранит пары ключ-значение в хэш-таблице со средней сложностью O(1). TreeMap использует красно-черное дерево с O(log n), но сохраняет ключи отсортированными.",
  "where_used": ["HashMap: кэширование, подсчет частоты", "TreeMap: запросы диапазона, сортированная итерация"],
  "code_example": "Map<String, Integer> map = new HashMap<>();\\nmap.put(\\"a\\", 1);",
  "key_points": ["HashMap быстрее", "TreeMap сортирован", "Ни один не потокобезопасен"]
}`,
  },

  test: {
    system: () => jsonSystem({
      options: ["wrong option 1", "wrong option 2", "wrong option 3"],
    }),
    user: (lang, q, correct) =>
      `Ответь ТОЛЬКО на русском языке. Все варианты ответов должны быть на русском.
Language: ${lang}
Question: ${q}
Correct answer: ${correct}

КРИТИЧЕСКИ ВАЖНЫЕ ПРАВИЛА ПРОТИВ LENGTH-BIAS:
1. Длина каждого из 3 неверных вариантов ДОЛЖНА БЫТЬ ПРИБЛИЗИТЕЛЬНО ТАКОЙ ЖЕ, как у правильного ответа (±20% символов).
2. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО делать правильный ответ длинным и подробным, а неправильные — короткими отписками из 2-3 слов.
3. Неправильные варианты должны быть правдоподобными техническими заблуждениями или альтернативными реализациями в том же профессиональном тоне.
4. Длина правильного ответа: ${correct.length} символов. Каждый сгенерированный вариант должен содержать примерно столько же символов.

Return exactly 3 wrong but plausible answers matching the structure and length of the correct answer.
Return only the JSON: {"options": ["неверный 1", "неверный 2", "неверный 3"]}`,
  },

  bug: {
    system: () => `You write buggy code puzzles for developer interviews. You MUST respond with ONLY a valid JSON object. No text before or after. No markdown fences.
Required format: {"code":"...","bug":"short phrase","options":["correct","wrong1","wrong2","wrong3"]}
Rules: options[0] must exactly match the bug field. Keep code under 8 lines. Use \\n for newlines in code.`,
    user: (lang, q, topic) => {
      return `Ответь ТОЛЬКО на русском языке. Весь текст, код и варианты должны быть на русском.
Write a ${lang} bug hunting exercise about: ${topic}.
\nSteps:
1. Write 4-8 lines of ${lang} code that has exactly ONE subtle bug.
2. Describe the bug in a short phrase (5-10 words) НА РУССКОМ.
3. Write 3 WRONG but plausible-sounding bug descriptions НА РУССКОМ.
\nReturn ONLY this JSON (no other text):
{"code":"line1\\nline2\\nline3","bug":"реальное описание бага","options":["реальное описание бага","неверный вариант 1","неверный вариант 2","неверный вариант 3"]}`;
    },
  },

  blitz: {
    system: () => jsonSystem({
      statement: "string — one factual claim about the topic",
      isCorrect: "boolean — true if the statement is correct, false if it contains a deliberate error",
    }),
    user: (lang, q, topic) =>
      `Ответь ТОЛЬКО на русском языке. Все тексты должны быть на русском.
Language: ${lang}, Topic: ${topic}
Context: ${q}

Write ONE statement about ${lang} that is either true or false (50% chance each). Текст должен быть НА РУССКОМ.
Return JSON in this exact format:
{"statement": "ArrayList в Java синхронизирован по умолчанию", "isCorrect": false}

Return only the JSON.`,
  },

  code: {
    system: () => jsonSystem({
      snippet: "string — code with exactly one ___ placeholder for the missing part",
      correctPart: "string — the correct replacement for ___",
      options: ["correct replacement", "wrong option 1", "wrong option 2", "wrong option 3"],
    }),
    user: (lang, q, topic) =>
      `Ответь ТОЛЬКО на русском языке. Код и варианты должны быть на русском.
Language: ${lang}, Topic: ${topic}
Context: ${q}

Write a short ${lang} code snippet with exactly ONE blank marked as ___ where a keyword or expression is missing.
Return JSON in this exact format:
{
  "snippet": "List<String> list = new ___<>();\\nlist.add(\\"hello\\");",
  "correctPart": "ArrayList",
  "options": ["ArrayList", "LinkedList", "HashMap", "TreeSet"]
}

The first element of options must be the correct answer (matching correctPart exactly).
Return only the JSON.`,
  },

  interview: {
    system: () => jsonSystem({
      score: "number 1-10",
      feedback: "string — what was good and what was missing",
      correctVersion: "string — ideal complete answer",
    }),
    user: (lang, q, answer) =>
      `Ответь ТОЛЬКО на русском языке. Весь текст оценки должен быть на русском.
Language: ${lang}
Interview question: ${q}
Candidate's answer: ${answer}

Evaluate the answer. Return JSON in this exact format:
{
  "score": 7,
  "feedback": "Хорошо упомянул O(1) поиск. Не упомянул вопросы потокобезопасности и коэффициент загрузки.",
  "correctVersion": "HashMap обеспечивает среднюю сложность O(1) для get/put с использованием хеширования. Не потокобезопасен. Используйте ConcurrentHashMap для конкурентного доступа."
}

Return only the JSON.`,
  },

  system_design: {
    system: () => `You are a senior system design interviewer at FAANG. ВСЕГДА отвечай ТОЛЬКО на русском языке. Evaluate the candidate's answer. Respond with ONLY a valid JSON object — no markdown, no prose, no code fences.
Required format: {
  "score": 0-100,
  "strengths": ["string"],
  "weaknesses": ["string"],
  "missingComponents": ["string"],
  "suggestedArchitecture": "string",
  "followUpQuestion": "string"
}`,
    user: (topic, answer) =>
      `Ответь ТОЛЬКО на русском языке. Весь текст оценки и архитектуры должен быть на русском.
Topic: ${topic.title}
Requirements: ${(topic.requirements || []).join(', ')}
Constraints: ${(topic.constraints || []).join(', ')}
Expected components: ${(topic.expected_components || []).join(', ')}

Candidate's answer: ${answer}

Evaluate this system design answer. Return only the JSON.`,
  },

  resume: {
    system: () => jsonSystem({
      experienceLevel: "string — Junior, Middle, Senior, or Unknown",
      skills: ["string — relevant technical skill"],
      strengths: ["string — concrete resume strength"],
      improvementAreas: ["string — concrete improvement area"],
      suggestedQuestions: ["string — specific question text to ask"],
      score: "number (0-100)",
      sections: {
        summary: { score: "number", feedback: "string" },
        experience: { score: "number", feedback: "string" },
        skills: { score: "number", feedback: "string", missing: ["string"] },
        education: { score: "number", feedback: "string" }
      },
      topIssues: ["string"],
      topStrengths: ["string"],
    }),
    user: (lang, text) =>
      `Ответь ТОЛЬКО на русском языке. Весь анализ, вопросы и текст должны быть на русском.
Programming language focus: ${lang}
Resume text: ${text.substring(0, 1500)}

Analyze this resume and provide a structured scoring rubric. Return JSON in this exact format:
{
  "experienceLevel": "Middle",
  "skills": ["Java", "Spring Boot", "PostgreSQL"],
  "strengths": ["Четкая техническая направленность", "Сильный бэкенд-опыт"],
  "improvementAreas": ["Добавь измеримые достижения", "Проясни опыт тестирования"],
  "suggestedQuestions": ["Как оптимизировать время запуска Spring Boot?", "Объясни оптимистическую и пессимистическую блокировку."],
  "score": 85,
  "sections": {
    "summary": { "score": 90, "feedback": "Кратко и профессионально." },
    "experience": { "score": 80, "feedback": "Хорошая прогрессия, но отсутствуют метрики." },
    "skills": { "score": 85, "feedback": "Релевантный стек.", "missing": ["Docker", "Kubernetes"] },
    "education": { "score": 100, "feedback": "Степень в релевантной области." }
  },
  "topIssues": ["Нет количественных достижений", "Отсутствуют навыки облачной оркестрации"],
  "topStrengths": ["Четкая техническая направленность", "Длительный стаж на предыдущих позициях"],
  "recommendedQuestions": ["Spring", "Многопоточность"]
}

Return only the JSON.`,
  },

  resumePractice: {
    system: () => jsonSystem({
      questions: ["string — specific interview question tailored to gaps"]
    }),
    user: (lang, data) =>
      `Ответь ТОЛЬКО на русском языке. Все вопросы должны быть на русском.
Programming language focus: ${lang}
Resume analysis data: ${typeof data === 'string' ? data : JSON.stringify(data)}

Based on this resume analysis, generate 5 specific interview questions that target the user's identified skill gaps and improvement areas. Focus on questions that would help the user strengthen their weakest areas. Return JSON in this exact format:
{
  "questions": [
    "Объясни, как работает сборка мусора в Java и когда требуется настройка.",
    "Опиши разницу между abstract и interface в Go."
  ]
}

Return only the JSON.`,
  },

  vacancy: {
    system: () => jsonSystem({
      questions: ["string — interview question about the vacancy"],
      suggestedTopTopics: ["string — top topics to study for this vacancy"]
    }),
    user: (lang, vacancyText) =>
      `Ответь ТОЛЬКО на русском языке. Все вопросы и темы должны быть на русском.
Programming language focus: ${lang}
Vacancy description: ${vacancyText.substring(0, 2000)}

Analyze this job vacancy and generate 8 interview questions that would be asked for this role. Include questions that cover both core concepts and practical skills mentioned in the vacancy. Also identify the top topics the candidate should study. Return JSON in this exact format:
{
  "questions": [
    "Объясни, как обрабатывать конкурентность в контексте этой роли.",
    "Какие шаблоны проектирования наиболее релевантны для создания масштабируемых микросервисов?"
  ],
  "suggestedTopTopics": ["Конкурентность", "Архитектура микросервисов"]
}

Return only the JSON.`,
  },
};

// ─── Language definitions ──────────────────────────────────────────────
export const LANGUAGES = {
  Java: {
    id: 'Java', name: 'Java',
    categories: ['Java Core', 'Collections', 'Multithreading', 'Spring', 'JVM', 'Exceptions', 'OOP', 'Stream API', 'Design Patterns', 'Database', 'Testing', 'Microservices', 'Security'],
    prompts: {
      explanation: (q, a) => ({ system: PROMPTS.explanation.system(), user: PROMPTS.explanation.user('Java', q, a) }),
      test: (q, a) => ({ system: PROMPTS.test.system(), user: PROMPTS.test.user('Java', q, a) }),
      bug: (q, t) => ({ system: PROMPTS.bug.system(), user: PROMPTS.bug.user('Java', q, t) }),
      blitz: (q, t) => ({ system: PROMPTS.blitz.system(), user: PROMPTS.blitz.user('Java', q, t) }),
      code: (q, t) => ({ system: PROMPTS.code.system(), user: PROMPTS.code.user('Java', q, t) }),
      interview: (q, a) => ({ system: PROMPTS.interview.system(), user: PROMPTS.interview.user('Java', q, a) }),
      resume: (t) => ({ system: PROMPTS.resume.system(), user: PROMPTS.resume.user('Java', t) }),
    },
    codeLanguage: 'java',
    systemPrompt: 'You are an expert Java mentor. Explain clearly. ВСЕГДА отвечай ТОЛЬКО на русском языке. Никаких английских слов в ответах. Все примеры, варианты и тексты должны быть на русском.',
  },
  Python: {
    id: 'Python', name: 'Python',
    categories: ['Python Core', 'Data Structures', 'OOP', 'Concurrency', 'Django', 'Flask', 'FastAPI', 'Testing', 'Decorators', 'Generators', 'Type Hints', 'Async/Await', 'Design Patterns', 'Database'],
    prompts: {
      explanation: (q, a) => ({ system: PROMPTS.explanation.system(), user: PROMPTS.explanation.user('Python', q, a) }),
      test: (q, a) => ({ system: PROMPTS.test.system(), user: PROMPTS.test.user('Python', q, a) }),
      bug: (q, t) => ({ system: PROMPTS.bug.system(), user: PROMPTS.bug.user('Python', q, t) }),
      blitz: (q, t) => ({ system: PROMPTS.blitz.system(), user: PROMPTS.blitz.user('Python', q, t) }),
      code: (q, t) => ({ system: PROMPTS.code.system(), user: PROMPTS.code.user('Python', q, t) }),
      interview: (q, a) => ({ system: PROMPTS.interview.system(), user: PROMPTS.interview.user('Python', q, a) }),
      resume: (t) => ({ system: PROMPTS.resume.system(), user: PROMPTS.resume.user('Python', t) }),
    },
    codeLanguage: 'python',
    systemPrompt: 'You are an expert Python mentor. Explain clearly. ВСЕГДА отвечай ТОЛЬКО на русском языке. Никаких английских слов в ответах. Все примеры, варианты и тексты должны быть на русском.',
  },
  TypeScript: {
    id: 'TypeScript', name: 'TypeScript',
    categories: ['TypeScript Core', 'Type System', 'Generics', 'Decorators', 'React', 'Node.js', 'NestJS', 'OOP', 'Async/Await', 'Testing', 'Design Patterns', 'Modules'],
    prompts: {
      explanation: (q, a) => ({ system: PROMPTS.explanation.system(), user: PROMPTS.explanation.user('TypeScript', q, a) }),
      test: (q, a) => ({ system: PROMPTS.test.system(), user: PROMPTS.test.user('TypeScript', q, a) }),
      bug: (q, t) => ({ system: PROMPTS.bug.system(), user: PROMPTS.bug.user('TypeScript', q, t) }),
      blitz: (q, t) => ({ system: PROMPTS.blitz.system(), user: PROMPTS.blitz.user('TypeScript', q, t) }),
      code: (q, t) => ({ system: PROMPTS.code.system(), user: PROMPTS.code.user('TypeScript', q, t) }),
      interview: (q, a) => ({ system: PROMPTS.interview.system(), user: PROMPTS.interview.user('TypeScript', q, a) }),
      resume: (t) => ({ system: PROMPTS.resume.system(), user: PROMPTS.resume.user('TypeScript', t) }),
    },
    codeLanguage: 'typescript',
    systemPrompt: 'You are an expert TypeScript mentor. Explain clearly. ВСЕГДА отвечай ТОЛЬКО на русском языке. Никаких английских слов в ответах. Все примеры, варианты и тексты должны быть на русском.',
  },
  Go: {
    id: 'Go', name: 'Go',
    categories: ['Go Core', 'Concurrency', 'Goroutines', 'Channels', 'Interfaces', 'Packages', 'Testing', 'Web (net/http)', 'Middleware', 'ORM (GORM)', 'Design Patterns', 'Database'],
    prompts: {
      explanation: (q, a) => ({ system: PROMPTS.explanation.system(), user: PROMPTS.explanation.user('Go', q, a) }),
      test: (q, a) => ({ system: PROMPTS.test.system(), user: PROMPTS.test.user('Go', q, a) }),
      bug: (q, t) => ({ system: PROMPTS.bug.system(), user: PROMPTS.bug.user('Go', q, t) }),
      blitz: (q, t) => ({ system: PROMPTS.blitz.system(), user: PROMPTS.blitz.user('Go', q, t) }),
      code: (q, t) => ({ system: PROMPTS.code.system(), user: PROMPTS.code.user('Go', q, t) }),
      interview: (q, a) => ({ system: PROMPTS.interview.system(), user: PROMPTS.interview.user('Go', q, a) }),
      resume: (t) => ({ system: PROMPTS.resume.system(), user: PROMPTS.resume.user('Go', t) }),
    },
    codeLanguage: 'go',
    systemPrompt: 'You are an expert Go mentor. Explain clearly. ВСЕГДА отвечай ТОЛЬКО на русском языке. Никаких английских слов в ответах. Все примеры, варианты и тексты должны быть на русском.',
  },
  Rust: {
    id: 'Rust', name: 'Rust',
    categories: ['Rust Core', 'Ownership', 'Borrowing', 'Lifetimes', 'Traits', 'Enums', 'Pattern Matching', 'Async/Await', 'Unsafe', 'Cargo', 'Testing', 'Web (Actix/Axum)', 'Design Patterns'],
    prompts: {
      explanation: (q, a) => ({ system: PROMPTS.explanation.system(), user: PROMPTS.explanation.user('Rust', q, a) }),
      test: (q, a) => ({ system: PROMPTS.test.system(), user: PROMPTS.test.user('Rust', q, a) }),
      bug: (q, t) => ({ system: PROMPTS.bug.system(), user: PROMPTS.bug.user('Rust', q, t) }),
      blitz: (q, t) => ({ system: PROMPTS.blitz.system(), user: PROMPTS.blitz.user('Rust', q, t) }),
      code: (q, t) => ({ system: PROMPTS.code.system(), user: PROMPTS.code.user('Rust', q, t) }),
      interview: (q, a) => ({ system: PROMPTS.interview.system(), user: PROMPTS.interview.user('Rust', q, a) }),
      resume: (t) => ({ system: PROMPTS.resume.system(), user: PROMPTS.resume.user('Rust', t) }),
    },
    codeLanguage: 'rust',
    systemPrompt: 'You are an expert Rust mentor. Explain clearly. ВСЕГДА отвечай ТОЛЬКО на русском языке. Никаких английских слов в ответах. Все примеры, варианты и тексты должны быть на русском.',
  },
  React: {
    id: 'React', name: 'React',
    categories: ['React Core', 'Hooks', 'State Management', 'Context API', 'Redux', 'TypeScript', 'Next.js', 'Testing (RTL)', 'Performance', 'Design Patterns', 'Server Components', 'React Native'],
    prompts: {
      explanation: (q, a) => ({ system: PROMPTS.explanation.system(), user: PROMPTS.explanation.user('React', q, a) }),
      test: (q, a) => ({ system: PROMPTS.test.system(), user: PROMPTS.test.user('React', q, a) }),
      bug: (q, t) => ({ system: PROMPTS.bug.system(), user: PROMPTS.bug.user('React', q, t) }),
      blitz: (q, t) => ({ system: PROMPTS.blitz.system(), user: PROMPTS.blitz.user('React', q, t) }),
      code: (q, t) => ({ system: PROMPTS.code.system(), user: PROMPTS.code.user('React', q, t) }),
      interview: (q, a) => ({ system: PROMPTS.interview.system(), user: PROMPTS.interview.user('React', q, a) }),
      resume: (t) => ({ system: PROMPTS.resume.system(), user: PROMPTS.resume.user('React', t) }),
    },
    codeLanguage: 'javascript',
    systemPrompt: 'You are an expert React mentor. Explain clearly. ВСЕГДА отвечай ТОЛЬКО на русском языке. Никаких английских слов в ответах. Все примеры, варианты и тексты должны быть на русском.',
  },
  Kotlin: {
    id: 'Kotlin', name: 'Kotlin',
    categories: ['Kotlin Core', 'Coroutines', 'Null Safety', 'DSL', 'Android', 'Spring Boot', 'Ktor', 'Multiplatform', 'Testing', 'Design Patterns', 'Extension Functions', 'Sealed Classes'],
    prompts: {
      explanation: (q, a) => ({ system: PROMPTS.explanation.system(), user: PROMPTS.explanation.user('Kotlin', q, a) }),
      test: (q, a) => ({ system: PROMPTS.test.system(), user: PROMPTS.test.user('Kotlin', q, a) }),
      bug: (q, t) => ({ system: PROMPTS.bug.system(), user: PROMPTS.bug.user('Kotlin', q, t) }),
      blitz: (q, t) => ({ system: PROMPTS.blitz.system(), user: PROMPTS.blitz.user('Kotlin', q, t) }),
      code: (q, t) => ({ system: PROMPTS.code.system(), user: PROMPTS.code.user('Kotlin', q, t) }),
      interview: (q, a) => ({ system: PROMPTS.interview.system(), user: PROMPTS.interview.user('Kotlin', q, a) }),
      resume: (t) => ({ system: PROMPTS.resume.system(), user: PROMPTS.resume.user('Kotlin', t) }),
    },
    codeLanguage: 'kotlin',
    systemPrompt: 'You are an expert Kotlin mentor. Explain clearly. ВСЕГДА отвечай ТОЛЬКО на русском языке. Никаких английских слов в ответах. Все примеры, варианты и тексты должны быть на русском.',
  },
};

// These prompts are language-independent, but the per-language registry is
// the single object consumed by aiService. Attach them once so every language
// supports the same resume and vacancy flows.
for (const language of Object.values(LANGUAGES)) {
  Object.defineProperties(language.prompts, {
    resumePractice: {
      enumerable: false,
      value: (data) => ({
        system: PROMPTS.resumePractice.system(),
        user: PROMPTS.resumePractice.user(language.id, data),
      }),
    },
    vacancy: {
      enumerable: false,
      value: (text) => ({
        system: PROMPTS.vacancy.system(),
        user: PROMPTS.vacancy.user(language.id, text),
      }),
    },
  });
}

export const getLanguage = (id) => LANGUAGES[id] || LANGUAGES.Java;
export const getAvailableLanguages = () => Object.keys(LANGUAGES);
export const getCategories = (id) => getLanguage(id).categories;
