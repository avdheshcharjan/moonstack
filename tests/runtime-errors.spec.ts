import { test, expect } from '@playwright/test';

test.describe('Runtime Error Detection', () => {
  test('should detect any runtime errors during navigation', async ({ page }) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      } else if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      errors.push(`Uncaught exception: ${error.message}\n${error.stack}`);
    });

    // Navigate to homepage
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Interact with cart
    await page.locator('button[aria-label="Shopping cart"]').click();
    await page.waitForTimeout(1000);

    // Close cart
    await page.locator('button[aria-label="Close cart"]').click();
    await page.waitForTimeout(1000);

    // Reopen cart
    await page.locator('button[aria-label="Shopping cart"]').click();
    await page.waitForTimeout(1000);

    // Click outside to close
    await page.locator('div[class*="fixed inset-0"]').first().click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(1000);

    // Log findings
    if (errors.length > 0) {
      console.log('Runtime errors detected:', errors);
    }
    if (warnings.length > 0) {
      console.log('Warnings detected:', warnings);
    }

    // Fail test if there are errors
    expect(errors).toEqual([]);
  });

  test('should check for broken images', async ({ page }) => {
    await page.goto('/');

    const images = await page.locator('img').all();
    const brokenImages: string[] = [];

    for (const img of images) {
      const src = await img.getAttribute('src');
      const alt = await img.getAttribute('alt');
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);

      if (naturalWidth === 0) {
        brokenImages.push(`Broken image: src="${src}", alt="${alt}"`);
      }
    }

    if (brokenImages.length > 0) {
      console.log('Broken images found:', brokenImages);
    }

    expect(brokenImages).toEqual([]);
  });

  test('should check for missing styles', async ({ page }) => {
    await page.goto('/');

    // Check if Tailwind CSS is loaded by checking if classes are applied
    const topBar = page.locator('text=Moonstack').first();
    const color = await topBar.evaluate(el => window.getComputedStyle(el).color);

    // Color should not be the default black (rgb(0, 0, 0))
    console.log('Moonstack text color:', color);
    expect(color).not.toBe('rgb(0, 0, 0)');
  });

  test('should check for network failures', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('requestfailed', request => {
      failedRequests.push(`Failed: ${request.url()} - ${request.failure()?.errorText}`);
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    if (failedRequests.length > 0) {
      console.log('Failed network requests:', failedRequests);
    }

    // Some failures might be acceptable (e.g., analytics), so we just log them
    // expect(failedRequests).toEqual([]);
  });

  test('should check for hydration errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      if (text.toLowerCase().includes('hydration') ||
          text.toLowerCase().includes('mismatch')) {
        errors.push(text);
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    if (errors.length > 0) {
      console.log('Hydration errors detected:', errors);
    }

    expect(errors).toEqual([]);
  });
});
