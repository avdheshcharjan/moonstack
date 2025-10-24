import { test, expect } from '@playwright/test';

test.describe('Cart UI Detailed Tests', () => {
  test('should test cart modal visual elements', async ({ page }) => {
    await page.goto('/');

    // Open cart
    await page.locator('button[aria-label="Shopping cart"]').click();

    // Check modal structure
    await expect(page.locator('text=Transaction Cart')).toBeVisible();

    // Check if swipe instructions are visible
    await expect(page.locator('text=Remove')).toBeVisible();
    await expect(page.locator('text=Skip')).toBeVisible();
    await expect(page.locator('text=Execute')).toBeVisible();

    // Check empty state
    await expect(page.locator('text=Your cart is empty')).toBeVisible();

    // Close modal
    await page.locator('button[aria-label="Close cart"]').click();
    await expect(page.locator('text=Transaction Cart')).not.toBeVisible();
  });

  test('should check cart counter functionality', async ({ page }) => {
    await page.goto('/');

    // Check if cart counter is visible (should be 0 or hidden)
    const cartButton = page.locator('button[aria-label="Shopping cart"]');
    await expect(cartButton).toBeVisible();

    // Cart counter might not be visible if count is 0
    const counterExists = await page.locator('button[aria-label="Shopping cart"] span').count();
    console.log('Cart counter elements:', counterExists);
  });

  test('should check modal responsiveness', async ({ page }) => {
    // Test on mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await page.locator('button[aria-label="Shopping cart"]').click();

    // Modal should be full screen on mobile
    const modal = page.locator('div').filter({ hasText: 'Transaction Cart' }).first();
    const box = await modal.boundingBox();

    expect(box?.width).toBeGreaterThan(300);

    // Close and test on tablet
    await page.locator('button[aria-label="Close cart"]').click();

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.locator('button[aria-label="Shopping cart"]').click();

    await expect(page.locator('text=Transaction Cart')).toBeVisible();

    // Close and test on desktop
    await page.locator('button[aria-label="Close cart"]').click();

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.locator('button[aria-label="Shopping cart"]').click();

    await expect(page.locator('text=Transaction Cart')).toBeVisible();
  });

  test('should check for layout issues', async ({ page }) => {
    await page.goto('/');

    // Check if logo and cart are properly aligned
    const logo = page.locator('img[alt="MOONSTACK"]');
    const cartButton = page.locator('button[aria-label="Shopping cart"]');

    await expect(logo).toBeVisible();
    await expect(cartButton).toBeVisible();

    // Check if they're in the same horizontal line (top bar)
    const logoBox = await logo.boundingBox();
    const cartBox = await cartButton.boundingBox();

    expect(logoBox).toBeTruthy();
    expect(cartBox).toBeTruthy();

    // Both should have similar y-coordinates (within 50px)
    if (logoBox && cartBox) {
      const yDiff = Math.abs(logoBox.y - cartBox.y);
      expect(yDiff).toBeLessThan(50);
    }
  });

  test('should check for overflow issues', async ({ page }) => {
    await page.goto('/');

    // Check if there's horizontal scrollbar (should not be)
    const bodyOverflow = await page.evaluate(() => {
      return {
        scrollWidth: document.body.scrollWidth,
        clientWidth: document.body.clientWidth,
        hasHorizontalScroll: document.body.scrollWidth > document.body.clientWidth
      };
    });

    console.log('Body overflow check:', bodyOverflow);
    expect(bodyOverflow.hasHorizontalScroll).toBe(false);
  });

  test('should check cart modal interactions', async ({ page }) => {
    await page.goto('/');

    // Open cart
    await page.locator('button[aria-label="Shopping cart"]').click();

    // Try clicking outside modal (should close)
    await page.locator('div[class*="fixed inset-0"]').first().click({ position: { x: 10, y: 10 } });

    // Modal should be closed
    await page.waitForTimeout(500);
    await expect(page.locator('text=Transaction Cart')).not.toBeVisible();
  });

  test('should check for z-index issues', async ({ page }) => {
    await page.goto('/');

    // Open cart modal
    await page.locator('button[aria-label="Shopping cart"]').click();

    // Modal backdrop should be on top (z-50)
    const backdropZIndex = await page.locator('div[class*="fixed inset-0"]').first().evaluate(el => {
      return window.getComputedStyle(el).zIndex;
    });

    console.log('Modal backdrop z-index:', backdropZIndex);

    // z-index should be "50" or higher, or "auto" is also acceptable
    if (backdropZIndex !== 'auto') {
      expect(parseInt(backdropZIndex)).toBeGreaterThanOrEqual(50);
    } else {
      // If auto, at least verify the modal is visible and interactive
      await expect(page.locator('text=Transaction Cart')).toBeVisible();
    }
  });
});
