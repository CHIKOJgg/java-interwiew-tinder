import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Global Telegram WebApp stub so components that read window.Telegram don't crash.
if (!window.Telegram) {
  window.Telegram = {
    WebApp: {
      initData: '',
      initDataUnsafe: { user: { id: 1, language_code: 'en' } },
      ready: vi.fn(),
      expand: vi.fn(),
      showPopup: vi.fn(),
      shareToStory: vi.fn(),
      openTelegramLink: vi.fn(),
      colorScheme: 'light',
      themeParams: {},
    },
  };
}

// matchMedia stub (used by some UI branches)
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// ResizeObserver stub
if (!global.ResizeObserver) {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// scrollIntoView stub (used by debug overlay / modals)
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}
