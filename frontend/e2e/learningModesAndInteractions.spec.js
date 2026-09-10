import { test, expect } from '@playwright/test';

const mockUser = {
  id: 1,
  telegram_id: 123456789,
  username: 'ux_tester',
  first_name: 'Alex',
  role: 'pro',
  language: 'Java',
  streak: 12,
  available_modes: ['swipe', 'test', 'blitz', 'tracks', 'review'],
  available_languages: ['Java', 'Python', 'TypeScript', 'React', 'Go', 'Rust', 'Kotlin'],
};

const mockTopQuestions = [
  {
    id: 1,
    category: 'Java Core',
    difficulty: 'Junior',
    question: 'В чем разница между == и equals() в Java?',
    shortAnswer: '== сравнивает ссылки на объекты в памяти, equals() сравнивает содержимое объектов по значению.',
    topRank: 1,
    isTop: true,
    options: [
      '== сравнивает ссылки, equals() сравнивает значения по логике класса',
      '== сравнивает значения примитивов, equals() работает только для строк',
      'Разницы нет, оба оператора вызывают метод hashCode()',
      '== быстрее, так как компилятор оптимизирует его в SIMD-инструкции'
    ],
    language: 'Java',
  },
  {
    id: 2,
    category: 'Java Core',
    difficulty: 'Junior',
    question: 'Что такое контракт equals() и hashCode()?',
    shortAnswer: 'Если объекты равны по equals(), их hashCode() должны совпадать. Обратное не обязательно.',
    topRank: 2,
    isTop: true,
    options: [
      'Равные по equals объекты обязаны иметь одинаковый hashCode',
      'Разные объекты всегда обязаны иметь разные hashCode',
      'hashCode вычисляется только один раз при загрузке класса в JVM',
      'При переопределении equals переопределять hashCode запрещено'
    ],
    language: 'Java',
  },
];

const mockFeedQuestions = [
  ...mockTopQuestions,
  {
    id: 201,
    category: 'Database',
    difficulty: 'Middle',
    question: 'Как изолировать транзакции на уровне Repeatable Read в PostgreSQL?',
    shortAnswer: 'PostgreSQL использует MVCC snapshot на момент начала первого SQL-запроса в транзакции.',
    options: [
      'MVCC snapshot на момент первого запроса в транзакции',
      'Блокировка всех таблиц монопольным локом ACCESS EXCLUSIVE',
      'Запись всех изменений в отдельный временный файл на диске',
      'Отключение автокоммита и принудительный rollback при чтении'
    ],
    language: 'Java',
  }
];

const mockFilters = {
  language: 'Java',
  categories: [
    { name: 'Java Core', count: 35 },
    { name: 'Multithreading', count: 28 },
    { name: 'Database', count: 18 },
  ],
  difficulties: [
    { name: 'Junior', count: 45 },
    { name: 'Middle', count: 52 },
    { name: 'Senior', count: 26 },
  ],
  frameworks: [
    { name: 'Spring Boot', count: 40 },
  ],
  topics: [
    { name: 'Concurrency', count: 25 },
  ],
};

const mockStats = {
  known_count: 85,
  total_reviewed: 120,
  streak: 12,
  categories: { 'Java Core': 30, 'Multithreading': 25 },
  languages: { 'Java': 85 },
};

async function setupComprehensiveMocks(page) {
  await page.route('**/telegram-web-app.js', route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: '// Telegram WebApp SDK Mocked',
    });
  });

  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path.includes('/auth/login') || path.includes('/auth/telegram')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: mockUser,
          token: 'mock-valid-jwt-token',
          tracks: [],
          stats: mockStats,
        }),
      });
    }

    if (path.endsWith('/tracks')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tracks: [] }),
      });
    }

    if (path.endsWith('/badges')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }

    if (path.endsWith('/progress')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    }

    if (path.endsWith('/questions/top')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ language: 'Java', questions: mockTopQuestions, total: mockTopQuestions.length, hasMore: false }),
      });
    }

    if (path.endsWith('/questions/feed')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ questions: mockFeedQuestions }),
      });
    }

    if (path.endsWith('/filters') || path.endsWith('/categories')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockFilters),
      });
    }

    if (path.endsWith('/stats')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockStats),
      });
    }

    if (path.includes('/swipe')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, streak: 13, isKnown: true }),
      });
    }

    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });
}

