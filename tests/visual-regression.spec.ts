import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('should capture homepage screenshots at different viewports', async ({ page }) => {
    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.screenshot({ path: 'test-results/homepage-desktop.png', fullPage: true });
    console.log('Desktop screenshot saved');

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.screenshot({ path: 'test-results/homepage-tablet.png', fullPage: true });
    console.log('Tablet screenshot saved');

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.screenshot({ path: 'test-results/homepage-mobile.png', fullPage: true });
    console.log('Mobile screenshot saved');
  });

  test('should capture cart modal screenshots', async ({ page }) => {
    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.locator('button[aria-label="Shopping cart"]').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/cart-modal-desktop.png' });
    console.log('Cart modal desktop screenshot saved');
    await page.locator('button[aria-label="Close cart"]').click();

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.locator('button[aria-label="Shopping cart"]').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/cart-modal-mobile.png' });
    console.log('Cart modal mobile screenshot saved');
  });

  test('should verify cart modal appearance and styling', async ({ page }) => {
    await page.goto('/');
    await page.locator('button[aria-label="Shopping cart"]').click();

    // Check modal background
    const modal = page.locator('text=Transaction Cart').locator('..').locator('..');
    const backgroundColor = await modal.evaluate(el => {
      const parentDiv = el.querySelector('div');
      return parentDiv ? window.getComputedStyle(parentDiv).backgroundColor : null;
    });

    console.log('Modal background color:', backgroundColor);

    // Check if instructions are styled correctly
    const removeInstruction = page.locator('text=Remove');
    const skipInstruction = page.locator('text=Skip');
    const executeInstruction = page.locator('text=Execute');

    await expect(removeInstruction).toBeVisible();
    await expect(skipInstruction).toBeVisible();
    await expect(executeInstruction).toBeVisible();

    // Check empty state styling
    await expect(page.locator('text=Your cart is empty')).toBeVisible();
    await expect(page.locator('text=Add transactions by swiping cards')).toBeVisible();
  });
});
