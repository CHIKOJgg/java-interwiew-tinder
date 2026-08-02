import express from 'express';
import { generateVacancyQuestions, generateResumeQuestions } from '../services/aiService.js';
import logger from '../config/logger.js';
import { rateLimit } from '../middleware/rateLimiter.js';
import redis from '../config/redis.js';

const router = express.Router();

router.post('/user/resume-questions', rateLimit('ai_generation'), async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const { resumeData, language = 'Java' } = req.body;
    if (!resumeData) {
      return res.status(400).json({ error: 'resumeData is required' });
    }
    const questions = await generateResumeQuestions(resumeData, language);
    res.json({ success: true, questions: questions.questions || questions });
  } catch (error) {
    logger.error({ err: error, path: req.path, resumeDataKeys: Object.keys(req.body?.resumeData || {}) }, 'Unhandled error in route');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/vacancy/prepare', rateLimit('ai_generation'), async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const { vacancyText, language = 'Java' } = req.body;
    if (!vacancyText) {
      return res.status(400).json({ error: 'vacancyText is required' });
    }
    const result = await generateVacancyQuestions(vacancyText, language);
    res.json({ success: true, questions: result.questions || [], suggestedTopTopics: result.suggestedTopTopics || [] });
  } catch (error) {
    logger.error({ err: error, path: req.path, textLength: req.body?.vacancyText?.length || 0 }, 'Unhandled error in route');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/trends/market', rateLimit('requests'), async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const language = req.query.language || 'Java';
    const area = req.query.area || '1';
    const count = Math.min(parseInt(req.query.count) || 20, 100);
    const cacheKey = `market-trends:${language}:${area}:${count}`;
    const staleCacheKey = `${cacheKey}:stale`;

    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) return res.json({ ...JSON.parse(cached), cached: true, isStale: false });
      } catch (err) {
        logger.warn({ err, cacheKey }, 'Market trends cache read failed');
      }
    }

    const url = new URL('https://api.hh.ru/vacancies');
    url.searchParams.set('text', language);
    url.searchParams.set('area', area);
    url.searchParams.set('per_page', String(count));
    url.searchParams.set('only_with_salary', 'true');
    url.searchParams.set('order_by', 'by_publication');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response;
    try {
      response = await fetch(url.toString(), {
        headers: { 'User-Agent': 'InterviewTinder/1.0' },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw new Error(`hh.ru API ${response.status}`);
    const data = await response.json();

    const skillCounts = new Map();
    const companyCounts = new Map();
    const salaryMap = { min: 0, max: 0, count: 0 };

    for (const vac of data.items || []) {
      if (vac.snippet?.requirement) {
        const reqLower = vac.snippet.requirement.toLowerCase();
        const skills = extractSkills(reqLower, language);
        skills.forEach(s => skillCounts.set(s, (skillCounts.get(s) || 0) + 1));
      }
      if (vac.company?.name) companyCounts.set(vac.company.name, (companyCounts.get(vac.company.name) || 0) + 1);
      if (vac.compensation?.from || vac.compensation?.to) {
        salaryMap.min += vac.compensation?.from || vac.compensation?.to || 0;
        salaryMap.max += vac.compensation?.to || vac.compensation?.from || 0;
        salaryMap.count++;
      }
    }

    const avgSalary = salaryMap.count > 0
      ? Math.round((salaryMap.min + salaryMap.max) / (salaryMap.count * 2))
      : null;

    const result = {
      success: true,
      totalVacancies: data.found || 0,
      topSkills: [...skillCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name, count]) => ({ name, count })),
      topCompanies: [...companyCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count })),
      avgSalary,
      currency: 'RUB',
      language,
      updatedAt: new Date().toISOString(),
      source: 'hh.ru',
    };
    if (redis) {
      const serialized = JSON.stringify(result);
      redis.setex(cacheKey, 3600, serialized).catch(err => logger.warn({ err }, 'Market trends cache write failed'));
      redis.setex(staleCacheKey, 86400, serialized).catch(err => logger.warn({ err }, 'Market trends stale cache write failed'));
    }
    res.json(result);
  } catch (error) {
    const language = req.query.language || 'Java';
    const area = req.query.area || '1';
    const count = Math.min(parseInt(req.query.count) || 20, 100);
    const cacheKey = `market-trends:${language}:${area}:${count}`;
    const staleCacheKey = `${cacheKey}:stale`;
    let stale = null;
    if (redis) {
      try { stale = await redis.get(staleCacheKey); } catch { /* fallback below */ }
    }
    if (stale) {
      logger.warn({ err: error, path: req.path }, 'Returning stale market trends cache');
      return res.json({ ...JSON.parse(stale), cached: true, isStale: true });
    }
    logger.error({ err: error, path: req.path, query: req.query }, 'Failed to fetch market trends');
    res.status(502).json({ error: 'Failed to fetch market trends', code: 'MARKET_TRENDS_UNAVAILABLE' });
  }
});

function extractSkills(text, language) {
  const defaultSkills = {
    Java: ['Spring', 'Spring Boot', 'Hibernate', 'JPA', 'Maven', 'Gradle', 'JUnit', 'microservices', 'REST API', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes', 'Kafka', 'AWS', 'GCP', 'multithreading', 'concurrency', 'jvm', 'design patterns'],
    Python: ['Django', 'Flask', 'FastAPI', 'PostgreSQL', 'Docker', 'Redis', 'Kafka', 'AWS', 'GCP', 'multithreading', 'async', 'jupyter', 'pandas', 'numpy', 'machine learning'],
    TypeScript: ['React', 'Next.js', 'Node.js', 'NestJS', 'TypeORM', 'PostgreSQL', 'Redis', 'Docker', 'AWS', 'GraphQL', 'REST API', 'design patterns', 'unit testing'],
    Go: ['Gin', 'Echo', 'GORM', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes', 'gRPC', 'Kafka', 'AWS', 'microservices', 'concurrency'],
    Rust: ['Tokio', 'Actix', 'Axum', 'PostgreSQL', 'Redis', 'Docker', 'gRPC', 'async', 'unsafe', 'Cargo', 'multithreading'],
    React: ['TypeScript', 'Next.js', 'Redux', 'Zustand', 'React Query', 'Tailwind', 'Node.js', 'GraphQL', 'REST API', 'testing-library', 'Jest', 'Cypress', 'Storybook', 'Server Components'],
    Kotlin: ['Coroutines', 'Ktor', 'Spring Boot', 'Android', 'PostgreSQL', 'Redis', 'Docker', 'kotlinx.serialization', 'multi-platform', 'JUnit', 'TDD'],
  };
  const keywords = defaultSkills[language] || defaultSkills.Java;
  return keywords.filter(k => text.includes(k.toLowerCase()));
}

export default router;
