import { test, expect } from '@playwright/test';

// Rich Mock Data with strict unique rankings and all difficulties/categories
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
    id: 46311,
    category: 'Multithreading',
    difficulty: 'Senior',
    question: 'Почему в Java 21 виртуальный поток может «запиниться» (pinning) на carrier thread, и как этого избежать?',
    shortAnswer: 'Виртуальный поток пинится внутри блока synchronized или native-кода; для решения synchronized заменяют на ReentrantLock.',
    topRank: 2,
    isTop: true,
    options: [
      'В блоке synchronized или native-вызове; заменять на ReentrantLock',
      'При превышении лимита Xmx; увеличивать размер хипа',
      'При частом создании CompletableFuture; использовать ForkJoinPool',
      'При вызове Thread.sleep(); заменять на LockSupport.parkNanos()'
    ],
    language: 'Java',
  },
  {
    id: 2,
    category: 'Java Core',
    difficulty: 'Junior',
    question: 'Что такое контракт equals() и hashCode()?',
    shortAnswer: 'Если объекты равны по equals(), их hashCode() должны совпадать. Обратное не обязательно.',
    topRank: 3,
    isTop: true,
    options: [
      'Равные по equals объекты обязаны иметь одинаковый hashCode',
      'Разные объекты всегда обязаны иметь разные hashCode',
      'hashCode вычисляется только один раз при загрузке класса в JVM',
      'При переопределении equals переопределять hashCode запрещено'
    ],
    language: 'Java',
  },
  {
    id: 46312,
    category: 'Multithreading',
    difficulty: 'Senior',
    question: 'В чем главное преимущество StructuredTaskScope по сравнению с CompletableFuture в Java 21?',
    shortAnswer: 'Гарантирует структурированное время жизни подзадач в едином блоке и автоматическую отмену при сбоях.',
    topRank: 4,
    isTop: true,
    options: [
      'Объединяет жизненный цикл подзадач в один блок и отменяет их при первой ошибке',
      'Автоматически переводит вычисления на видеокарту (GPU acceleration)',
      'Устраняет необходимость создания потоков операционной системы навсегда',
      'Позволяет запускать код без виртуальной машины Java через AOT'
    ],
    language: 'Java',
  },
  {
    id: 46315,
    category: 'Spring',
    difficulty: 'Middle',
    question: 'Зачем в Spring Boot 3 при компиляции в GraalVM Native Image необходимы AOT-хинты?',
    shortAnswer: 'GraalVM использует closed-world assumption; рефлексия, прокси и сериализация должны быть объявлены заранее.',
    topRank: 5,
    isTop: true,
    options: [
      'Для предварительной регистрации рефлексии, динамических прокси и ресурсов',
      'Чтобы отключить сборщик мусора в runtime для ускорения микросервиса',
      'Для динамической подгрузки JAR-библиотек во время выполнения',
      'Для автоматической конвертации байткода Java в WebAssembly'
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
  },
  {
    id: 202,
    category: 'Spring',
    difficulty: 'Senior',
    question: 'Как реализовать Transactional Outbox паттерн в Spring Boot с Apache Kafka?',
    shortAnswer: 'Сохранять событие в таблицу outbox в той же транзакции БД, а отдельный poller отправляет в Kafka.',
    options: [
      'Писать событие в таблицу outbox в одной транзакции БД, а CDC/Debezium или poller шлет в Kafka',
      'Использовать двухфазный коммит XA между PostgreSQL и Kafka кластером',
      'Оборачивать вызов kafkaTemplate.send() в блок synchronized',
      'Слушать топик Kafka через @RetryableTopic без использования БД'
    ],
    language: 'Java',
  }
];

const mockFilters = {
  language: 'Java',
  categories: [
    { name: 'Java Core', count: 35 },
    { name: 'Multithreading', count: 28 },
    { name: 'Spring', count: 42 },
    { name: 'Database', count: 18 },
  ],
  difficulties: [
    { name: 'Junior', count: 45 },
    { name: 'Middle', count: 52 },
    { name: 'Senior', count: 26 },
  ],
  frameworks: [
    { name: 'Spring Boot', count: 40 },
    { name: 'Hibernate', count: 15 },
  ],
  topics: [
    { name: 'Concurrency', count: 25 },
    { name: 'Architecture', count: 20 },
  ],
};

const mockStats = {
  known_count: 85,
  total_reviewed: 120,
  streak: 12,
  categories: { 'Java Core': 30, 'Multithreading': 25, 'Spring': 30 },
  languages: { 'Java': 85 },
};

