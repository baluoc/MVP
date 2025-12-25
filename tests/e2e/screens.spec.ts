import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'jules_review', 'verification');

test.beforeAll(() => {
    // Clear old screens
    if (fs.existsSync(SCREENSHOT_DIR)) {
        fs.rmSync(SCREENSHOT_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test('automated screenshots of all views', async ({ page }) => {
  test.setTimeout(60000);

  // 1. Dashboard
  await page.goto('/');
  await expect(page.getByTestId('view-dashboard')).toBeVisible();
  // Updated Title Expectation - Strict German "Live Übersicht"
  await expect(page.getByTestId('page-title')).toHaveText('Live Übersicht');
  await expect(page.locator('#metric-viewers')).toBeVisible();

  // Wait for preview iframe to load (scale transform applied)
  await page.waitForTimeout(500);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_live_uebersicht.png') });

  // 2. System Settings
  await page.getByTestId('nav-system').click();
  await expect(page.getByTestId('view-settings-system')).toBeVisible();
  await expect(page.getByTestId('page-title')).toHaveText(/Einstellungen: System/);
  await expect(page.getByTestId('view-dashboard')).toBeHidden();

  // STRICT NAV CHECK: System active, Dashboard inactive
  await expect(page.getByTestId('nav-system')).toHaveClass(/active/);
  await expect(page.getByTestId('nav-dashboard')).not.toHaveClass(/active/);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_settings_system.png') });

  // 3. Points & Level
  await page.getByTestId('nav-points').click();
  await expect(page.getByTestId('view-settings-points')).toBeVisible();
  await expect(page.getByTestId('view-settings-system')).toBeHidden();

  await expect(page.getByTestId('nav-points')).toHaveClass(/active/);
  await expect(page.getByTestId('nav-system')).not.toHaveClass(/active/);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_points.png') });

  // 4. Broadcast
  await page.getByTestId('nav-broadcast').click();
  await expect(page.getByTestId('view-settings-broadcast')).toBeVisible();

  await expect(page.getByTestId('nav-broadcast')).toHaveClass(/active/);
  await expect(page.getByTestId('nav-points')).not.toHaveClass(/active/);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_broadcast.png') });

  // 5. Chat
  await page.getByTestId('nav-chat').click();
  await expect(page.getByTestId('view-settings-chat')).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_chat.png') });

  // 6. Commands
  await page.getByTestId('nav-commands').click();
  await expect(page.getByTestId('view-settings-commands')).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_commands.png') });

  // 7. TTS
  await page.getByTestId('nav-tts').click();
  await expect(page.getByTestId('view-settings-tts')).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_tts.png') });

  // 8. Gifts / Assets (include Modal)
  await page.getByTestId('nav-gifts').click();
  await expect(page.getByTestId('view-settings-gifts')).toBeVisible();

  // Critical Check: TTS Nav must NOT be active
  await expect(page.getByTestId('nav-gifts')).toHaveClass(/active/);
  await expect(page.getByTestId('nav-tts')).not.toHaveClass(/active/);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_gifts_main.png') });

  // Open Gift Browser Modal
  await page.getByTestId('btn-open-gift-browser').click();
  await expect(page.getByTestId('modal-gifts')).toHaveClass(/active/);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08b_gifts_modal.png') });
  await page.locator('#modal-gifts .btn-icon').click();
  await expect(page.getByTestId('modal-gifts')).not.toHaveClass(/active/);

  // 9. Overlays
  await page.getByTestId('nav-overlays').click();
  await expect(page.getByTestId('view-overlays')).toBeVisible();
  await expect(page.getByTestId('page-title')).toHaveText('Overlays');

  // Critical Check: Gifts Nav must NOT be active
  await expect(page.getByTestId('nav-overlays')).toHaveClass(/active/);
  await expect(page.getByTestId('nav-gifts')).not.toHaveClass(/active/);

  // Robustness check
  const sceneSelect = page.locator('#active-scene-select');
  const count = await sceneSelect.locator('option').count();
  expect(count).toBeGreaterThan(0);
  await expect(sceneSelect).not.toContainText('undefined');

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_overlays.png') });

  // 10. Overlay Composer
  await page.getByTestId('nav-composer').click();
  await expect(page.getByTestId('view-overlay-composer')).toBeVisible();
  await expect(page.locator('#stage-container')).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_composer_wide.png') });

  // 11. User DB
  await page.getByTestId('nav-users').click();
  await expect(page.getByTestId('view-users')).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_stats.png') });

  // Extra: Reset Modal (Trigger from System Settings)
  await page.getByTestId('nav-system').click();
  await page.getByTestId('btn-reset-stats').click();
  await expect(page.getByTestId('modal-reset')).toHaveClass(/active/);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_reset_modal.png') });
});
