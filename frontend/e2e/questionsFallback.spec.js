import { test, expect } from '@playwright/test';

// Contract tests for the RU+EN fallback: the deck must never be empty,
// even for languages with a thin RU pool (Go/TS/Rust/React/Kotlin ~3 RU each).
// API responses are mocked at the network layer so these run without a backend.

const ruQuestions = (lang, n) =>
  Array.from({ length: n }, (_, i) => ({
    id: 1000 + i,
    category: `${lang} Core`,
    difficulty: 'Junior',
    question: `Что такое концепция ${i} в ${lang}?`,
    shortAnswer: `Краткое объяснение концепции ${i} для ${lang} на русском языке.`,
    language: lang,
  }));

const enQuestions = (lang, n, offset = 0) =>
  Array.from({ length: n }, (_, i) => ({
    id: 2000 + offset + i,
    category: `${lang} Core`,
    difficulty: 'Junior',
    question: `What is concept ${offset + i} in ${lang}?`,
    shortAnswer: `English explanation number ${offset + i} for ${lang} concepts.`,
    language: lang,
  }));

async function mockDemo(page, handler) {
  // NOTE: match on pathname prefix — a '**/api/**' glob would also swallow
  // Vite dev modules like /src/api/client.js and break the app boot.
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/demo/questions')) {
        const { questions, meta } = handler(url);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ questions, meta }),
        });
        return;
      }
      // Silence the rest of the API surface the landing/demo touches.
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ questions: [], tracks: [] }),
      });
    }
  );
}

test.describe('Questions fallback (RU+EN)', () => {
  test('Go deck renders EN fallback when RU pool is thin', async ({ page }) => {
    await mockDemo(page, (url) => {
      const lang = url.searchParams.get('language') || 'Go';
      const ru = ruQuestions(lang, 3);
      const en = enQuestions(lang, 7);
      return {
        questions: [...ru, ...en],
        meta: { language: lang, total: 10, ruCount: 3, enCount: 7, fallback: true },
      };
    });
    await page.goto('/');
    await page.locator('#ctaHero').click();
    await expect(page.locator('.demo-card-shell').first()).toBeVisible();
    await expect(page.locator('.demo-counter').first()).toContainText('/ 10');
  });

  test('deck falls back to hardcoded questions when API is empty', async ({ page }) => {
    await mockDemo(page, (url) => ({
      questions: [],
      meta: { language: url.searchParams.get('language') || 'Go', total: 0 },
    }));
    await page.goto('/');
    await page.locator('#ctaHero').click();
    // DemoMode ships FALLBACK_QUESTIONS so the funnel never dead-ends.
    await expect(page.locator('.demo-card-shell').first()).toBeVisible();
  });

  test('EN interface requests the EN pool (lng=en flows to API)', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('app_language', 'en'));
    let requestedLng = null;
    await page.route(
      (url) => url.pathname.startsWith('/api/'),
      async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith('/demo/questions')) {
          requestedLng = url.searchParams.get('lng');
          const lang = url.searchParams.get('language') || 'Java';
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              questions: enQuestions(lang, 5),
              meta: { language: lang, total: 5, ruCount: 0, enCount: 5, fallback: false },
            }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ questions: [], tracks: [] }),
        });
      }
    );
    await page.goto('/');
    await page.locator('#ctaHero').click();
    await expect(page.locator('.demo-card-shell').first()).toBeVisible();
    expect(requestedLng).toBe('en');
  });

  test('switching demo language reloads the deck', async ({ page }) => {
    await mockDemo(page, (url) => {
      const lang = url.searchParams.get('language') || 'Java';
      const qs = lang === 'Go' ? [...ruQuestions(lang, 3), ...enQuestions(lang, 7)] : ruQuestions(lang, 10);
      return { questions: qs, meta: { language: lang, total: qs.length } };
    });
    await page.goto('/');
    await page.locator('#ctaHero').click();
    const langTabs = page.locator('.demo-lang');
    const count = await langTabs.count();
    expect(count).toBeGreaterThan(1);
    await langTabs.first().click();
    await expect(page.locator('.demo-card-shell').first()).toBeVisible();
  });
});
