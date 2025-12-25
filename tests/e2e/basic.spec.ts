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

test('navigate through settings and ensure clean view switching', async ({ page }) => {
  await page.goto('/');

  // 1. Go to System
  await page.getByTestId('nav-system').click();

  // POSITIVE: System View Visible
  await expect(page.getByTestId('view-settings-system')).toBeVisible();
  await expect(page.getByTestId('btn-reset-stats')).toBeVisible();

  // NEGATIVE: Dashboard MUST be hidden
  await expect(page.getByTestId('view-dashboard')).toBeHidden();
  // REGRESSION CHECK: Specific Dashboard cards must be hidden
  await expect(page.getByTestId('card-live-preview')).toBeHidden();
  await expect(page.getByTestId('card-chat-stream')).toBeHidden();
  await expect(page.getByTestId('card-events')).toBeHidden();

  // Active State Check (Nav)
  await expect(page.getByTestId('nav-system')).toHaveClass(/active/);
  await expect(page.getByTestId('nav-dashboard')).not.toHaveClass(/active/);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '1_system.png') });

  // 2. Go to Points
  await page.getByTestId('nav-points').click();
  await expect(page.getByTestId('view-settings-points')).toBeVisible();
  await expect(page.getByTestId('input-points-name')).toBeVisible();
  // Ensure previous view is gone
  await expect(page.getByTestId('view-settings-system')).toBeHidden();
  await expect(page.getByTestId('view-dashboard')).toBeHidden();

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_points.png') });

  // 3. Go to Overlay Composer (Special flex case)
  await page.getByTestId('nav-composer').click();
  await expect(page.getByTestId('view-overlay-composer')).toBeVisible();
  // Check that we see the stage container
  await expect(page.locator('#stage-container')).toBeVisible();
  // Ensure Dashboard is hidden
  await expect(page.getByTestId('view-dashboard')).toBeHidden();
  await expect(page.getByTestId('card-live-preview')).toBeHidden();

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '4_overlay_composer.png') });
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
