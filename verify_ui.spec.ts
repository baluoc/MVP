import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// This is a manual verification script triggered by frontend_verification_instructions
// But since I already have an E2E test suite in `tests/e2e/mcp.spec.ts` that covers screens,
// I should run that instead or reuse its logic.
// The instructions say "Write a temporary Playwright script".
// I will create a simple script that navigates to MCP view and captures a screenshot for visual inspection.

const SCREEN_DIR = path.join(process.cwd(), 'jules_review', 'verification');

test('Verify MCP UI', async ({ page }) => {
    // Go to home
    await page.goto('/');

    // Click MCP Nav
    await page.getByTestId('nav-mcp').click();

    // Wait for view to be active
    await expect(page.locator('#view-mcp')).toBeVisible();

    // Check key elements
    await expect(page.locator('.card-title').filter({ hasText: 'Status' })).toBeVisible();
    await expect(page.locator('.card-title').filter({ hasText: 'Verbindung & Auth' })).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: path.join(SCREEN_DIR, 'manual_verification_mcp.png') });
});
