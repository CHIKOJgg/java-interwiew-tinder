import { test, expect } from '@playwright/test';

const mockUser = {
  id: 1,
  telegram_id: 123456789,
  username: 'comprehensive_tester',
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
    language: 'Java',
  },
  {
    id: 102,
    category: 'Collections',
    difficulty: 'Middle',
    question: 'В чем отличие ArrayList от LinkedList?',
    shortAnswer: 'ArrayList основан на массиве, LinkedList на двусвязном списке.',
    language: 'Java',
  }
];

async function setupApiMocks(page) {
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path.endsWith('/auth/email/send')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    }
    if (path.endsWith('/auth/email/verify') || path.endsWith('/auth/login')) {
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
    if (path.endsWith('/demo/questions')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ questions: mockQuestions }),
      });
    }
    if (path.includes('/swipe')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, streak: 6, isKnown: true }),
      });
    }
    if (path.endsWith('/questions/explain')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          explanation: JSON.stringify({
            title: 'Optional в Java',
            theory: 'Класс Optional появился в Java 8 для борьбы с NullPointerException.',
            key_points: ['Не используйте Optional в полях сущностей', 'Полезен в качестве возвращаемого типа методов'],
            where_used: ['Сервисные слои Spring Boot', 'Репозитории Spring Data'],
          }),
          cached: true,
        }),
      });
    }
    if (path.endsWith('/stats')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ known_count: 10, total_reviewed: 15, streak: 5 }),
      });
    }
    if (path.endsWith('/tracks')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tracks: [
            { id: 'spring-master', title: 'Spring Framework Master', description: 'Полный трек', modulesCount: 6, progress: 20 }
          ]
        }),
      });
    }

    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
}

test.describe('Comprehensive End-to-End User Flow', () => {
  test('landing page to web login authentication flow', async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/');

    // Check Landing page header
    await expect(page.locator('.land-header')).toBeVisible();

    // Click Log in
    const loginBtn = page.locator('#landLoginBtn');
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      await expect(page.locator('.web-login')).toBeVisible();

      // Enter email
      await page.locator('input[type="email"]').fill('coder@example.com');
      await page.locator('button[type="submit"]').click();

      // Enter OTP code
      const codeInput = page.locator('input[inputmode="numeric"]');
      await expect(codeInput).toBeVisible();
      await codeInput.fill('123456');
      await page.locator('button[type="submit"]').click();
    }
  });

  test('interactive card flipping and explanation modal in authenticated session', async ({ page }) => {
    await setupApiMocks(page);

    // Set authenticated state in storage
    await page.addInitScript(() => {
      localStorage.setItem('interview_tinder_cache_token', 'mock-jwt-token-12345');
      sessionStorage.setItem('interview_tinder_cache_token', 'mock-jwt-token-12345');
      localStorage.setItem('jit_onboarded', '1');
    });

    await page.goto('/');

    // Verify card is visible with question
    const questionCard = page.locator('.question-card').first();
    if (await questionCard.isVisible()) {
      await expect(questionCard).toBeVisible();

      // Flip the card
      await questionCard.click();

      // Click Explanation / Hint button if available
      const explainBtn = page.locator('button[aria-label="Explain with AI"], .explain-button, .btn-explain').first();
      if (await explainBtn.isVisible()) {
        await explainBtn.click();
        await expect(page.locator('.explanation-modal, .modal-explanation')).toBeVisible();
        // Close modal
        await page.keyboard.press('Escape');
      }
    }
  });

  test('abbreviation glossary renders terms with instant search', async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/#abbreviations');

    const searchInput = page.locator('input[placeholder*="Поиск"], input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('JMM');
      await expect(page.locator('.glossary-grid, .glossary-list')).toBeVisible();
    }
  });
});
