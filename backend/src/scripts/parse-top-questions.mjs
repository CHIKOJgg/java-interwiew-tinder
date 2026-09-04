/**
 * parse-top-questions.mjs
 * 
 * Fetches and parses top interview questions from authoritative open-source repositories:
 * - sudheerj/java-interview-questions (Java Top Q&A)
 * - enhorse/java-interview (Java RU Top Q&A)
 * - sudheerj/javascript-interview-questions (JavaScript Top Q&A)
 * - Curated Python Top Q&A
 *
 * Saves structured questions to `data/top-questions.json` and optionally
 * upserts into PostgreSQL with `is_top = TRUE` and `top_rank`.
 *
 * Usage:
 *   node src/scripts/parse-top-questions.mjs [--file-only] [--apply]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../../data');
const OUTPUT_FILE = path.join(DATA_DIR, 'top-questions.json');

// Source URLs
const SOURCES = [
  {
    name: 'sudheerj-java',
    language: 'Java',
    category: 'Core Java',
    url: 'https://raw.githubusercontent.com/sudheerj/java-interview-questions/master/README.md',
    parser: 'numbered_h3',
  },
  {
    name: 'enhorse-java-ru',
    language: 'Java',
    category: 'Java Core',
    url: 'https://raw.githubusercontent.com/enhorse/java-interview/master/core.md',
    parser: 'enhorse_h2',
  },
  {
    name: 'sudheerj-js',
    language: 'JavaScript',
    category: 'JavaScript Core',
    url: 'https://raw.githubusercontent.com/sudheerj/javascript-interview-questions/master/README.md',
    parser: 'numbered_h3',
  },
];

// Curated high-yield questions used as offline fallbacks and baseline top ranks
const CURATED_TOP_QUESTIONS = [
  {
    question_text: 'What are the key differences between JVM, JRE, and JDK?',
    short_answer: 'JDK is the full development kit with compiler; JRE provides the runtime environment and core libraries; JVM executes Java bytecode.',
    category: 'Java Architecture',
    difficulty: 'Junior',
    language: 'Java',
    top_rank: 1,
    options: [
      'JDK contains compiler and tools; JRE contains JVM and runtime libraries; JVM executes bytecode',
      'JVM compiles code, JRE executes code, JDK is only for documentation',
      'JRE contains JDK which runs directly on hardware without JVM',
      'JVM and JRE are identical; JDK is only needed for JavaFX'
    ]
  },
  {
    question_text: 'Why is String immutable in Java?',
    short_answer: 'For security, String pool caching, hashcode caching for HashMaps, and thread-safety across concurrent operations.',
    category: 'Java Core',
    difficulty: 'Junior',
    language: 'Java',
    top_rank: 2,
    options: [
      'For security, String pool caching, hashcode caching, and thread safety',
      'Because JVM cannot reallocate heap memory for strings',
      'To prevent garbage collector from deleting long strings',
      'Because strings in Java are stored on the execution stack only'
    ]
  },
  {
    question_text: 'What is the contract between equals() and hashCode()?',
    short_answer: 'If two objects are equal according to equals(), they must return the same hashCode(). If hashCodes are equal, objects are not necessarily equal.',
    category: 'Object Oriented Programming',
    difficulty: 'Middle',
    language: 'Java',
    top_rank: 3,
    options: [
      'Equal objects must have identical hashCodes; identical hashCodes do not guarantee equality',
      'Different objects must always have different hashCodes',
      'hashCode is used for sorting and equals is used only for memory deallocation',
      'If equals returns true, hashCode must return 0'
    ]
  },
  {
    question_text: 'How does HashMap work internally in Java 8+?',
    short_answer: 'Uses an array of Node buckets (hash modulo capacity). Collisions form a linked list, transforming into a red-black tree when bucket length exceeds 8.',
    category: 'Collections',
    difficulty: 'Middle',
    language: 'Java',
    top_rank: 4,
    options: [
      'Array of buckets using linked lists, transforming into red-black trees when bucket size >= 8',
      'A continuous array shifted linearly on every collision (open addressing)',
      'A balanced B-Tree persisted to JVM heap storage',
      'A single synchronized LinkedList protected by a global mutex'
    ]
  },
  {
    question_text: 'What is the difference between ArrayList and LinkedList?',
    short_answer: 'ArrayList uses a dynamic resizable array with O(1) random access; LinkedList uses a doubly linked list with O(n) traversal and O(1) insertion at pointer.',
    category: 'Collections',
    difficulty: 'Junior',
    language: 'Java',
    top_rank: 5,
    options: [
      'ArrayList provides O(1) indexed access; LinkedList provides O(1) insertion/deletion at known node with higher memory overhead',
      'ArrayList is synchronized by default, LinkedList is asynchronous',
      'LinkedList stores primitive types only, ArrayList stores objects',
      'ArrayList cannot grow after creation, LinkedList has no size limit'
    ]
  },
  {
    question_text: 'What is the difference between final, finally, and finalize()?',
    short_answer: 'final is a modifier (constants, non-extensible classes/methods); finally is a try-catch block that always executes; finalize() was a deprecated GC cleanup method.',
    category: 'Java Core',
    difficulty: 'Junior',
    language: 'Java',
    top_rank: 6,
    options: [
      'final is a keyword modifier; finally is an execution block; finalize() was a Garbage Collector callback',
      'They are aliases for the same memory deallocation routine',
      'finally declares constants, final handles exceptions, finalize starts threads',
      'final is used only for primitive data types'
    ]
  },
  {
    question_text: 'What causes a deadlock and how can it be prevented?',
    short_answer: 'Mutual exclusion, hold and wait, no preemption, and circular wait. Prevented by locking resources in a global fixed order and using timed tryLock.',
    category: 'Concurrency',
    difficulty: 'Senior',
    language: 'Java',
    top_rank: 7,
    options: [
      'Circular wait on locks; prevented by consistent lock ordering and using tryLock with timeouts',
      'Excessive garbage collection pause times; prevented by increasing heap size',
      'Stack overflow in recursive calls; prevented by iterative refactoring',
      'CPU core starvation; prevented by increasing thread pool size'
    ]
  },
  {
    question_text: 'В чем разница между ArrayList и LinkedList в Java?',
    short_answer: 'ArrayList основан на динамическом массиве с быстрым доступом по индексу O(1). LinkedList — двусвязный список с быстрым добавлением O(1) в начало/конец, но медленным поиском O(n).',
    category: 'Collections',
    difficulty: 'Junior',
    language: 'Java',
    top_rank: 8,
    options: [
      'ArrayList использует динамический массив (O(1) по индексу), LinkedList — двусвязный список с указателями',
      'ArrayList синхронизирован, LinkedList потоконебезопасен',
      'LinkedList хранит только примитивы, ArrayList только объекты',
      'ArrayList выделяет память в стеке, LinkedList в куче'
    ]
  },
  {
    question_text: 'Как устроен и работает HashMap внутри?',
    short_answer: 'Массив корзин (buckets) на основе хешкода ключа. При коллизиях используется связный список, при превышении 8 элементов — красно-чёрное дерево.',
    category: 'Collections',
    difficulty: 'Middle',
    language: 'Java',
    top_rank: 9,
    options: [
      'Массив корзин (хеш по модулю длины), связный список при коллизиях, переходящий в красно-черное дерево при >= 8 узлах',
      'Двоичное дерево поиска с автоматической балансировкой AVL',
      'Один непрерывный массив с линейным пробированием при коллизиях',
      'Хеш-таблица на диске с кэшированием в оперативной памяти'
    ]
  },
  {
    question_text: 'Что такое volatile и какие гарантии оно дает?',
    short_answer: 'Гарантирует видимость изменений переменной между потоками (чтение/запись прямо в основную память без кэша ядра) и запрещает reordering инструкций.',
    category: 'Concurrency',
    difficulty: 'Senior',
    language: 'Java',
    top_rank: 10,
    options: [
      'Гарантирует видимость изменений всеми потоками и упорядоченность (happens-before), но не атомарность сложных операций',
      'Обеспечивает полную атомарность инкремента i++ и блокировку потоков',
      'Запрещает изменение переменной после инициализации (аналог final)',
      'Сохраняет переменную в энергонезависимую память'
    ]
  },
  {
    question_text: 'How does the Python Global Interpreter Lock (GIL) work?',
    short_answer: 'The GIL is a mutex that protects Python objects, allowing only one native thread to execute Python bytecode at a time in CPython.',
    category: 'Python Internals',
    difficulty: 'Middle',
    language: 'Python',
    top_rank: 1,
    options: [
      'A mutex in CPython allowing only one thread to execute Python bytecode at a time',
      'A hardware lock preventing memory leaks across CPU sockets',
      'A compiler optimization that converts Python scripts to C binaries',
      'A garbage collection mechanism that pauses all background tasks'
    ]
  },
  {
    question_text: 'What is the difference between list and tuple in Python?',
    short_answer: 'Lists are mutable (can append, remove, reorder) with higher memory overhead. Tuples are immutable, hashable (can be dict keys), and faster.',
    category: 'Data Structures',
    difficulty: 'Junior',
    language: 'Python',
    top_rank: 2,
    options: [
      'Lists are mutable; tuples are immutable and hashable',
      'Lists store strings only; tuples store numbers',
      'Tuples can change size dynamically while lists cannot',
      'There is no difference, tuple is just deprecated syntax'
    ]
  },
  {
    question_text: 'What is the Event Loop in JavaScript and how does it handle async tasks?',
    short_answer: 'Monitors the Call Stack and Task Queue. When the stack is empty, it processes Microtasks (Promises) first, then Macrotasks (setTimeout, I/O).',
    category: 'Asynchronous JS',
    difficulty: 'Middle',
    language: 'JavaScript',
    top_rank: 1,
    options: [
      'Executes synchronous code on Call Stack, drains Microtask Queue (Promises), then processes Task Queue (timers, events)',
      'Spawns multi-threaded worker pools for every async function call',
      'Pauses JavaScript execution until browser network requests finish',
      'Replaces the browser DOM engine with a background Node runtime'
    ]
  },
  {
    question_text: 'What is closure in JavaScript and where is it used?',
    short_answer: 'A closure is the combination of a function bundled together with references to its surrounding state (lexical environment), enabling data privacy.',
    category: 'JavaScript Core',
    difficulty: 'Junior',
    language: 'JavaScript',
    top_rank: 2,
    options: [
      'A function bundled with its lexical environment, allowing access to an outer scope even after it has returned',
      'A syntax error caused by unclosed curly braces in blocks',
      'An automated garbage collection cleanup cycle',
      'A method to immediately terminate long-running loops'
    ]
  }
];

function cleanMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // remove links
    .replace(/`([^`]+)`/g, '$1')             // unbacktick
    .replace(/\*\*([^*]+)\*\*/g, '$1')       // unbold
    .replace(/\*([^*]+)\*/g, '$1')           // unitalic
    .replace(/<[^>]+>/g, '')                 // remove html tags
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')    // remove images
    .replace(/\s+/g, ' ')
    .trim();
}

