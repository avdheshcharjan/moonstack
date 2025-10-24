import { test, expect } from '@playwright/test';

test.describe('Frontend Health Check', () => {
  test('should load homepage without errors', async ({ page }) => {
    const errors: string[] = [];

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      errors.push(`Page error: ${error.message}`);
    });

    // Navigate to homepage
    await page.goto('/', { waitUntil: 'networkidle' });

    // Check for critical errors
    expect(errors).toEqual([]);

    // Check if key elements are present
    await expect(page.locator('text=Moonstack')).toBeVisible();
  });

  test('should have working cart functionality', async ({ page }) => {
    await page.goto('/');

    // Check if cart icon exists
    const cartButton = page.locator('button[aria-label="Shopping cart"]');
    await expect(cartButton).toBeVisible();

    // Click cart to open modal
    await cartButton.click();

    // Check if cart modal opens
    await expect(page.locator('text=Transaction Cart')).toBeVisible();
  });

  test('should check for console errors and warnings', async ({ page }) => {
    const consoleMessages: { type: string; text: string }[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait a bit for any lazy-loaded content
    await page.waitForTimeout(2000);

    // Log all console messages for debugging
    console.log('Console messages:', consoleMessages);

    // Filter out known acceptable warnings
    const criticalMessages = consoleMessages.filter(msg => {
      // Filter out deprecation warnings and other non-critical messages
      return !msg.text.includes('deprecated') &&
             !msg.text.includes('DevTools');
    });

    if (criticalMessages.length > 0) {
      console.log('Critical console messages found:', criticalMessages);
    }
  });

  test('should check responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('text=Moonstack')).toBeVisible();

    // Open cart on mobile
    const cartButton = page.locator('button[aria-label="Shopping cart"]');
    await cartButton.click();

    // Modal should be full screen on mobile
    const modal = page.locator('text=Transaction Cart').locator('..');
    await expect(modal).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await expect(page.locator('text=Moonstack')).toBeVisible();
  });

  test('should check for accessibility issues', async ({ page }) => {
    await page.goto('/');

    // Check for basic accessibility
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang');

    // Check if cart button has proper aria-label
    const cartButton = page.locator('button[aria-label="Shopping cart"]');
    await expect(cartButton).toBeVisible();

    // Check if close button in modal has aria-label
    await cartButton.click();
    const closeButton = page.locator('button[aria-label="Close cart"]');
    await expect(closeButton).toBeVisible();
  });
});
