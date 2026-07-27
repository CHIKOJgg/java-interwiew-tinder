import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('loads and shows hero section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Interview')).toBeVisible();
  });

  test('has Try free and Log in buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('button:has-text("Try free")')).toBeVisible();
    await expect(page.locator('button:has-text("Log in")')).toBeVisible();
  });
});

test.describe('Language selection', () => {
  test('shows language grid after landing', async ({ page }) => {
    await page.goto('/');
    const tryFree = page.locator('button:has-text("Try free")');
    await tryFree.click();
    await expect(page.locator('[data-testid="language-selection"]')).toBeVisible();
  });

  test('language cards are clickable', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("Try free")').click();
    const javaCard = page.locator('[data-testid="language-card-Java"]');
    await expect(javaCard).toBeVisible();
  });
});