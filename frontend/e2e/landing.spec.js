import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('loads and shows hero CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeAttached();
    await expect(page.locator('#ctaHero')).toBeVisible();
  });

  test('hero CTA opens the free demo deck', async ({ page }) => {
    await page.goto('/');
    await page.locator('#ctaHero').click();
    await expect(page.locator('.demo')).toBeVisible();
    await expect(page.locator('.demo-card-shell').first()).toBeVisible();
  });
});

test.describe('Demo deck (zero-login)', () => {
  test('shows language tabs and a question card', async ({ page }) => {
    await page.goto('/');
    await page.locator('#ctaHero').click();
    await expect(page.locator('.demo-langs').first()).toBeVisible();
    await expect(page.locator('.demo-counter').first()).toBeVisible();
  });

  test('flip reveals the short answer', async ({ page }) => {
    await page.goto('/');
    await page.locator('#ctaHero').click();
    const card = page.locator('.demo-card-shell').first();
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.locator('.demo-back').first()).toBeVisible();
  });

  test('answering advances the counter', async ({ page }) => {
    await page.goto('/');
    await page.locator('#ctaHero').click();
    const counter = page.locator('.demo-counter').first();
    await expect(counter).toContainText('1 /');
    await page.locator('.demo-swipe').first().click();
    await expect(counter).toContainText('2 /');
  });
});
