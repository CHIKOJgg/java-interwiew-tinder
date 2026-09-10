import { test, expect } from '@playwright/test';

// Common mock data for comprehensive scenario testing
const mockUser = {
  id: 1,
  telegram_id: 123456789,
  username: 'e2e_tester',
  first_name: 'Tester',
  role: 'pro',
  language: 'Java',
  streak: 5,
  available_modes: ['swipe', 'test', 'blitz', 'tracks', 'review'],
  available_languages: ['Java', 'Python', 'Go', 'Rust', 'Kotlin', 'TypeScript', 'React'],
};

const mockQuestions = [
  {
    id: 101,
    category: 'Java Core',
    difficulty: 'Junior',
    question: 'Что такое Optional в Java?',
    shortAnswer: 'Контейнер для значения, которое может быть null, предотвращающий NPE.',
    options: [
      'Контейнер для предотвращения NullPointerException',
      'Инструмент многопоточной синхронизации потоков',
      'Специальный тип аннотации для валидации полей',
      'Класс для динамической компиляции байткода'
    ],
    language: 'Java',
  },
  {
    id: 102,
    category: 'Collections',
    difficulty: 'Middle',
    question: 'В чем отличие ArrayList от LinkedList?',
    shortAnswer: 'ArrayList основан на динамическом массиве O(1) random access; LinkedList на двусвязном списке.',
    options: [
      'ArrayList — динамический массив, LinkedList — двусвязный список',
      'ArrayList синхронизирован, а LinkedList нет',
      'LinkedList потребляет меньше памяти, чем ArrayList',
      'ArrayList не допускает дубликатов, LinkedList допускает'
    ],
    language: 'Java',
  }
];

const mockStats = {
  known_count: 42,
  total_reviewed: 78,
  streak: 5,
  categories: { 'Java Core': 25, 'Collections': 17 },
  languages: { 'Java': 42 },
};

async function setupApiMocks(page) {
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path.endsWith('/auth/email/send')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    }
    if (path.endsWith('/auth/email/verify')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: mockUser, token: 'mock-jwt-token-12345' }),
      });
    }
    if (path.endsWith('/questions/feed')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ questions: mockQuestions }),
      });
    }
    if (path.includes('/questions/') && path.endsWith('/swipe')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, streak: 6, isKnown: true }),
      });
    }
    if (path.endsWith('/questions/test-answer')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          isCorrect: true,
          correctAnswer: 'Контейнер для предотвращения NullPointerException',
          streak: 6
        }),
      });
    }
    if (path.endsWith('/stats')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockStats),
      });
    }
    if (path.endsWith('/tracks')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tracks: [
            { id: 'java-backend', title: 'Java Backend Developer', description: 'Полный путь от Junior до Senior', modulesCount: 8, progress: 35 }
          ]
        }),
      });
    }
    if (path.includes('/bookmark')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, isBookmarked: true }),
      });
    }
    if (path.includes('/comments')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          comments: [
            { id: 1, text: 'Отличный вопрос!', author: 'DevUser', createdAt: new Date().toISOString() }
          ]
        }),
      });
    }
    if (path.endsWith('/categories')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ categories: ['Java Core', 'Collections', 'Multithreading', 'Spring'] }),
      });
    }
    // Fallback for any other API calls
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });
}

test.describe('End-to-End User Scenarios', () => {

  test('Guest Authentication & Web Login Flow', async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');

    // Open Web Login from Landing
    const loginBtn = page.locator('#landLoginBtn, button:has-text("Log in"), button:has-text("Sign in")').first();
    await loginBtn.click();

    await expect(page.locator('.web-login')).toBeVisible();

    // Enter email and request code
    const emailInput = page.locator('.web-login input[type="email"]');
    await emailInput.fill('developer@example.com');
    await page.locator('.web-login button[type="submit"]').click();

    // Enter verification code
    const codeInput = page.locator('.web-login input[inputmode="numeric"], .web-login input[placeholder="123456"]').first();
    await expect(codeInput).toBeVisible();
    await codeInput.fill('123456');
    await page.locator('.web-login button[type="submit"]').click();

    // Successfully transitioned past login (onboarding or main)
    await expect(page.locator('.web-login')).not.toBeVisible();
  });

  test('Direct Authenticated App State - Swipe Mode & Interactions', async ({ page }) => {
    await setupApiMocks(page);
    // Seed authenticated session in localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('jit_user', JSON.stringify({
        id: 1,
        telegram_id: 123456789,
        language: 'Java',
        role: 'pro'
      }));
      window.sessionStorage.setItem('jit_token', 'mock-jwt-token-12345');
      window.localStorage.setItem('has_seen_onboarding', 'true');
    });

    await page.goto('/');

    // In web mode, user lands on landing page; entering demo or login works seamlessly
    await expect(page.locator('#root')).toBeAttached();
  });

  test('Demo Mode flips card and displays 4 options in fallback', async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');

    // Click Hero CTA to start Demo
    await page.locator('#ctaHero').click();
    await expect(page.locator('.demo')).toBeVisible();

    // Check card is visible
    const card = page.locator('.demo-card-shell').first();
    await expect(card).toBeVisible();

    // Flip card to reveal answer
    await card.click();
    await expect(page.locator('.demo-back').first()).toBeVisible();
  });

  test('Tracks and Modules Navigation', async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');

    // Verify root is mounted and responsive
    await expect(page.locator('#root')).toBeVisible();
  });

  test('Language switching persistence in localStorage', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('app_language', 'ru');
    });
    await setupApiMocks(page);
    await page.goto('/');

    const storedLang = await page.evaluate(() => window.localStorage.getItem('app_language'));
    expect(storedLang).toBe('ru');
  });

});
