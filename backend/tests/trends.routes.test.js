import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import trendsRouter from '../src/routes/trends.js';
import * as aiService from '../src/services/aiService.js';
import redis from '../src/config/redis.js';

describe('trends routes', () => {
  let app;

  beforeEach(() => {
    vi.restoreAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api', trendsRouter);
  });

  describe('POST /api/user/resume-questions', () => {
    it('returns 400 if resumeData is missing', async () => {
      const res = await request(app)
        .post('/api/user/resume-questions')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('resumeData is required');
    });

    it('generates questions from resume data using aiService', async () => {
      vi.spyOn(aiService, 'generateResumeQuestions').mockResolvedValueOnce({
        questions: [
          { question: 'Tell us about your experience with Spring Boot?' },
        ],
      });

      const res = await request(app)
        .post('/api/user/resume-questions')
        .send({
          resumeData: { experience: '5 years Java' },
          language: 'Java',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.questions).toHaveLength(1);
    });

    it('handles AI service failure and returns 500', async () => {
      vi.spyOn(aiService, 'generateResumeQuestions').mockRejectedValueOnce(
        new Error('AI generation failed')
      );

      const res = await request(app)
        .post('/api/user/resume-questions')
        .send({
          resumeData: { experience: 'error' },
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error');
    });
  });

  describe('POST /api/vacancy/prepare', () => {
    it('returns 400 if vacancyText is missing', async () => {
      const res = await request(app)
        .post('/api/vacancy/prepare')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('vacancyText is required');
    });

    it('generates questions and suggested topics from vacancy text', async () => {
      vi.spyOn(aiService, 'generateVacancyQuestions').mockResolvedValueOnce({
        questions: [{ question: 'How do you handle Kafka lag?' }],
        suggestedTopTopics: ['Kafka', 'Microservices'],
      });

      const res = await request(app)
        .post('/api/vacancy/prepare')
        .send({
          vacancyText: 'Looking for Senior Java Dev with Kafka and K8s',
          language: 'Java',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.questions).toHaveLength(1);
      expect(res.body.suggestedTopTopics).toEqual(['Kafka', 'Microservices']);
    });

    it('returns 500 if vacancy preparation fails', async () => {
      vi.spyOn(aiService, 'generateVacancyQuestions').mockRejectedValueOnce(
        new Error('AI error')
      );

      const res = await request(app)
        .post('/api/vacancy/prepare')
        .send({
          vacancyText: 'Some vacancy',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error');
    });
  });

  describe('GET /api/trends/market', () => {
    it('returns market trends by fetching from hh.ru API', async () => {
      if (redis) {
        vi.spyOn(redis, 'get').mockResolvedValue(null);
        vi.spyOn(redis, 'setex').mockResolvedValue('OK');
      }

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          found: 1250,
          items: [
            {
              snippet: { requirement: 'Deep knowledge of Spring Boot and Docker' },
              company: { name: 'Tech Corp' },
              compensation: { from: 200000, to: 300000 },
            },
            {
              snippet: { requirement: 'Experience with PostgreSQL and Kafka' },
              company: { name: 'Fintech Inc' },
              compensation: { from: 250000, to: 350000 },
            },
          ],
        }),
      });

      const res = await request(app)
        .get('/api/trends/market?language=Java&area=1&count=20');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.totalVacancies).toBe(1250);
      expect(res.body.avgSalary).toBe(275000);
      expect(res.body.topCompanies).toHaveLength(2);
      expect(res.body.topSkills.map(s => s.name)).toContain('Spring Boot');
    });

    it('returns cached market trends when redis cache hit occurs', async () => {
      if (redis) {
        const cachedPayload = {
          success: true,
          totalVacancies: 500,
          topSkills: [{ name: 'Go', count: 10 }],
        };
        vi.spyOn(redis, 'get').mockResolvedValueOnce(JSON.stringify(cachedPayload));

        const res = await request(app)
          .get('/api/trends/market?language=Go');

        expect(res.status).toBe(200);
        expect(res.body.cached).toBe(true);
        expect(res.body.totalVacancies).toBe(500);
      }
    });

    it('returns stale cache if external API fails and stale cache exists', async () => {
      if (redis) {
        const stalePayload = {
          success: true,
          totalVacancies: 400,
          topSkills: [{ name: 'Rust', count: 5 }],
        };
        // primary cache miss, fetch fails, stale cache hit
        vi.spyOn(redis, 'get')
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(JSON.stringify(stalePayload));
      }

      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network failure'));

      const res = await request(app)
        .get('/api/trends/market?language=Rust');

      if (redis) {
        expect(res.status).toBe(200);
        expect(res.body.isStale).toBe(true);
      } else {
        expect(res.status).toBe(502);
      }
    });

    it('returns 502 if external API fails and no cache exists', async () => {
      if (redis) {
        vi.spyOn(redis, 'get').mockResolvedValue(null);
      }
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('hh.ru down'));

      const res = await request(app)
        .get('/api/trends/market?language=Python');

      expect(res.status).toBe(502);
      expect(res.body.code).toBe('MARKET_TRENDS_UNAVAILABLE');
    });
  });
});