async function injectAuthenticatedState(page) {
  await page.addInitScript(() => {
    const mockTg = {
      WebApp: {
        initData: 'query_id=AAHdF6IQAAAAAN0XohD123&user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Alex%22%2C%22username%22%3A%22ux_tester%22%7D',
        initDataUnsafe: {
          user: { id: 123456789, first_name: 'Alex', username: 'ux_tester' },
        },
        ready: () => {},
        expand: () => {},
        close: () => {},
        setBackgroundColor: () => {},
        setHeaderColor: () => {},
        onEvent: () => {},
        offEvent: () => {},
        MainButton: {
          setParams: () => {},
          show: () => {},
          hide: () => {},
          onClick: () => {},
          offClick: () => {},
        },
        safeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
        contentSafeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
      },
    };
    try {
      Object.defineProperty(window, 'Telegram', {
        value: mockTg,
        writable: true,
        configurable: true,
      });
    } catch {
      window.Telegram = mockTg;
    }
    window.localStorage.setItem('jit_user', JSON.stringify({
      id: 1,
      telegram_id: 123456789,
      language: 'Java',
      role: 'pro',
    }));
    window.sessionStorage.setItem('jit_token', 'mock-valid-jwt-token');
    window.localStorage.setItem('jit_onboarded', '1');
    window.localStorage.setItem('has_seen_onboarding', 'true');
    window.localStorage.setItem('app_language', 'ru');
  });
}

test.describe('Learning Modes, Quick Filters & Settings E2E Interactions', () => {

  test('switches learning modes from Swipe to Test mode and opens More drawer', async ({ page }) => {
    await setupComprehensiveMocks(page);
    await injectAuthenticatedState(page);
    await page.goto('/?tgWebAppPlatform=weba');

    await expect(page.locator('.quick-filter-bar')).toBeVisible({ timeout: 10000 });

    // Initial state: Card deck / question card is visible
    await expect(page.locator('.card-container, .question-card').first()).toBeVisible();

    // Click 'Test' mode button in bottom navigation (2nd item)
    const testModeBtn = page.locator('.bottom-nav-item').nth(1);
    await testModeBtn.click();

    // Verify Test Mode container or card is visible
    await expect(page.locator('.test-mode-container, .test-card')).toBeVisible({ timeout: 5000 });

    // Open More drawer (last button in bottom nav)
    const moreBtn = page.locator('.bottom-nav-item').last();
    await moreBtn.click();

    // Verify drawer opened
    await expect(page.locator('.mode-drawer.open')).toBeVisible();

    // Click Top Questions button inside drawer
    const topQuestionsBtn = page.locator('.drawer-mode-btn').first();
    await topQuestionsBtn.click();

    // Drawer closes and Top Questions screen appears
    await expect(page.locator('.mode-drawer.open')).toHaveCount(0);
  });

  test('toggles difficulty and Top 100 filter in QuickFilterBar', async ({ page }) => {
    await setupComprehensiveMocks(page);
    await injectAuthenticatedState(page);
    await page.goto('/?tgWebAppPlatform=weba');

    await expect(page.locator('.quick-filter-bar')).toBeVisible({ timeout: 10000 });

    // Click Junior difficulty chip
    const juniorChip = page.locator('.quick-diff-chip.diff-junior');
    await juniorChip.click();
    await expect(juniorChip).toHaveClass(/active/);

    // Toggle Top 100 chip
    const top100Chip = page.locator('.quick-top100-chip');
    await top100Chip.click();
    await expect(top100Chip).toHaveClass(/active/);

    // Click All difficulty chip to reset difficulty
    const allChip = page.locator('.quick-diff-chip').first();
    await allChip.click();
    await expect(juniorChip).not.toHaveClass(/active/);
  });

  test('opens Settings, switches interface language, and navigates to Subscriptions', async ({ page }) => {
    await setupComprehensiveMocks(page);
    await injectAuthenticatedState(page);
    await page.goto('/?tgWebAppPlatform=weba');

    await expect(page.locator('.quick-filter-bar')).toBeVisible({ timeout: 10000 });

    // Click settings button (Menu icon) in header
    const settingsBtn = page.locator('.header-actions button').last();
    await settingsBtn.click();

    // Settings screen is visible
    await expect(page.locator('.settings-screen')).toBeVisible({ timeout: 5000 });

    // Switch interface language to EN
    const enChip = page.locator('.settings-chip:has-text("EN")');
    await enChip.click();
    await expect(enChip).toHaveClass(/active/);

    // Toggle Notifications
    const notifToggle = page.locator('.settings-toggle');
    const initialText = await notifToggle.textContent();
    await notifToggle.click();
    expect(await notifToggle.textContent()).not.toBe(initialText);

    // Click Subscription link row in Settings
    const subRow = page.locator('.settings-link-row').first();
    await subRow.click();
  });

  test('opens CategorySelection modal from header and searches categories', async ({ page }) => {
    await setupComprehensiveMocks(page);
    await injectAuthenticatedState(page);
    await page.goto('/?tgWebAppPlatform=weba');

    await expect(page.locator('.quick-filter-bar')).toBeVisible({ timeout: 10000 });

    // Open filter modal from header
    const filterBtn = page.locator('.header .filter-btn');
    await expect(filterBtn).toBeVisible();
    await filterBtn.click();

    // Category selection screen is now rendered
    await expect(page.locator('.category-screen, .category-selection, .category-modal').first()).toBeVisible({ timeout: 5000 });

    // Search input
    const searchInput = page.locator('input[placeholder*="Поиск"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Core');
      await expect(page.locator('text=Core').first()).toBeVisible();
    }
  });
});