function extractShortAnswer(text) {
  const cleaned = cleanMarkdown(text);
  if (!cleaned) return '';
  // Take first 1 or 2 sentences up to 250 characters
  const sentences = cleaned.split(/(?<=[.?!])\s+/);
  let summary = sentences[0] || '';
  if (summary.length < 90 && sentences[1]) {
    summary += ' ' + sentences[1];
  }
  return summary.slice(0, 300).trim();
}

async function fetchWithTimeout(url, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'java-interview-tinder-parser/1.0' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function generateBalancedOptions(shortAnswer, title, language) {
  const correct = shortAnswer.length > 100 ? shortAnswer.slice(0, 95).replace(/[,;:]?\s+\S*$/, '') : shortAnswer;
  const targetLen = correct.length;
  const isRu = /[\u0400-\u04FF]/.test(title + shortAnswer);

  const ruDistractors = [
    `Альтернативное поведение виртуальной машины, зависящее от конфигурации JIT-компилятора и флагов оптимизации среды выполнения`,
    `Устаревшая спецификация платформы, полностью исключенная и замененная новыми механизмами в современных версиях языка`,
    `Конфигурация параметров виртуальной машины, требующая явной передачи флагов запуска при инициализации процесса`,
    `Поведение, определяемое на уровне структуры сборщика мусора и модели распределения страниц памяти между потоками`
  ];
  const enDistractors = [
    `Alternative runtime specification handled differently across specialized non-standard virtual machine vendor builds`,
    `Legacy platform behavior that was officially deprecated and completely superseded in recent stable language revisions`,
    `Runtime configuration parameter requiring explicit opt-in bootstrap flags passed during the application startup lifecycle`,
    `Behavior governed at the low-level garbage collector subsystem and underlying memory heap page allocation layout`
  ];

  const pool = isRu ? ruDistractors : enDistractors;
  // Natural distribution: d1 is longer than correct, d2 is shorter, d3 is close
  const multipliers = [1.14, 0.88, 1.05];
  const adjustLen = (text, mult) => {
    const desired = Math.max(30, Math.round(targetLen * mult));
    if (text.length > desired) {
      return text.slice(0, desired).replace(/[,;:]?\s+\S*$/, '');
    }
    const pad = isRu ? ` в рамках текущего контекста платформы` : ` within the active platform runtime context`;
    return (text + pad).slice(0, desired).replace(/[,;:]?\s+\S*$/, '');
  };

  return [
    correct,
    adjustLen(pool[0], multipliers[0]),
    adjustLen(pool[1], multipliers[1]),
    adjustLen(pool[2], multipliers[2])
  ];
}

function parseNumberedH3(content, language, category) {
  const questions = [];
  const regex = /\d+\.\s*###\s*([^\n]+)\n([\s\S]+?)(?=(\n\d+\.\s*###|\n\*\*\[⬆|\n##|$))/g;
  let match;
  let rank = 1;

  while ((match = regex.exec(content)) !== null && rank <= 40) {
    const rawTitle = match[1].trim();
    const rawAnswer = match[2].trim();
    const title = cleanMarkdown(rawTitle);
    const shortAnswer = extractShortAnswer(rawAnswer);

    if (title.length > 8 && shortAnswer.length > 15) {
      questions.push({
        question_text: title,
        short_answer: shortAnswer,
        category: category,
        difficulty: rank <= 12 ? 'Junior' : rank <= 28 ? 'Middle' : 'Senior',
        language,
        top_rank: rank++,
        is_top: true,
        options: generateBalancedOptions(shortAnswer, title, language)
      });
    }
  }
  return questions;
}

function parseEnhorseH2(content, language, category) {
  const questions = [];
  const regex = /##\s*([^\n]+)\n([\s\S]+?)(?=(\n##|\n\[к оглавлению|$))/g;
  let match;
  let rank = 1;

  while ((match = regex.exec(content)) !== null && rank <= 40) {
    const rawTitle = match[1].trim();
    const rawAnswer = match[2].trim();
    if (rawTitle.toLowerCase().includes('содержание') || rawTitle.toLowerCase().includes('оглавление')) continue;

    const title = cleanMarkdown(rawTitle);
    const shortAnswer = extractShortAnswer(rawAnswer);

    if (title.length > 8 && shortAnswer.length > 15) {
      questions.push({
        question_text: title,
        short_answer: shortAnswer,
        category: category,
        difficulty: rank <= 12 ? 'Junior' : rank <= 28 ? 'Middle' : 'Senior',
        language,
        top_rank: rank++,
        is_top: true,
        options: generateBalancedOptions(shortAnswer, title, language)
      });
    }
  }
  return questions;
}

export async function scrapeTopQuestions() {
  console.log('🚀 Starting Top Questions Scraper & Importer...');
  let modernQuestions = [];
  try {
    const modernPath = path.join(DATA_DIR, 'curated-modern-questions.json');
    if (fs.existsSync(modernPath)) {
      const raw = JSON.parse(fs.readFileSync(modernPath, 'utf-8'));
      modernQuestions = raw.map((q, idx) => ({
        question_text: q.question,
        short_answer: q.short_answer,
        category: q.category,
        framework: q.framework,
        topic: q.topic,
        difficulty: q.difficulty,
        language: q.language,
        options: q.options,
        top_rank: q.top_rank || (idx + 1),
        is_top: true,
        tags: ['top', 'modern', q.framework, q.topic].filter(Boolean),
      }));
      console.log(`   💎 Loaded ${modernQuestions.length} curated modern 2024-2026 questions`);
    }
  } catch (e) {
    console.warn('   ⚠️ Could not load curated modern questions:', e.message);
  }

  const allQuestions = [...modernQuestions, ...CURATED_TOP_QUESTIONS];

  for (const source of SOURCES) {
    try {
      console.log(`📡 Fetching source: ${source.name} (${source.url})...`);
      const rawText = await fetchWithTimeout(source.url);
      let parsed = [];
      if (source.parser === 'numbered_h3') {
        parsed = parseNumberedH3(rawText, source.language, source.category);
      } else if (source.parser === 'enhorse_h2') {
        parsed = parseEnhorseH2(rawText, source.language, source.category);
      }
      console.log(`   ✅ Extracted ${parsed.length} top questions from ${source.name}`);
      allQuestions.push(...parsed);
    } catch (err) {
      console.warn(`   ⚠️ Could not fetch live source ${source.name}: ${err.message}. Using curated questions.`);
    }
  }

  // Deduplicate by question_text + language
  const seen = new Set();
  const deduped = [];
  let rankCounter = 1;
  for (const q of allQuestions) {
    const key = `${q.language}:${q.question_text.toLowerCase().trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push({
        ...q,
        top_rank: rankCounter++,
        is_top: true,
        tags: Array.from(new Set(['top', ...(q.tags || [])])),
      });
    }
  }

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Save to JSON
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(deduped, null, 2), 'utf-8');
  console.log(`💾 Saved ${deduped.length} top questions to ${OUTPUT_FILE}`);

  return deduped;
}

export async function upsertToDatabase(questions) {
  let pool;
  try {
    const dbConfig = await import('../config/database.js');
    pool = dbConfig.default;
  } catch (e) {
    console.log('ℹ️ Database configuration not available or skipped:', e.message);
    return;
  }

  try {
    const client = await pool.connect();
    try {
      console.log(`🌱 Upserting ${questions.length} top questions into database...`);
      await client.query('BEGIN');
      let inserted = 0;

      for (const q of questions) {
        await client.query(
          `INSERT INTO questions (
            category, difficulty, question_text, short_answer, options,
            language, is_top, top_rank, tags, is_active
          )
          VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8, TRUE)
          ON CONFLICT (question_text, language)
          DO UPDATE SET
            is_top = TRUE,
            top_rank = COALESCE(EXCLUDED.top_rank, questions.top_rank),
            short_answer = COALESCE(EXCLUDED.short_answer, questions.short_answer),
            tags = array_append(COALESCE(questions.tags, '{}'), 'top')`,
          [
            q.category || 'Core',
            q.difficulty || 'Middle',
            q.question_text,
            q.short_answer,
            JSON.stringify(q.options || []),
            q.language || 'Java',
            q.top_rank || 999,
            q.tags || ['top']
          ]
        );
        inserted++;
      }

      await client.query('COMMIT');
      console.log(`✅ Successfully seeded/updated ${inserted} top questions in database!`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Database upsert error:', err.message);
    } finally {
      client.release();
    }
  } catch (err) {
    console.log('ℹ️ Skipping DB connection (offline/test mode):', err.message);
  }
}

// Direct CLI invocation
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const isFileOnly = process.argv.includes('--file-only');
  scrapeTopQuestions()
    .then(async (questions) => {
      if (!isFileOnly) {
        await upsertToDatabase(questions);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('Parser script fatal error:', err);
      process.exit(1);
    });
}
