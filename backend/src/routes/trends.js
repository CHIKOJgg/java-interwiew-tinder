import express from 'express';
import { generateVacancyQuestions, generateResumeQuestions } from '../services/aiService.js';
import logger from '../config/logger.js';

const router = express.Router();

router.post('/user/resume-questions', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const { resumeData, language = 'Java' } = req.body;
    if (!resumeData) {
      return res.status(400).json({ error: 'resumeData is required' });
    }
    const questions = await generateResumeQuestions(resumeData, language);
    res.json({ success: true, questions: questions.questions || questions });
  } catch (error) {
    logger.error({ err: error, path: req.path, body: req.body }, 'Unhandled error in route');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/vacancy/prepare', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const { vacancyText, language = 'Java' } = req.body;
    if (!vacancyText) {
      return res.status(400).json({ error: 'vacancyText is required' });
    }
    const result = await generateVacancyQuestions(vacancyText, language);
    res.json({ success: true, questions: result.questions || [], suggestedTopTopics: result.suggestedTopTopics || [] });
  } catch (error) {
    logger.error({ err: error, path: req.path, body: req.body }, 'Unhandled error in route');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/trends/market', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const language = req.query.language || 'Java';
    const area = req.query.area || '1';
    const count = Math.min(parseInt(req.query.count) || 20, 100);

    const url = new URL('https://api.hh.ru/vacancies');
    url.searchParams.set('text', language);
    url.searchParams.set('area', area);
    url.searchParams.set('per_page', String(count));
    url.searchParams.set('only_with_salary', 'true');
    url.searchParams.set('order_by', 'by_publication');
    url.searchParams.set('season', 'winter');

    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': 'InterviewTinder/1.0' },
    });
    if (!response.ok) throw new Error(`hh.ru API ${response.status}`);
    const data = await response.json();

    const skillSet = new Set();
    const companySet = new Set();
    const salaryMap = { min: 0, max: 0, count: 0 };

    for (const vac of data.items || []) {
      if (vac.snippet?.requirement) {
        const reqLower = vac.snippet.requirement.toLowerCase();
        const skills = extractSkills(reqLower, language);
        skills.forEach(s => skillSet.add(s));
      }
      if (vac.company?.name) companySet.add(vac.company.name);
      if (vac.compensation?.from) { salaryMap.min += vac.compensation.from; salaryMap.count++; }
      if (vac.compensation?.to) { salaryMap.max += vac.compensation.to; }
    }

    const avgSalary = salaryMap.count > 0
      ? Math.round((salaryMap.min + salaryMap.max) / (salaryMap.count * 2))
      : null;

    res.json({
      success: true,
      totalVacancies: data.found || 0,
      topSkills: [...skillSet].slice(0, 15),
      topCompanies: [...companySet].slice(0, 10),
      avgSalary,
      currency: 'RUB',
      language,
    });
  } catch (error) {
    logger.error({ err: error, path: req.path, query: req.query }, 'Failed to fetch market trends');
    res.status(500).json({ error: 'Failed to fetch market trends' });
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