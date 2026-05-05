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
    // Plain-text markdown — no JSON. Immune to token-limit truncation that breaks JSON.
    system: () => `You are a senior software engineer and teacher. Respond ONLY in plain text using the exact markdown template below. Do NOT use JSON. Do NOT add any text before or after the template.`,
    user: (lang, q, a) => {
      const codeLang = lang.toLowerCase();
      return `Language: ${lang}\nQuestion: ${q}\nShort answer: ${a}\n\nFill in this exact template:\n\n## [Topic name]\n\n[Explanation in 2-3 clear sentences.]\n\n**Применяется:** [2-3 real-world cases]\n\n**Пример:**\n\`\`\`${codeLang}\n[short code, 3-6 lines]\n\`\`\`\n\n**Главное:**\n- [point 1]\n- [point 2]\n- [point 3]`;
    },
  },

  test: {
    system: () => jsonSystem({
      options: ["wrong option 1", "wrong option 2", "wrong option 3"],
    }),
    user: (lang, q, correct) =>
      `Language: ${lang}
Question: ${q}
Correct answer: ${correct}

Generate exactly 3 WRONG but plausible distractor answers. Example format:
{"options": ["ArrayList is thread-safe", "LinkedList has O(1) random access", "Vector is deprecated"]}

Now generate 3 wrong answers for the question above. Return only the JSON.`,
  },

  bug: {
    system: () => jsonSystem({
      code: "string — code snippet with exactly one bug, use \\n for newlines",
      bug: "string — the correct answer (what the bug is, short phrase)",
      options: ["correct bug description", "wrong option 1", "wrong option 2", "wrong option 3"],
    }),
    user: (lang, q, topic) =>
      `Language: ${lang}, Topic: ${topic}
Context: ${q}

Write a ${lang} code snippet with exactly ONE bug. Return JSON in this exact format:
{
  "code": "public int sum(int a, int b) {\\n    return a - b;\\n}",
  "bug": "subtraction instead of addition",
  "options": ["subtraction instead of addition", "missing return type", "wrong parameter names", "null pointer risk"]
}

The first element of options must be the correct answer (matching the bug field exactly).
Return only the JSON object.`,
  },

  blitz: {
    system: () => jsonSystem({
      statement: "string — one factual claim about the topic",
      isCorrect: "boolean — true if the statement is correct, false if it contains a deliberate error",
    }),
    user: (lang, q, topic) =>
      `Language: ${lang}, Topic: ${topic}
Context: ${q}

Write ONE statement about ${lang} that is either true or false (50% chance each).
Return JSON in this exact format:
{"statement": "ArrayList in Java is synchronized by default", "isCorrect": false}

Return only the JSON.`,
  },

  code: {
    system: () => jsonSystem({
      snippet: "string — code with exactly one ___ placeholder for the missing part",
      correctPart: "string — the correct replacement for ___",
      options: ["correct replacement", "wrong option 1", "wrong option 2", "wrong option 3"],
    }),
    user: (lang, q, topic) =>
      `Language: ${lang}, Topic: ${topic}
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
      `Language: ${lang}
Interview question: ${q}
Candidate's answer: ${answer}

Evaluate the answer. Return JSON in this exact format:
{
  "score": 7,
  "feedback": "Good mention of O(1) lookup. Missed thread-safety implications and load factor.",
  "correctVersion": "HashMap provides O(1) average for get/put using hashing. Not thread-safe. Use ConcurrentHashMap for concurrent access."
}

Return only the JSON.`,
  },

  resume: {
    system: () => jsonSystem({
      skills: ["string"],
      experienceLevel: "Junior|Middle|Senior",
      strengths: ["string"],
      improvementAreas: ["string"],
      suggestedQuestions: ["string — interview question to ask this candidate"],
    }),
    user: (lang, text) =>
      `Programming language focus: ${lang}
Resume text: ${text.substring(0, 1500)}

Analyze this resume. Return JSON in this exact format:
{
  "skills": ["Java", "Spring Boot", "PostgreSQL"],
  "experienceLevel": "Middle",
  "strengths": ["Strong OOP knowledge", "Production Spring experience"],
  "improvementAreas": ["No cloud experience", "Limited testing coverage"],
  "suggestedQuestions": ["Explain Spring bean lifecycle", "How do you handle N+1 queries?"]
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
    systemPrompt: 'You are an expert Java mentor. Explain clearly. Use Russian language.',
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
    systemPrompt: 'You are an expert Python mentor. Explain clearly. Use Russian language.',
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
    systemPrompt: 'You are an expert TypeScript mentor. Explain clearly. Use Russian language.',
  },
};

export const getLanguage = (id) => LANGUAGES[id] || LANGUAGES.Java;
export const getAvailableLanguages = () => Object.keys(LANGUAGES);
export const getCategories = (id) => getLanguage(id).categories;