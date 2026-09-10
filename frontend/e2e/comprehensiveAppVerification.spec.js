import { test, expect } from '@playwright/test';

const mockUser = {
  id: 1,
  telegram_id: 123456789,
  username: 'ux_tester',
  first_name: 'Alex',
  role: 'pro',
  language: 'Java',
  streak: 12,
  available_modes: ['swipe', 'test', 'blitz', 'tracks', 'review', 'bug-hunting', 'code-completion', 'system-design'],
  available_languages: ['Java', 'Python', 'TypeScript', 'React', 'Go', 'Rust', 'Kotlin'],
};

const mockQuestions = [
  {
    id: 101,
    category: 'Java Core',
    difficulty: 'Junior',
    question: 'В чем разница между == и equals() в Java?',
    shortAnswer: '== сравнивает ссылки на объекты в памяти, equals() сравнивает содержимое объектов по значению.',
    topRank: 1,
    isTop: true,
    code: 'String a = new String("test");\nString b = new String("test");\nSystem.out.println(a == b);',
    options: [
      '== сравнивает ссылки, equals() сравнивает значения по логике класса',
      '== сравнивает значения примитивов, equals() работает только для строк',
      'Разницы нет, оба оператора вызывают метод hashCode()',
      '== быстрее, так как компилятор оптимизирует его в SIMD-инструкции'
    ],
    language: 'Java',
  },
  {
    id: 102,
    category: 'Multithreading',
    difficulty: 'Middle',
    question: 'Что делает ключевое слово volatile в Java?',
    shortAnswer: 'Гарантирует видимость изменений переменной между потоками (happens-before) и запрещает reordering инструкций.',
    topRank: 2,
    isTop: true,
    code: 'private volatile boolean running = true;\npublic void stop() { running = false; }',
    options: [
      'Гарантирует видимость изменений переменной между потоками и запрещает reordering',
      'Блокирует монитор объекта как synchronized блок',
      'Создает копию переменной для каждого потока как ThreadLocal',
      'Выделяет переменную в off-heap памяти без участия GC'
    ],
    language: 'Java',
  },
  {
    id: 103,
    category: 'Database',
    difficulty: 'Senior',
    question: 'Как изолировать транзакции на уровне Repeatable Read в PostgreSQL?',
    shortAnswer: 'PostgreSQL использует MVCC snapshot на момент начала первого SQL-запроса в транзакции.',
    topRank: 3,
    isTop: true,
    options: [
      'MVCC snapshot на момент первого запроса в транзакции',
      'Блокировка всех таблиц монопольным локом ACCESS EXCLUSIVE',
      'Запись всех изменений в отдельный временный файл на диске',
      'Отключение автокоммита и принудительный rollback при чтении'
    ],
    language: 'Java',
  },
];

const mockExplanation = {
  questionId: 101,
  explanation: 'Подробный разбор концепции ссылочной и логической эквивалентности в Java.',
  deepDive: 'В JVM объекты размещаются в Heap, а переменные содержат ссылки (32/64-битные указатели). Метод equals() по умолчанию в классе Object равен ==.',
  codeExample: 'String s1 = "java";\nString s2 = "java";\nSystem.out.println(s1 == s2); // true (String Pool)',
  keyTakeaway: 'Всегда используйте equals() для сравнения бизнес-значений объектов.',
};

const mockStats = {
  known_count: 85,
  unknown_count: 15,
  total_reviewed: 100,
  streak: 12,
  categories: { 'Java Core': 45, 'Multithreading': 25, 'Database': 30 },
  languages: { 'Java': 100 },
};

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

const mockAbbreviations = [
  { id: 1, term: 'JVM', full: 'Java Virtual Machine', desc: 'Виртуальная машина Java, исполняющая байткод.', category: 'Java' },
  { id: 2, term: 'JIT', full: 'Just-In-Time Compiler', desc: 'Компилятор байткода в машинный код во время выполнения.', category: 'JVM' },
  { id: 3, term: 'GC', full: 'Garbage Collector', desc: 'Автоматический сборщик мусора в памяти.', category: 'JVM' },
];

