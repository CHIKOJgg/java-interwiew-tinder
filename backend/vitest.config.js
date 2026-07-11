import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html'],
    include: ['src/**/*.js'],
    thresholds: {
      statements: 20,
      branches: 15,
      functions: 15,
      lines: 20,
    },
  },
});
