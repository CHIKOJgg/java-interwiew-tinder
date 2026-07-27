import { describe, it, expect, vi } from 'vitest';

vi.mock('../api/client', () => ({
  default: {
    request: vi.fn().mockResolvedValue({}),
    getAuthHeaders: vi.fn().mockResolvedValue({}),
    fetchGeneration: vi.fn().mockResolvedValue({ options: [] }),
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    getCategories: vi.fn().mockResolvedValue({ categories: [] }),
    getPreferences: vi.fn().mockResolvedValue({ selectedCategories: [] }),
    getReferralStats: vi.fn().mockResolvedValue({ total: 0, converted: 0, rewardDays: 0 }),
    prepareVacancy: vi.fn().mockResolvedValue({ success: true, questions: ['Q1?'], suggestedTopTopics: ['Spring'] }),
    generateResumeQuestions: vi.fn().mockResolvedValue({ questions: ['Resume Q1?'] }),
    fetchMarketTrends: vi.fn().mockResolvedValue({ totalVacancies: 100, topSkills: ['Spring', 'Docker'] }),
  },
}));

vi.mock('../store/useStore', () => ({
  default: () => ({
    analyzeResume: vi.fn().mockResolvedValue({ skills: ['Java'], experienceLevel: 'Mid' }),
    isAnalyzingResume: false,
    resumeData: null,
    clearResumeData: vi.fn(),
    generateResumeQuestions: vi.fn().mockResolvedValue([]),
    isGeneratingQuestions: false,
    prepareVacancy: vi.fn().mockResolvedValue({ questions: ['Q1?'], suggestedTopTopics: ['Spring'] }),
    setLearningMode: vi.fn(),
    language: 'Java',
    switchLanguage: vi.fn(),
    user: null,
  }),
}));

describe('VacancyPrep — module loads and exports component', () => {
  it('has a default export that is a function', async () => {
    const mod = await import('../components/VacancyPrep.jsx');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});

describe('MarketTrends — module loads and exports component', () => {
  it('has a default export that is a function', async () => {
    const mod = await import('../components/MarketTrends.jsx');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});