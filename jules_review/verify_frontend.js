const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // We assume the server is running on localhost:5175 from 'npm run start:test'
    // or we can use the file directly if static (but we have dynamic logic).
    // The previous step indicated tests timed out, implying the server might not be up or tests were slow.
    // We should try to access the running server if possible.
    // However, since we are in a new step, we might need to start it.
    // BUT the instructions say "execute this command... run it as a background process".

    // Let's try to access the app.
    try {
        await page.goto('http://localhost:5175', { timeout: 10000 });
    } catch (e) {
        console.log("Server not reachable, trying to load file directly for static checks or failing...");
        // Fallback to file for static checking if server isn't up
        const filePath = 'file://' + path.resolve(__dirname, '../../public/index.html');
        await page.goto(filePath);
    }

    // 1. Verify Dashboard Active
    await page.waitForTimeout(1000); // Wait for animations
    await page.screenshot({ path: 'jules_review/verification/01_dashboard.png' });

    // 2. Navigate to Settings System
    const navSystem = page.locator('[data-testid="nav-system"]');
    await navSystem.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'jules_review/verification/02_settings_system.png' });

    // Verify nav state
    const activeNavs = await page.locator('.nav-item.active').count();
    console.log("Active Navs Count:", activeNavs);
    if(activeNavs !== 1) console.error("FAIL: Multiple active navs!");

    // 3. Navigate to Broadcast (OBS UI)
    const navBroadcast = page.locator('[data-testid="nav-broadcast"]');
    await navBroadcast.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'jules_review/verification/03_settings_broadcast.png' });

    await browser.close();
})();
