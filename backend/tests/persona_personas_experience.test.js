import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../src/config/database.js', () => ({
  default: {
    query: vi.fn(),
    on: vi.fn(),
    connect: vi.fn().mockReturnValue({
      query: vi.fn(),
      release: vi.fn(),
    }),
  },
}));

vi.mock('../src/config/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

vi.mock('pino-http', () => ({
  default: vi.fn().mockReturnValue((req, res, next) => {
    req.log = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
    next();
  }),
}));

vi.mock('../src/config/redis.js', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    on: vi.fn(),
    keys: vi.fn(),
  },
  isConnected: vi.fn().mockReturnValue(true),
}));

vi.mock('../src/services/questionService.js', () => ({
  updateMastery: vi.fn(() => Promise.resolve({ ef: 2.5, interval: 1, reps: 0, nextReview: new Date() })),
  getDueCount: vi.fn(() => Promise.resolve(0)),
}));

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_experience_secret';

const { default: app } = await import('../src/server.js');
const { default: pool } = await import('../src/config/database.js');

describe('User Personas Deep Pipeline Audit (Student, Mid-Learner, Senior Expert)', () => {
  const JWT_SECRET = 'test_experience_secret';
  const STUDENT_ID = 'student_001';
  const MID_ID = 'mid_002';
  const SENIOR_ID = 'senior_003';

  let studentToken, midToken, seniorToken;

  beforeAll(() => {
    studentToken = jwt.sign({ userId: STUDENT_ID, plan: 'free' }, JWT_SECRET);
    midToken = jwt.sign({ userId: MID_ID, plan: 'free' }, JWT_SECRET);
    seniorToken = jwt.sign({ userId: SENIOR_ID, plan: 'pro' }, JWT_SECRET);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────
  // 1. Студент / Новичок (Student / Beginner)
  // ─────────────────────────────────────────────────────────────────
  describe('Persona: Студент / Новичок (Student / Beginner)', () => {
    it('pipeline: starts with low accuracy, makes mistakes, reviews them in history and mistakes deck', async () => {
      pool.query.mockImplementation(async (sql, params) => {
        const q = typeof sql === 'string' ? sql : sql.text;
        // User limits query for entitlement check (review mode allowed)
        if (q.includes('FROM users u') && q.includes('requests_per_day')) {
          return {
            rows: [{
              requests_per_day: 50,
              ai_generations_per_month: 20,
              resume_analysis_limit: 1,
              interview_eval_limit: 5,
              available_languages: ['Java', 'Python', 'TypeScript'],
              available_modes: ['swipe', 'test', 'review', 'bug-hunting', 'blitz'],
              model_priority: 'standard',
              requests_today: 0,
              ai_generations_this_month: 0,
              resume_analyses_this_month: 0,
              interview_evals_this_month: 0,
              daily_reset_at: null,
              monthly_reset_at: null,
            }],
          };
        }
        // User streak update
        if (q.includes('UPDATE users') || (q.includes('SELECT') && q.includes('current_streak'))) {
          return { rows: [{ telegram_id: STUDENT_ID, current_streak: 1, longest_streak: 1, last_active_at: new Date().toISOString() }] };
        }
        // User progress insert/upsert
        if (q.includes('INSERT INTO user_progress') || q.includes('ON CONFLICT (user_id, question_id)')) {
          return { rows: [{ user_id: STUDENT_ID, question_id: 101, status: 'unknown' }] };
        }
        // Stats by language breakdown
        if (q.includes('GROUP BY')) {
          return { rows: [{ language: 'Java', known_count: '0', unknown_count: '1', total_seen: '1' }] };
        }
        // Stats summary query
        if (q.includes('COUNT(*) FILTER') && q.includes('known_count')) {
          return { rows: [{ known_count: '0', unknown_count: '1', total_seen: '1' }] };
        }
        // Total questions count
        if (q.includes('COUNT(*)') && q.includes('FROM questions')) {
          return { rows: [{ count: '1', total: '150' }] };
        }
        // Stats answers list query
        if (q.includes('FROM user_progress up') && q.includes('JOIN questions q')) {
          return {
            rows: [{
              id: 101,
              question_text: 'What is the contract between equals() and hashCode()?',
              short_answer: 'If two objects are equal, their hashCode must be identical.',
              category: 'Core',
              difficulty: 'Junior',
              language: 'Java',
              framework: null,
              topic: 'Equals/HashCode',
              is_top: true,
              top_rank: 2,
              status: 'unknown',
              answered_at: new Date().toISOString(),
            }],
          };
        }
        // Weak questions query (review deck)
        if (q.includes('FROM user_progress up') || q.includes('FROM questions')) {
          return {
            rows: [{
              id: 101,
              question_text: 'What is the contract between equals() and hashCode()?',
              short_answer: 'If two objects are equal, their hashCode must be identical.',
              category: 'Core',
              difficulty: 'Junior',
              language: 'Java',
            }],
          };
        }
        return { rows: [] };
      });

      // 1. Student swipes left on a difficult question (records "unknown")
      const swipeRes = await request(app)
        .post('/api/questions/swipe')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ questionId: 101, status: 'unknown' });

      expect(swipeRes.status).toBe(200);

      // 2. Student checks stats: 1 mistake, 0 known, 0% accuracy
      const statsRes = await request(app)
        .get('/api/stats?language=Java')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.known).toBe(0);
      expect(statsRes.body.unknown).toBe(1);
      expect(statsRes.body.accuracy).toBe(0);

      // 3. Student inspects Answer History filtered by status=unknown
      const answersRes = await request(app)
        .get('/api/stats/answers?language=Java&status=unknown')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(answersRes.status).toBe(200);
      expect(answersRes.body.questions).toHaveLength(1);
      expect(answersRes.body.questions[0].status).toBe('unknown');
      expect(answersRes.body.summary.unknownCount).toBe(1);

      // 4. Student enters Review mode to practice weak questions
      const weakRes = await request(app)
        .get('/api/questions/weak?mode=review&language=Java')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(weakRes.status).toBe(200);
      expect(weakRes.body.questions).toHaveLength(1);
      expect(weakRes.body.questions[0].id).toBe(101);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 2. Тот, кто учится и что-то уже знает (Mid-Learner)
  // ─────────────────────────────────────────────────────────────────
  describe('Persona: Тот, кто учится и что-то уже знает (Mid-Learner)', () => {
    it('pipeline: balanced accuracy, checks topic breakdown for weak spots (<50%), filters by weak category', async () => {
      pool.query.mockImplementation(async (sql, params) => {
        const q = typeof sql === 'string' ? sql : sql.text;
        // Topics breakdown
        if (q.includes('category') && q.includes('known') && q.includes('total')) {
          return {
            rows: [
              { category: 'Core', known: '10', unknown: '2', total: '20' },        // 10/12 = 83% (strong)
              { category: 'Concurrency', known: '2', unknown: '6', total: '25' }, // 2/8 = 25% (weak)
              { category: 'Spring', known: '5', unknown: '3', total: '15' },      // 5/8 = 62.5% -> 63%
            ],
          };
        }
        // Blitz data query via resolveAIData
        if (q.includes('FROM questions WHERE id')) {
          return {
            rows: [{
              id: 201,
              question_text: 'Is Java statically typed?',
              language: 'Java',
              blitz_data: { statement: 'Java is statically typed', isCorrect: true },
            }],
          };
        }
        // Streak / progress
        if (q.includes('UPDATE users') || (q.includes('SELECT') && q.includes('current_streak'))) {
          return { rows: [{ telegram_id: MID_ID, current_streak: 2, longest_streak: 5, last_active_at: new Date().toISOString() }] };
        }
        if (q.includes('INSERT INTO user_progress')) {
          return { rows: [{ user_id: MID_ID, question_id: 201, status: 'known' }] };
        }
        // Answer history count/summary
        if (q.includes('COUNT(*) FILTER') && q.includes('known_count')) {
          return { rows: [{ known_count: '2', unknown_count: '6', total_seen: '8' }] };
        }
        if (q.includes('COUNT(*)') && q.includes('FROM user_progress')) {
          return { rows: [{ count: '6' }] };
        }
        if (q.includes('FROM user_progress up') && q.includes('JOIN questions q')) {
          return {
            rows: [{
              id: 201,
              question_text: 'Volatile keyword visibility vs atomicity',
              short_answer: 'Volatile guarantees visibility across threads, but not atomic compound operations like i++.',
              category: 'Concurrency',
              difficulty: 'Middle',
              language: 'Java',
              status: 'unknown',
            }],
          };
        }
        return { rows: [] };
      });

      // 1. Mid-learner views topic stats to find weak areas
      const topicsRes = await request(app)
        .get('/api/stats/topics?language=Java')
        .set('Authorization', `Bearer ${midToken}`);

      expect(topicsRes.status).toBe(200);
      const concurrency = topicsRes.body.topics.find(t => t.name === 'Concurrency');
      expect(concurrency.accuracy).toBe(25); // 2/8 = 25%
      expect(concurrency.accuracy).toBeLessThan(50); // weak area identified!

      // 2. Mid-learner filters Answer History specifically for the weak Concurrency category
      const categoryAnswersRes = await request(app)
        .get('/api/stats/answers?language=Java&status=unknown&category=Concurrency')
        .set('Authorization', `Bearer ${midToken}`);

      expect(categoryAnswersRes.status).toBe(200);
      expect(categoryAnswersRes.body.questions[0].category).toBe('Concurrency');
      expect(categoryAnswersRes.body.questions[0].status).toBe('unknown');

      // 3. Mid-learner tests skills in Blitz mode
      const blitzRes = await request(app)
        .post('/api/questions/blitz-answer')
        .set('Authorization', `Bearer ${midToken}`)
        .send({ questionId: 201, answer: true, clientIsCorrect: true });

      expect(blitzRes.status).toBe(200);
      expect(blitzRes.body.isCorrect).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 3. Тот, кто прямо много знает (Senior / Expert)
  // ─────────────────────────────────────────────────────────────────
  describe('Persona: Тот, кто прямо много знает (Senior / Expert)', () => {
    it('pipeline: high accuracy, practices modern tech questions, verifies dual-stack Java and Python separation', async () => {
      pool.query.mockImplementation(async (sql, params) => {
        const q = typeof sql === 'string' ? sql : sql.text;
        // Bug hunt query via resolveAIData
        if (q.includes('FROM questions WHERE id')) {
          return {
            rows: [{
              id: 301,
              question_text: 'Fix Virtual Thread Pinning in Java 21',
              language: 'Java',
              bug_hunting_data: {
                code: 'synchronized void doWork() { ... }',
                bug: 'pinning caused by synchronized block in carrier thread',
                options: ['pinning caused by synchronized block in carrier thread', 'memory leak'],
              },
            }],
          };
        }
        // Streak / progress
        if (q.includes('UPDATE users') || (q.includes('SELECT') && q.includes('current_streak'))) {
          return { rows: [{ telegram_id: SENIOR_ID, current_streak: 15, longest_streak: 20, last_active_at: new Date().toISOString() }] };
        }
        if (q.includes('INSERT INTO user_progress')) {
          return { rows: [{ user_id: SENIOR_ID, question_id: 301, status: 'known' }] };
        }
        // Stats by language
        if (q.includes('GROUP BY')) {
          return {
            rows: [
              { language: 'Java', known_count: '45', unknown_count: '5', total_seen: '50' },
              { language: 'Python', known_count: '38', unknown_count: '2', total_seen: '40' },
            ],
          };
        }
        // Stats summary
        if (q.includes('COUNT(*) FILTER') && q.includes('known_count')) {
          return { rows: [{ known_count: '45', unknown_count: '5', total_seen: '50' }] };
        }
        if (q.includes('COUNT(*)') && q.includes('FROM questions')) {
          return { rows: [{ count: '2', total: '60' }] };
        }
        // Top questions query
        if (q.includes('is_top = true') || q.includes('top_rank')) {
          return {
            rows: [
              { id: 401, question_text: 'Java 21 Virtual Threads pinning', category: 'Concurrency', difficulty: 'Senior', language: 'Java', is_top: true, top_rank: 1 },
              { id: 402, question_text: 'Generational ZGC tradeoffs', category: 'JVM', difficulty: 'Senior', language: 'Java', is_top: true, top_rank: 2 },
            ],
          };
        }
        return { rows: [] };
      });

      // 1. Senior solves Bug Hunt with correct identification
      const bugRes = await request(app)
        .post('/api/questions/bug-hunt-answer')
        .set('Authorization', `Bearer ${seniorToken}`)
        .send({ questionId: 301, answer: 'pinning caused by synchronized block in carrier thread' });

      expect(bugRes.status).toBe(200);
      expect(bugRes.body.isCorrect).toBe(true);

      // 2. Senior checks multi-language breakdown (Java vs Python)
      const multiStatsRes = await request(app)
        .get('/api/stats?language=Java')
        .set('Authorization', `Bearer ${seniorToken}`);

      expect(multiStatsRes.status).toBe(200);
      expect(multiStatsRes.body.accuracy).toBe(90); // 45/50 = 90%
      expect(multiStatsRes.body.byLanguage.Java.accuracy).toBe(90);
      expect(multiStatsRes.body.byLanguage.Python.accuracy).toBe(95); // 38/40 = 95%
      expect(multiStatsRes.body.byLanguage.Python.totalSeen).toBe(40);

      // 3. Senior checks top questions list
      const topRes = await request(app)
        .get('/api/questions/top?language=Java&limit=2')
        .set('Authorization', `Bearer ${seniorToken}`);

      expect(topRes.status).toBe(200);
      expect(topRes.body.questions).toHaveLength(2);
      expect(topRes.body.questions[0].isTop).toBe(true);
      expect(topRes.body.questions[0].topRank).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 4. Edge Cases: Zero Answers, Search Query, Language "all"
  // ─────────────────────────────────────────────────────────────────
  describe('Edge Cases & Stress Handling', () => {
    it('handles search queries and language="all" without SQL syntax errors', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // count query
        .mockResolvedValueOnce({ rows: [{ known_count: '10', unknown_count: '2', total_seen: '12' }] }) // summary query
        .mockResolvedValueOnce({
          rows: [{
            id: 501,
            question_text: 'Explain Python asyncio TaskGroup',
            short_answer: 'TaskGroup provides structured concurrency for managing multiple tasks.',
            language: 'Python',
            category: 'Async',
            status: 'known',
          }],
        });

      const res = await request(app)
        .get('/api/stats/answers?language=all&search=TaskGroup&status=all')
        .set('Authorization', `Bearer ${seniorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.questions).toHaveLength(1);
      expect(res.body.questions[0].question).toContain('TaskGroup');
    });

    it('handles brand new user with 0 answered questions cleanly', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ known_count: '0', unknown_count: '0', total_seen: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/stats/answers?language=Python&status=all')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.questions).toHaveLength(0);
      expect(res.body.summary.accuracy).toBe(0);
      expect(res.body.summary.totalAnswered).toBe(0);
    });
  });
});
