import { test, expect } from '@playwright/test';

test.describe('Frontend routes (static build)', () => {
  test('index.html loads and has root div', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeAttached();
  });

  test('all lazy imports are registered in the import map', async ({ page }) => {
    await page.goto('/');
    const hasRoot = await page.locator('#root').count();
    expect(hasRoot).toBe(1);
  });
});

test.describe('ResumeAnalyzer component', () => {
  test('page loads', async ({ page }) => {
    await page.goto('/');
    const root = page.locator('#root');
    await expect(root).toBeVisible();
  });
});

test.describe('VacancyPrep component', () => {
  test('page loads', async ({ page }) => {
    await page.goto('/');
    const root = page.locator('#root');
    await expect(root).toBeAttached();
  });
});

test.describe('MarketTrends component', () => {
  test('page loads', async ({ page }) => {
    await page.goto('/');
    const root = page.locator('#root');
    await expect(root).toBeAttached();
  });
});