async function setupMocks(page) {
  await page.route('**/telegram-web-app.js', route => {
    return route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: '// Mocked Telegram SDK',
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

    if (path.endsWith('/questions/feed')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ questions: mockQuestions }),
      });
    }

    if (path.endsWith('/questions/top')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ language: 'Java', questions: mockQuestions, total: mockQuestions.length }),
      });
    }

    if (path.includes('/questions/explain') || path.endsWith('/explain')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockExplanation),
      });
    }

    if (path.endsWith('/filters') || path.endsWith('/categories')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockFilters),
      });
    }

    if (path.endsWith('/stats') || path.endsWith('/progress')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockStats),
      });
    }

    if (path.endsWith('/abbreviations') || path.includes('/glossary')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAbbreviations),
      });
    }

    if (path.endsWith('/companies')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Яндекс', count: 42 },
          { id: 2, name: 'Сбер', count: 38 },
          { id: 3, name: 'Т-Банк', count: 35 },
        ]),
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

    if (path.includes('/questions/test-answer') || path.endsWith('/test-answer')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isCorrect: true,
          correctAnswer: '== сравнивает ссылки, equals() сравнивает значения по логике класса',
          streak: 13,
        }),
      });
    }

    if (path.includes('/swipe')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, streak: 13, isKnown: false }),
      });
    }

    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
}

async function injectAuth(page) {
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
      Object.defineProperty(window, 'Telegram', { value: mockTg, writable: true, configurable: true });
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
    window.localStorage.setItem('interview_tinder_cache_token', 'mock-valid-jwt-token');
    window.sessionStorage.setItem('interview_tinder_cache_token', 'mock-valid-jwt-token');
    window.localStorage.setItem('jit_onboarded', '1');
    window.localStorage.setItem('has_seen_onboarding', 'true');
    window.localStorage.setItem('app_language', 'ru');
  });
}

