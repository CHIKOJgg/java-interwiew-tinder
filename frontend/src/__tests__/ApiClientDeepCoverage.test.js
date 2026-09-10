import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '../api/client';

describe('ApiClient Comprehensive Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    apiClient.clearAuth();
    apiClient.setUserId(null);
    apiClient.setLanguage('Java');
  });

  it('sets and clears auth credentials and headers properly', async () => {
    apiClient.setToken('test-jwt-token');
    apiClient.setUserId(999);
    apiClient.setInitData('test-init-data');
    apiClient.setLanguage('Python');

    expect(apiClient.userId).toBe('999');
    expect(apiClient.language).toBe('Python');

    const headers = await apiClient.getAuthHeaders();
    expect(headers['Authorization']).toBe('Bearer test-jwt-token');
    expect(headers['x-telegram-init-data']).toBe('test-init-data');

    apiClient.clearAuth();
    expect(apiClient.token).toBeNull();
    expect(apiClient.initData).toBeNull();
  });

  it('handles successful GET and POST requests', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: [1, 2, 3] }),
    });

    const res = await apiClient.request('/test-endpoint');
    expect(res).toEqual({ success: true, data: [1, 2, 3] });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/test-endpoint'),
      expect.objectContaining({ cache: 'no-store' })
    );

    const postRes = await apiClient.request('/test-post', {
      method: 'POST',
      body: JSON.stringify({ item: 'val' }),
    });
    expect(postRes).toEqual({ success: true, data: [1, 2, 3] });
  });

  it('handles 401 unauthorized and invokes onUnauthorized callback', async () => {
    const onUnauth = vi.fn();
    apiClient.onUnauthorized = onUnauth;

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: 'Unauthorized' }),
    });

    await expect(apiClient.request('/protected')).rejects.toThrow('Session expired');
    expect(onUnauth).toHaveBeenCalled();
  });

  it('handles error response with custom detail and error fields', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ detail: 'Invalid parameters provided', code: 'INVALID_PARAM' }),
    });

    try {
      await apiClient.request('/bad-request', { method: 'POST' });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err.message).toBe('Invalid parameters provided');
      expect(err.status).toBe(400);
      expect(err.code).toBe('INVALID_PARAM');
    }
  });

  it('handles timeout (AbortError) properly', async () => {
    const abortErr = new Error('The user aborted a request.');
    abortErr.name = 'AbortError';

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortErr);

    await expect(apiClient.request('/timeout')).rejects.toThrow('Server is taking too long to respond');
  });

  it('calls auth methods: login, loginWithProvider, sendEmailCode, verifyEmailCode', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: { telegram_id: 123, language: 'Kotlin' }, token: 'abc' }),
    });

    const loginRes = await apiClient.login('init-data-str', 'ref-123');
    expect(loginRes.user.telegram_id).toBe(123);
    expect(apiClient.userId).toBe('123');
    expect(apiClient.language).toBe('Kotlin');

    await apiClient.sendEmailCode('test@example.com');
    await apiClient.verifyEmailCode('test@example.com', '123456', 'ref-999');

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('calls question feed, swipe, and answer methods', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    await apiClient.getQuestionsFeed(10, 'swipe', {
      cursor: 5,
      seed: 's1',
      difficulties: ['Junior', 'Middle'],
      categories: ['Java Core'],
      frameworks: ['Spring'],
      topics: ['Streams'],
      search: 'equals',
      exclude: [1, 2],
      top: true,
    });

    await apiClient.recordSwipe(101, 'known');
    await apiClient.importProgress([{ questionId: 101, status: 'known' }]);
    await apiClient.submitTestAnswer(101, 'optionA');
    await apiClient.getDistractors('Java', [101]);
    await apiClient.submitBugHuntAnswer(101, 1);
    await apiClient.submitBlitzAnswer(101, true, true);
    await apiClient.evaluateInterviewAnswer('Q?', 'Ans');
    await apiClient.submitCodeCompletionAnswer(101, 'code snippet');
    await apiClient.getExplanation(101);

    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it('calls generation, stats, and preferences methods', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    await apiClient.requestGeneration('test', 'Q', 'A', 'Cat', 101);
    await apiClient.requestGenerationBatch('test', [101, 102]);
    await apiClient.getStats('Java');
    await apiClient.getCategoryStats(['Cat1']);
    await apiClient.getCategories();
    await apiClient.getFilters();
    await apiClient.getTopQuestions({ language: 'Java', category: 'Cat1', limit: 20 });
    await apiClient.getTopStats('Java');
    await apiClient.getCompanies();
    await apiClient.getPreferences();
    await apiClient.updatePreferences(['Cat1'], 'Java', 'Comp', ['Fw1'], ['Top1']);
    await apiClient.switchLanguage('Python');

    expect(fetchMock).toHaveBeenCalledTimes(12);
  });

  it('calls resume, vacancies, trends, profile, and subscriptions methods', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    await apiClient.analyzeResume('My resume...');
    await apiClient.generateResumeQuestions({ skills: ['Java'] });
    await apiClient.prepareVacancy('Vacancy text...');
    await apiClient.fetchMarketTrends('Java');
    await apiClient.getProfile();
    await apiClient.updateProfile({ username: 'newname' });
    await apiClient.getPlans();
    await apiClient.getSubscriptionStatus();
    await apiClient.subscribe('pro_monthly');
    await apiClient.cancelSubscription();
    await apiClient.getSubscriptionHistory();

    expect(fetchMock).toHaveBeenCalledTimes(11);
  });

  it('calls demo, system design, tracks, and discussions methods', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    await apiClient.getDemoQuestions(5, 'Java');
    await apiClient.getDemoPercentile(80, 'Java');
    await apiClient.getDiscussions(101);
    await apiClient.createDiscussion(101, 'Text', 'Code', 501);
    await apiClient.voteDiscussion(501, 1);
    await apiClient.markSolution(501);

    expect(fetchMock).toHaveBeenCalledTimes(6);
  });
});
