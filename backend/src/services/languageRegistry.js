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
      `Language: ${lang}
Question: ${q}
Short answer: ${a}

Respond with a JSON explanation. Example of the exact format:
{
  "title": "HashMap vs TreeMap",
  "theory": "HashMap stores key-value pairs in a hash table with O(1) average lookup. TreeMap uses a red-black tree with O(log n) lookup but keeps keys sorted.",
  "where_used": ["HashMap: caching, frequency counting", "TreeMap: range queries, sorted iteration"],
  "code_example": "Map<String, Integer> map = new HashMap<>();\\nmap.put(\\"a\\", 1);",
  "key_points": ["HashMap is faster", "TreeMap is sorted", "Neither is thread-safe"]
}`,
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
    system: () => `You write buggy code puzzles for developer interviews. You MUST respond with ONLY a valid JSON object. No text before or after. No markdown fences.
Required format: {"code":"...","bug":"short phrase","options":["correct","wrong1","wrong2","wrong3"]}
Rules: options[0] must exactly match the bug field. Keep code under 8 lines. Use \\n for newlines in code.`,
    user: (lang, q, topic) => {
      return `Write a ${lang} bug hunting exercise about: ${topic}.
\nSteps:
1. Write 4-8 lines of ${lang} code that has exactly ONE subtle bug.
2. Describe the bug in a short phrase (5-10 words).
3. Write 3 WRONG but plausible-sounding bug descriptions.
\nReturn ONLY this JSON (no other text):
{"code":"line1\\nline2\\nline3","bug":"the real bug description","options":["the real bug description","plausible wrong 1","plausible wrong 2","plausible wrong 3"]}`;
    },
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
      score: "number (0-100)",
      sections: {
        summary: { score: "number", feedback: "string" },
        experience: { score: "number", feedback: "string" },
        skills: { score: "number", feedback: "string", missing: ["string"] },
        education: { score: "number", feedback: "string" }
      },
      topIssues: ["string"],
      topStrengths: ["string"],
      suggestedQuestions: ["string — specific question text to ask"]
    }),
    user: (lang, text) =>
      `Programming language focus: ${lang}
Resume text: ${text.substring(0, 1500)}

Analyze this resume and provide a structured scoring rubric. Return JSON in this exact format:
{
  "score": 85,
  "sections": {
    "summary": { "score": 90, "feedback": "Concise and professional." },
    "experience": { "score": 80, "feedback": "Good progression, but metrics are missing." },
    "skills": { "score": 85, "feedback": "Relevant stack.", "missing": ["Docker", "Kubernetes"] },
    "education": { "score": 100, "feedback": "Degree is in a relevant field." }
  },
  "topIssues": ["No quantitative achievements", "Missing cloud orchestration skills"],
  "topStrengths": ["Clear technical focus", "Strong tenure at previous roles"],
  "recommendedQuestions": ["Spring", "Multithreading"],
  "suggestedQuestions": ["How do you optimize Spring Boot startup time?", "Explain the difference between optimistic and pessimistic locking."]
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