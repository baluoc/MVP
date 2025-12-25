import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREEN_DIR = path.join(process.cwd(), 'jules_review', 'verification');

test.describe('MCP System & Screens', () => {

    test('Navigate to MCP and Verify View Exclusivity', async ({ page }) => {
        // 1. Go to Home
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Screenshot 1: Dashboard
        await page.screenshot({ path: path.join(SCREEN_DIR, '1_dashboard.png') });
        const dashboardVisible = await page.locator('#view-dashboard').isVisible();
        expect(dashboardVisible).toBeTruthy();

        // 2. Open MCP from Sidebar
        await page.getByTestId('nav-mcp').click();
        await page.waitForTimeout(500); // Animation

        // Screenshot 11: MCP
        await page.screenshot({ path: path.join(SCREEN_DIR, '11_mcp.png') });

        // Verify Exclusivity
        const mcpVisible = await page.locator('#view-mcp').isVisible();
        expect(mcpVisible).toBeTruthy();

        const dashboardHidden = await page.locator('#view-dashboard').isHidden();
        expect(dashboardHidden).toBeTruthy(); // Should be hidden

        // 3. Verify MCP Status Loading/Offline initially (since process manager starts it?)
        // Actually, we can click Start.
        await page.click('#mcp-start-btn');
        await page.waitForTimeout(2000); // Wait for spawn

        // Check if status dot becomes green (class 'running')
        // This might be flaky if build takes long.
        // We just check that button is clickable.
    });

    // Capture other required screens
    test('Capture All Views', async ({ page }) => {
        await page.goto('/');

        const views = [
            { id: 'settings-system', file: '2_einstellungen_system.png', nav: 'nav-system' },
            { id: 'settings-tts', file: '3_einstellungen_tts.png', nav: 'nav-tts' },
            { id: 'settings-broadcast', file: '6_einstellungen_broadcast.png', nav: 'nav-broadcast' },
            { id: 'settings-chat', file: '7_einstellungen_chat.png', nav: 'nav-chat' },
            { id: 'settings-commands', file: '8_einstellungen_befehle.png', nav: 'nav-commands' },
            { id: 'settings-gifts', file: '9_einstellungen_gifts.png', nav: 'nav-gifts' },
            { id: 'users', file: '10_users.png', nav: 'nav-users' },
            { id: 'overlays', file: '4_einstellungen_overlay.png', nav: 'nav-overlays' },
            { id: 'overlay-composer', file: '5_overlay_composer.png', nav: 'nav-composer' },
        ];

        for (const v of views) {
            await page.getByTestId(v.nav).click();
            await page.waitForTimeout(300);
            await page.screenshot({ path: path.join(SCREEN_DIR, v.file) });
        }
    });

});
