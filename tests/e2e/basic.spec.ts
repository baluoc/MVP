import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'jules_review', 'verification');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test('dashboard navigation and language check', async ({ page }) => {
  await page.goto('/');

  // Check Title
  await expect(page).toHaveTitle(/TK Event Zentrale/);

  // Check Dashboard visibility
  await expect(page.getByTestId('view-dashboard')).toBeVisible();

  // Check German Navigation
  await expect(page.getByTestId('nav-dashboard')).toHaveText(/Dashboard/);
  await expect(page.getByTestId('nav-system')).toHaveText(/System/);
  await expect(page.getByTestId('nav-points')).toHaveText(/Punkte & Level/);
  await expect(page.getByTestId('nav-broadcast')).toHaveText(/Broadcast/);
  await expect(page.getByTestId('nav-chat')).toHaveText(/Chat/);
  await expect(page.getByTestId('nav-commands')).toHaveText(/Befehle/);
  await expect(page.getByTestId('nav-tts')).toHaveText(/TTS/);
  await expect(page.getByTestId('nav-gifts')).toHaveText(/Geschenke \/ Assets/);
  await expect(page.getByTestId('nav-users')).toHaveText(/User DB/);

  // Screenshot Dashboard
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_dashboard.png') });
});

test('navigate through settings and take screenshots', async ({ page }) => {
  await page.goto('/');

  // System
  await page.getByTestId('nav-system').click();
  await expect(page.getByTestId('view-settings-system')).toBeVisible();
  await expect(page.getByTestId('btn-reset-stats')).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '1_system.png') });

  // Points
  await page.getByTestId('nav-points').click();
  await expect(page.getByTestId('view-settings-points')).toBeVisible();
  await expect(page.getByTestId('input-points-name')).toBeVisible();
  // Using explicit requirement names where possible
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_points.png') });

  // Broadcast
  await page.getByTestId('nav-broadcast').click();
  await expect(page.getByTestId('view-settings-broadcast')).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '5_broadcast.png') });

  // Chat
  await page.getByTestId('nav-chat').click();
  await expect(page.getByTestId('view-settings-chat')).toBeVisible();
  await expect(page.getByTestId('check-chat-send')).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '6_chat.png') });

  // Commands
  await page.getByTestId('nav-commands').click();
  await expect(page.getByTestId('view-settings-commands')).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '7_commands.png') });

  // TTS
  await page.getByTestId('nav-tts').click();
  await expect(page.getByTestId('view-settings-tts')).toBeVisible();
  await expect(page.getByTestId('check-tts-enabled')).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '2_tts.png') });

  // Gifts
  await page.getByTestId('nav-gifts').click();
  await expect(page.getByTestId('view-settings-gifts')).toBeVisible();
  await expect(page.getByTestId('btn-open-gift-browser')).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '8_gifts.png') });

  // Overlays
  await page.getByTestId('nav-overlays').click();
  await expect(page.getByTestId('view-overlays')).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '3_overlay.png') });

  // Overlay Composer
  await page.getByTestId('nav-composer').click();
  await expect(page.getByTestId('view-overlay-composer')).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '4_overlay_composer.png') });

  // Users
  await page.getByTestId('nav-users').click();
  await expect(page.getByTestId('view-users')).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '9_users.png') });
});

test('settings saving', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-points').click();

    // Change currency name
    const input = page.getByTestId('input-points-name');
    await input.fill('SuperCoins');

    // Save
    page.on('dialog', dialog => dialog.accept()); // Handle alert
    await page.getByTestId('btn-save').click();

    // Reload and verify
    await page.reload();
    await page.getByTestId('nav-points').click();
    await expect(page.getByTestId('input-points-name')).toHaveValue('SuperCoins');
});
