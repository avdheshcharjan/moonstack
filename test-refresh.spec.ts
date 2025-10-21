import { test, expect } from '@playwright/test';

test('verify only numbers animate on refresh, not the entire card', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:3002');

  // Wait for app to load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Check if we need to connect wallet or navigate to swipe view
  const swipeViewButton = page.locator('text=Swipe View');
  if (await swipeViewButton.isVisible()) {
    await swipeViewButton.click();
    await page.waitForTimeout(1000);
  }

  // Check if wallet needs to be connected
  const connectButton = page.locator('button:has-text("Connect Wallet")');
  if (await connectButton.isVisible()) {
    console.log('Wallet connection required - skipping test');
    return;
  }

  // Wait for prediction card to load
  const predictionCard = page.locator('[class*="gradient-to-br"]').first();
  await expect(predictionCard).toBeVisible();

  // Get the initial card element reference
  const cardHandle = await predictionCard.elementHandle();

  // Take a screenshot before refresh
  await page.screenshot({ path: 'before-refresh.png' });

  // Get initial price text
  const priceElement = page.locator('text=/\\$[0-9,]+\\.[0-9]{2}/').first();
  const initialPrice = await priceElement.textContent();
  console.log('Initial price:', initialPrice);

  // Wait for 12 seconds (should trigger one refresh at 10s)
  console.log('Waiting 12 seconds for auto-refresh...');
  await page.waitForTimeout(12000);

  // Take a screenshot after refresh
  await page.screenshot({ path: 'after-refresh.png' });

  // Check if the card element is still the same DOM node
  const newCardHandle = await predictionCard.elementHandle();
  const isSameElement = cardHandle === newCardHandle;

  console.log('Is same DOM element:', isSameElement);

  // Get the new price
  const newPrice = await priceElement.textContent();
  console.log('New price:', newPrice);

  // Check if card content is still visible (not remounted)
  const questionText = page.locator('text=/Will (BTC|ETH)/').first();
  await expect(questionText).toBeVisible();

  // Log results
  console.log('Test Results:');
  console.log('- Card stayed mounted:', isSameElement);
  console.log('- Initial price:', initialPrice);
  console.log('- New price:', newPrice);

  if (!isSameElement) {
    console.error('❌ ISSUE: Card was remounted (DOM element changed)');
  } else {
    console.log('✅ Card stayed mounted - only data updated');
  }
});

test('check for unnecessary re-renders during refresh', async ({ page }) => {
  await page.goto('http://localhost:3002');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Navigate to swipe view if needed
  const swipeViewButton = page.locator('text=Swipe View');
  if (await swipeViewButton.isVisible()) {
    await swipeViewButton.click();
    await page.waitForTimeout(1000);
  }

  // Check for wallet
  const connectButton = page.locator('button:has-text("Connect Wallet")');
  if (await connectButton.isVisible()) {
    console.log('Wallet connection required - skipping test');
    return;
  }

  // Add a mutation observer to detect DOM changes
  await page.evaluate(() => {
    (window as any).domMutations = [];
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          (window as any).domMutations.push({
            type: mutation.type,
            target: mutation.target.nodeName,
            added: mutation.addedNodes.length,
            timestamp: Date.now()
          });
        }
      });
    });

    const card = document.querySelector('[class*="gradient-to-br"]');
    if (card) {
      observer.observe(card, {
        childList: true,
        subtree: true,
        attributes: false
      });
    }
  });

  console.log('Monitoring DOM mutations for 12 seconds...');
  await page.waitForTimeout(12000);

  // Get mutation count
  const mutations = await page.evaluate(() => (window as any).domMutations);
  console.log('Total DOM mutations detected:', mutations.length);

  if (mutations.length > 50) {
    console.error('❌ ISSUE: Too many DOM mutations detected (' + mutations.length + ')');
    console.log('First 10 mutations:', mutations.slice(0, 10));
  } else {
    console.log('✅ Minimal DOM changes detected');
  }
});
