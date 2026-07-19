import { describe, it, expect, vi } from 'vitest';

// Lightweight module-load smoke test. The learning-mode components read from
// a shared singleton Zustand store and fire async network effects on mount,
// which makes full render tests in a shared-store environment flaky. The
// regression we actually care about (and that the audit flagged) is a
// component that fails to import or export — e.g. a missing React hook
// import, a duplicated import, or an undefined reference at module scope.
// Importing every mode here makes any such breakage fail the build/test.
//
// Network calls are mocked so merely importing a component does not trigger
// real requests.
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
  },
}));

describe('mode components import without throwing', () => {
  it('every learning mode module loads and exports a component', async () => {
    const mods = await Promise.all([
      import('../components/SwipeButtons.jsx'),
      import('../components/TestMode.jsx'),
      import('../components/BugHuntingMode.jsx'),
      import('../components/BlitzMode.jsx'),
      import('../components/CodeCompletionMode.jsx'),
      import('../components/ConceptLinker.jsx'),
      import('../components/MockInterviewMode.jsx'),
      import('../components/QuestionCard.jsx'),
      import('../components/ExplanationModal.jsx'),
      import('../components/Header.jsx'),
      import('../components/CategorySelection.jsx'),
      import('../components/ReviewMode.jsx'),
      import('../components/ResumeAnalyzer.jsx'),
      import('../components/SavedQuestions.jsx'),
      import('../components/AdminPanel.jsx'),
      import('../components/ShareCard.jsx'),
    ]);
    for (const m of mods) {
      expect(m.default).toBeDefined();
      // A component is either a plain function or a forwardRef/memo
      // wrapper (which is an object carrying a $$typeof marker).
      const isComponent =
        typeof m.default === 'function' ||
        (typeof m.default === 'object' && m.default !== null && '$$typeof' in m.default);
      expect(isComponent).toBe(true);
    }
  });

  it('App and store import and wire up', async () => {
    const App = (await import('../App.jsx')).default;
    const useStore = (await import('../store/useStore.js')).default;
    expect(App).toBeDefined();
    expect(useStore).toBeDefined();
    expect(typeof useStore.getState).toBe('function');
  });
});
