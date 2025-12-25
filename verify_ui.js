
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to the dashboard
    await page.goto('http://localhost:5175');

    // Check initial state (Dashboard active)
    await page.waitForSelector('.view.active[data-testid="view-dashboard"]');

    // Take screenshot of Dashboard
    await page.screenshot({ path: 'jules_review/verification/01_dashboard_verify.png' });
    console.log('Dashboard screenshot taken');

    // Click Gifts
    await page.click('[data-testid="nav-gifts"]');
    await page.waitForSelector('.view.active[data-testid="view-settings-gifts"]');

    // Verify Nav State: Gifts active, TTS inactive (the bug)
    const isGiftsActive = await page.$eval('[data-testid="nav-gifts"]', el => el.classList.contains('active'));
    const isTTSActive = await page.$eval('[data-testid="nav-tts"]', el => el.classList.contains('active'));

    if (isGiftsActive && !isTTSActive) {
        console.log('SUCCESS: Nav State Correct (Gifts Active, TTS Inactive)');
    } else {
        console.error('FAILURE: Nav State Incorrect', { isGiftsActive, isTTSActive });
    }

    await page.screenshot({ path: 'jules_review/verification/02_gifts_nav_verify.png' });

    // Open Overlay Composer and check Stage
    await page.click('[data-testid="nav-composer"]');
    await page.waitForSelector('#stage-container');
    await page.screenshot({ path: 'jules_review/verification/03_composer_verify.png' });

  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    await browser.close();
  }
})();
