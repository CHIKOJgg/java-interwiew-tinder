import { describe, it, expect, vi, beforeEach } from 'vitest';
import pool from '../src/config/database.js';
import * as aiService from '../src/services/aiService.js';
import {
  getTopics,
  getTopicDetail,
  evaluateAnswer,
  getUserProgress,
} from '../src/services/systemDesignService.js';

describe('systemDesignService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getTopics', () => {
    it('returns topics with mapped user progress', async () => {
      vi.spyOn(pool, 'query')
        .mockResolvedValueOnce({
          rows: [
            { id: 1, title: 'URL Shortener', difficulty: 'junior' },
            { id: 2, title: 'Rate Limiter', difficulty: 'middle' },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ topic_id: 1, status: 'completed', score: 85 }],
        });

      const topics = await getTopics(123, 'Java', 'junior');
      expect(topics).toHaveLength(2);
      expect(topics[0].progress).toEqual({ status: 'completed', score: 85 });
      expect(topics[1].progress).toEqual({ status: 'not_started', score: null });
    });

    it('falls back to Java topics if selected language has no topics', async () => {
      vi.spyOn(pool, 'query')
        .mockResolvedValueOnce({ rows: [] }) // first query returns empty for Rust
        .mockResolvedValueOnce({
          rows: [{ id: 10, title: 'Chat System', difficulty: 'senior' }],
        }); // fallback to Java

      const topics = await getTopics(null, 'Rust');
      expect(topics).toHaveLength(1);
      expect(topics[0].title).toBe('Chat System');
    });

    it('throws error on database query failure', async () => {
      vi.spyOn(pool, 'query').mockRejectedValueOnce(new Error('Connection lost'));

      await expect(getTopics(123, 'Java')).rejects.toThrow('Connection lost');
    });
  });

  describe('getTopicDetail', () => {
    it('returns null if topic does not exist', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] });

      const res = await getTopicDetail(999, 123);
      expect(res).toBeNull();
    });

    it('returns topic with user progress when available', async () => {
      vi.spyOn(pool, 'query')
        .mockResolvedValueOnce({
          rows: [{ id: 1, title: 'Design Twitter' }],
        })
        .mockResolvedValueOnce({
          rows: [{ user_id: 123, topic_id: 1, score: 90, status: 'completed' }],
        });

      const res = await getTopicDetail(1, 123);
      expect(res.topic.title).toBe('Design Twitter');
      expect(res.progress.score).toBe(90);
    });

    it('returns topic without progress if userId is omitted', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Design Twitter' }],
      });

      const res = await getTopicDetail(1);
      expect(res.topic.title).toBe('Design Twitter');
      expect(res.progress).toBeNull();
    });
  });

  describe('evaluateAnswer', () => {
    it('throws error if topic does not exist', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] });

      await expect(evaluateAnswer(999, 'My answer', 123)).rejects.toThrow('Topic not found');
    });

    it('throws error if AI evaluation fails or returns invalid json', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Design YouTube' }],
      });
      vi.spyOn(aiService, 'callOpenRouter').mockRejectedValueOnce(new Error('OpenRouter timeout'));

      await expect(evaluateAnswer(1, 'My answer', 123)).rejects.toThrow(
        'AI evaluation failed'
      );
    });

    it('evaluates answer and inserts new progress when first attempt', async () => {
      vi.spyOn(pool, 'query')
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              title: 'Design YouTube',
              expected_components: ['CDN', 'Transcoder', 'PostgreSQL'],
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }) // existing check (empty -> insert)
        .mockResolvedValueOnce({}); // INSERT

      vi.spyOn(aiService, 'callOpenRouter').mockResolvedValueOnce(
        JSON.stringify({
          score: 85,
          strengths: ['Great CDN choice'],
          weaknesses: ['Missed caching layer'],
          missingComponents: ['Redis'],
          suggestedArchitecture: 'Use CDN + Transcoder farm + Cassandra',
          followUpQuestion: 'How would you handle video chunking?',
        })
      );

      const res = await evaluateAnswer(1, 'We should use a CDN and PostgreSQL with S3', 123);
      expect(res.score).toBe(85);
      expect(res.strengths).toEqual(['Great CDN choice']);
      expect(res.missingComponents).toEqual(['Redis']);
      expect(pool.query).toHaveBeenCalledTimes(3);
    });

    it('evaluates answer and updates progress when attempt already exists', async () => {
      vi.spyOn(pool, 'query')
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              title: 'Design YouTube',
              expected_components: ['CDN', 'Redis'],
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ id: 42, attempt_count: 2 }] }) // existing found -> update
        .mockResolvedValueOnce({}); // UPDATE

      vi.spyOn(aiService, 'callOpenRouter').mockResolvedValueOnce(
        JSON.stringify({
          score: 92,
          strengths: ['Awesome scalability logic'],
          weaknesses: [],
          missingComponents: [],
          suggestedArchitecture: 'Optimal architecture',
          followUpQuestion: 'How would you partition video IDs?',
        })
      );

      const res = await evaluateAnswer(1, 'Using CDN and Redis cache', 123);
      expect(res.score).toBe(92);
      expect(pool.query).toHaveBeenCalledTimes(3);
    });
  });

  describe('getUserProgress', () => {
    it('calculates average score across completed topics', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce({
        rows: [
          { id: 1, status: 'completed', score: 80 },
          { id: 2, status: 'completed', score: 90 },
          { id: 3, status: 'not_started', score: null },
        ],
      });

      const res = await getUserProgress(123);
      expect(res.overallReadiness).toBe(85);
      expect(res.topics).toHaveLength(3);
    });

    it('returns overallReadiness 0 when no topics completed', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce({
        rows: [
          { id: 1, status: 'not_started', score: null },
        ],
      });

      const res = await getUserProgress(123);
      expect(res.overallReadiness).toBe(0);
    });
  });
});