async function setupComprehensiveMocks(page) {
  // Block external telegram sdk script so it cannot load or delay
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
      const category = url.searchParams.get('category');
      const q = (url.searchParams.get('q') || '').toLowerCase().trim();
      let questions = mockTopQuestions;
      if (category) {
        questions = questions.filter(item => item.category === category);
      }
      if (q) {
        questions = questions.filter(item => item.question.toLowerCase().includes(q) || item.shortAnswer.toLowerCase().includes(q));
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ language: 'Java', questions, total: questions.length, hasMore: false }),
      });
    }

    if (path.endsWith('/questions/feed')) {
      const difficulty = url.searchParams.get('difficulty');
      const category = url.searchParams.get('category');
      const search = (url.searchParams.get('search') || '').toLowerCase().trim();
      let questions = mockFeedQuestions;
      if (difficulty) {
        questions = questions.filter(item => item.difficulty === difficulty);
      }
      if (category) {
        questions = questions.filter(item => item.category === category);
      }
      if (search) {
        questions = questions.filter(item => item.question.toLowerCase().includes(search) || item.shortAnswer.toLowerCase().includes(search));
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ questions }),
      });
    }

    if (path.endsWith('/filters')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockFilters),
      });
    }

    if (path.endsWith('/categories')) {
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

    // Default catch-all
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

test.describe('Comprehensive UX/UI & Layout Verification', () => {

  test('Top Questions Screen: verify layout is NOT squashed, tabs have full height, and ranks are unique', async ({ page }) => {
    await setupComprehensiveMocks(page);
    await injectAuthenticatedState(page);
    await page.goto('/?tgWebAppPlatform=weba');

    // Wait for the app to initialize into main screen with QuickFilterBar
    await expect(page.locator('.quick-filter-bar')).toBeVisible({ timeout: 10000 });

    // Open Filters modal from header
    const filterBtn = page.locator('.header .filter-btn');
    await expect(filterBtn).toBeVisible();
    await filterBtn.click();

    // In CategorySelection, click "Список →" in the TOP 100 banner
    const topListBtn = page.locator('.top-100-list-btn');
    await expect(topListBtn).toBeVisible();
    await topListBtn.click();

    // Verify Top Questions container is mounted
    const screen = page.locator('.top-questions-screen');
    await expect(screen).toBeVisible();

    // 1. Verify Language Tabs are NOT squashed and have adequate height (>= 32px)
    const langTabs = page.locator('.top-lang-tab');
    const tabCount = await langTabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(4);

    for (let i = 0; i < tabCount; i++) {
      const tab = langTabs.nth(i);
      await expect(tab).toBeVisible();
      const box = await tab.boundingBox();
      expect(box).not.toBeNull();
      // Crucial test: height must be >= 32px (NOT crushed to 4px)
      expect(box.height).toBeGreaterThanOrEqual(32);
      expect(box.width).toBeGreaterThanOrEqual(50);
      const text = await tab.textContent();
      expect(text.trim().length).toBeGreaterThan(1);
    }

    // 2. Verify Category Pills are NOT squashed (height >= 26px)
    const catPills = page.locator('.top-cat-pill');
    const pillCount = await catPills.count();
    if (pillCount > 0) {
      for (let i = 0; i < pillCount; i++) {
        const pill = catPills.nth(i);
        await expect(pill).toBeVisible();
        const box = await pill.boundingBox();
        expect(box).not.toBeNull();
        expect(box.height).toBeGreaterThanOrEqual(26);
      }
    }

    // 3. Verify Ranks are Strictly Unique and Sequential (#1, #2, #3, #4, #5)
    const rankBadges = page.locator('.top-rank-badge');
    const badgeCount = await rankBadges.count();
    expect(badgeCount).toBeGreaterThanOrEqual(3);

    const seenRanks = new Set();
    for (let i = 0; i < badgeCount; i++) {
      const text = (await rankBadges.nth(i).textContent()).trim();
      expect(text).toMatch(/^#\d+$/);
      expect(seenRanks.has(text)).toBeFalsy(); // NO DUPLICATE RANKS!
      seenRanks.add(text);
    }

    // 4. Test Live Search Filtering
    const searchInput = page.locator('.top-search-input');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('виртуальный поток');

    // Should filter down to the multithreading question
    const cards = page.locator('.top-card');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('виртуальный поток');

    // Clear search
    const clearBtn = page.locator('.top-search-clear');
    await clearBtn.click();
    await expect(page.locator('.top-card')).toHaveCount(mockTopQuestions.length);

    // 5. Test Card Expand and Details
    const firstCardHeader = page.locator('.top-card-header').first();
    await firstCardHeader.click();
    const body = page.locator('.top-card-body').first();
    await expect(body).toBeVisible();
    await expect(body.locator('.top-card-answer')).toBeVisible();
    await expect(body.locator('.top-explain-btn')).toBeVisible();
    await expect(body.locator('.top-save-btn')).toBeVisible();
  });

  test('Question Navigator Modal: open, search, switch difficulty tabs, and jump to card', async ({ page }) => {
    await setupComprehensiveMocks(page);
    await injectAuthenticatedState(page);
    await page.goto('/?tgWebAppPlatform=weba');

    // 1. Check QuickFilterBar is visible with Navigator trigger
    await expect(page.locator('.quick-filter-bar')).toBeVisible({ timeout: 10000 });
    const navTrigger = page.locator('.quick-nav-open-btn');
    await expect(navTrigger).toBeVisible();
    await navTrigger.click();

    // 2. Navigator modal should appear
    const modal = page.locator('.navigator-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.navigator-header-title h3')).toContainText('Навигатор');

    // 3. Check level tabs with counts (Все, Junior, Middle, Senior)
    const levelTabs = modal.locator('.nav-diff-tab');
    await expect(levelTabs).toHaveCount(4);

    // Click 'Senior' tab
    const seniorTab = modal.locator('.nav-diff-tab.diff-senior');
    await seniorTab.click();
    await expect(seniorTab).toHaveClass(/active/);

    // 4. Search in navigator
    const navSearch = modal.locator('.navigator-search-input');
    await navSearch.fill('Outbox');
    const navCards = modal.locator('.nav-question-card');
    await expect(navCards.first()).toBeVisible();
    await expect(navCards.first()).toContainText('Outbox');

    // 5. Jump to question
    const jumpBtn = modal.locator('.nav-open-btn').first();
    await jumpBtn.click();

    // Modal should close and question should be active on screen
    await expect(modal).not.toBeVisible();
    const activeQuestion = page.locator('.question-card, .card-container').first();
    await expect(activeQuestion).toBeVisible();
  });

  test('QuickFilterBar: question stepper (prev/next) and difficulty counters', async ({ page }) => {
    await setupComprehensiveMocks(page);
    await injectAuthenticatedState(page);
    await page.goto('/?tgWebAppPlatform=weba');

    const quickBar = page.locator('.quick-filter-bar');
    await expect(quickBar).toBeVisible({ timeout: 10000 });

    // 1. Difficulty chips should display question counts (e.g. Junior, Middle, Senior)
    const chips = quickBar.locator('.quick-diff-chip');
    expect(await chips.count()).toBeGreaterThanOrEqual(3);

    // 2. Stepper should have Previous, Indicator, and Next buttons
    const stepper = quickBar.locator('.quick-stepper-group');
    await expect(stepper).toBeVisible();
    const prevBtn = stepper.locator('.quick-step-btn').first();
    const nextBtn = stepper.locator('.quick-step-btn').last();
    const counter = stepper.locator('.quick-step-text');

    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();
    await expect(counter).toContainText('1/');

    // Click Next button -> Advances to next card
    await nextBtn.click();
    await expect(counter).toContainText('2/');

    // Click Prev button -> Returns to previous card
    await prevBtn.click();
    await expect(counter).toContainText('1/');
  });

  test('Mobile Responsiveness: no horizontal overflow and touch-friendly controls at 375x667', async ({ page }) => {
    // Set iPhone SE / mobile screen size
    await page.setViewportSize({ width: 375, height: 667 });
    await setupComprehensiveMocks(page);
    await injectAuthenticatedState(page);
    await page.goto('/?tgWebAppPlatform=weba');

    await expect(page.locator('.quick-filter-bar')).toBeVisible({ timeout: 10000 });

    // Check that document body has no horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 1;
    });
    expect(hasHorizontalOverflow).toBeFalsy();

    // Check QuestionCard touch target sizing
    const card = page.locator('.question-card, .tinder-card').first();
    if (await card.isVisible()) {
      const box = await card.boundingBox();
      expect(box.width).toBeLessThanOrEqual(375);
      expect(box.width).toBeGreaterThanOrEqual(280);
    }
  });

});
