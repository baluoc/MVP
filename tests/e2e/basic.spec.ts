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

  // Check Nav Items (German)
  // Dashboard is now "Live Übersicht"
  await expect(page.getByTestId('nav-dashboard')).toHaveText(/Live Übersicht/);

  await expect(page.getByTestId('nav-system')).toHaveText(/System/);
  await expect(page.getByTestId('nav-points')).toHaveText(/Punkte & Level/);
  await expect(page.getByTestId('nav-broadcast')).toHaveText(/Broadcast/);
  await expect(page.getByTestId('nav-chat')).toHaveText(/Chat/);
  await expect(page.getByTestId('nav-commands')).toHaveText(/Befehle/);
  await expect(page.getByTestId('nav-tts')).toHaveText(/TTS/);
  await expect(page.getByTestId('nav-gifts')).toHaveText(/Geschenke \/ Assets/);

  // Updated text for Users
  await expect(page.getByTestId('nav-users')).toHaveText(/Statistiken \/ DB/);

  // Screenshot Dashboard
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_dashboard_basic.png') });
});

test('navigate through settings and ensure clean view switching', async ({ page }) => {
  await page.goto('/');

  // 1. Go to System
  await page.getByTestId('nav-system').click();
  await expect(page.getByTestId('view-settings-system')).toBeVisible();

  // Dashboard should be hidden
  await expect(page.getByTestId('view-dashboard')).toBeHidden();

  // 2. Go to Points
  await page.getByTestId('nav-points').click();
  await expect(page.getByTestId('view-settings-points')).toBeVisible();
  await expect(page.getByTestId('view-settings-system')).toBeHidden();

  // 3. Go back to Dashboard
  await page.getByTestId('nav-dashboard').click();
  await expect(page.getByTestId('view-dashboard')).toBeVisible();
  await expect(page.getByTestId('view-settings-points')).toBeHidden();
});

test('settings saving', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-points').click();

    // Change currency name
    const input = page.getByTestId('input-points-name');
    await input.fill('SuperCoins');

    // Save
    // Note: With new UI, save button is only in top bar
    await page.getByTestId('btn-save').click();

    // Reload and verify persistence
    await page.reload();
    await page.getByTestId('nav-points').click();
    await expect(page.getByTestId('input-points-name')).toHaveValue('SuperCoins');
});