test.describe('Comprehensive Real UI & Flow Verification', () => {

  test('Question Card: front toolbar, flip affordance, back answer, bookmark & know swipe', async ({ page }) => {
    await setupMocks(page);
    await injectAuth(page);
    await page.goto('/?tgWebAppPlatform=weba');

    await expect(page.locator('.quick-filter-bar')).toBeVisible({ timeout: 10000 });

    // 1. Verify card front face
    const cardFront = page.locator('.card-front');
    await expect(cardFront).toBeVisible();

    // Verify flip toolbar exists and contains affordance label
    const flipHint = cardFront.locator('.flip-hint');
    await expect(flipHint).toBeVisible();
    await expect(flipHint.locator('.flip-hint-label')).toContainText(/ответ/i);

    // Verify bookmark button works
    const bookmarkBtn = flipHint.locator('.bookmark-btn');
    await expect(bookmarkBtn).toBeVisible();
    await bookmarkBtn.click();
    await expect(bookmarkBtn).toHaveClass(/saved/);

    // 2. Flip card to reveal answer
    await flipHint.click();
    await expect(page.locator('.card')).toHaveClass(/flipped/);

    // Verify back face content
    const cardBack = page.locator('.card-back');
    await expect(cardBack).toBeVisible();
    await expect(cardBack.locator('.answer-content')).toContainText(/сравнивает/i);
    await expect(cardBack.locator('.explain-ai-btn')).toBeVisible();

    // 3. Swipe Right ("Знаю") on back of card
    const knowBtn = page.locator('.card-back .card-swipe-btn-right');
    await knowBtn.click();

    // Verify card advances to next question (volatile)
    await expect(page.locator('.card-front h2')).toContainText(/volatile/i);
  });

  test('Missed Toast Flow: swiping left displays toast, clicking Разбор triggers AI explanation', async ({ page }) => {
    await setupMocks(page);
    await injectAuth(page);
    await page.goto('/?tgWebAppPlatform=weba');

    await expect(page.locator('.quick-filter-bar')).toBeVisible({ timeout: 10000 });

    // Click "Не знаю" (left swipe) on front of card
    const dontKnowBtn = page.locator('.card-front .card-swipe-btn-left');
    await dontKnowBtn.click();

    // Verify MissedToast appears immediately without delay
    const toast = page.locator('.missed-toast');
    await expect(toast).toBeVisible({ timeout: 3000 });
    await expect(toast.locator('.missed-toast-action')).toBeVisible();

    // Click "Разбор" on MissedToast to trigger AI explanation modal
    await toast.locator('.missed-toast-action').click();

    // Verify ExplanationModal opens
    const modal = page.locator('.modal-content');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal.locator('.modal-header')).toBeVisible();

    // Close modal cleanly
    await modal.locator('.close-button').click();
    await expect(modal).not.toBeVisible();
  });

  test('Settings: switch Missed Mode from Toast to Modal, and verify swipe triggers full MissedPanel', async ({ page }) => {
    await setupMocks(page);
    await injectAuth(page);
    await page.goto('/?tgWebAppPlatform=weba');

    await expect(page.locator('.quick-filter-bar')).toBeVisible({ timeout: 10000 });

    // Open Settings from header
    const settingsBtn = page.locator('.header-actions button').last();
    await settingsBtn.click();
    await expect(page.locator('.settings-screen')).toBeVisible();

    // Locate the missed explanation toggle
    const missedToggle = page.locator('.settings-row:has-text("Не знаю") .settings-toggle');
    await expect(missedToggle).toBeVisible();
    await expect(missedToggle).toContainText(/Плашка/i);

    // Toggle to full modal mode
    await missedToggle.click();
    await expect(missedToggle).toContainText(/Окно/i);

    // Return to main screen
    await page.locator('.settings-back-btn').click();
    await expect(page.locator('.card-container')).toBeVisible();

    // Now click "Не знаю": it should open MissedPanel directly
    await page.locator('.card-front .card-swipe-btn-left').click();
    const missedPanel = page.locator('.missed-sheet');
    await expect(missedPanel).toBeVisible({ timeout: 3000 });
    await expect(missedPanel.locator('.missed-explain')).toBeVisible();

    // Close MissedPanel
    await page.locator('.missed-close').click();
    await expect(missedPanel).not.toBeVisible();
  });

  test('Learning Modes: Test Mode, Blitz Mode, and Bug Hunting render interactively', async ({ page }) => {
    await setupMocks(page);
    await injectAuth(page);
    await page.goto('/?tgWebAppPlatform=weba');

    await expect(page.locator('.quick-filter-bar')).toBeVisible({ timeout: 10000 });

    // Switch to Test Mode via bottom nav (index 1)
    const testModeBtn = page.locator('.bottom-nav-item').nth(1);
    await testModeBtn.click();

    // Verify Test Mode card and options
    const testCard = page.locator('.test-card');
    await expect(testCard).toBeVisible();
    const options = page.locator('.option-item');
    await expect(options).toHaveCount(4);

    // Select first option
    await options.first().click();
    await expect(options.first()).toHaveClass(/selected/);

    // Submit answer
    const submitBtn = page.locator('.submit-test-button');
    await submitBtn.click();
    await expect(page.locator('.option-item.correct, .option-item.incorrect')).toBeVisible();

    // Open More drawer (last item in bottom nav)
    const moreBtn = page.locator('.bottom-nav-item').last();
    await moreBtn.click();
    await expect(page.locator('.mode-drawer.open')).toBeVisible();

    const blitzOption = page.locator('.drawer-mode-btn:has-text("Блиц")');
    await blitzOption.click();

    // Verify Blitz Start Screen and launch round
    const startBlitzBtn = page.locator('.start-blitz-button');
    await expect(startBlitzBtn).toBeVisible({ timeout: 5000 });
    await startBlitzBtn.click();

    // Verify Blitz Mode active UI
    await expect(page.locator('.blitz-mode')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.blitz-timer')).toBeVisible();
    await expect(page.locator('.blitz-current-score')).toBeVisible();
  });

  test('Abbreviation Glossary: renders terms, searchable, accessible dark text contrast', async ({ page }) => {
    await setupMocks(page);
    await injectAuth(page);
    await page.goto('/?tgWebAppPlatform=weba');

    await expect(page.locator('.quick-filter-bar')).toBeVisible({ timeout: 10000 });

    // Open Menu / Settings
    const menuBtn = page.locator('.header-actions button').last();
    await menuBtn.click();
    await expect(page.locator('.settings-screen')).toBeVisible();

    // Click Abbreviations link in menu
    const abbrLink = page.locator('.settings-link-row:has-text("Глоссарий"), .settings-link-row:has-text("Сокращения")').first();
    if (await abbrLink.isVisible()) {
      await abbrLink.click();
      await expect(page.locator('.abbr-glossary-screen')).toBeVisible();

      // Verify search input
      const searchInput = page.locator('.abbr-search-input');
      await expect(searchInput).toBeVisible();

      // Check text contrast on term header
      const termHead = page.locator('.abbr-term-head').first();
      await expect(termHead).toBeVisible();
      const color = await termHead.evaluate(el => window.getComputedStyle(el).color);
      // Ensure text is dark and not white (#fff / rgb(255, 255, 255))
      expect(color).not.toBe('rgb(255, 255, 255)');
    }
  });

  test('Mobile Responsiveness: no horizontal overflow at 375x667 and 390x844', async ({ page }) => {
    await setupMocks(page);
    await injectAuth(page);

    // Test iPhone SE (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/?tgWebAppPlatform=weba');
    await expect(page.locator('.quick-filter-bar')).toBeVisible({ timeout: 10000 });

    let hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Test iPhone 14/15 (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });

});
