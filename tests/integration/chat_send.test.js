const { test, describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const express = require('express');

// We need to test the Route Logic directly via a real express instance
// but importing the 'createApiRouter' from compiled code.

// NOTE: We need to mock dependencies
const { createApiRouter } = require('../../dist/src/api/routes');

describe('Integration - Chat Send Gate', () => {
    let app;
    let server;
    let port;
    let baseUrl;
    let currentConfig = { chat: { enableSend: false } }; // Default disabled
    let mockSendChat;

    before(async () => {
        app = express();
        app.use(express.json());

        // Mocks
        const mockStore = {
            getCore: () => currentConfig,
            setCore: (c) => { currentConfig = c; },
            getAddonConfig: () => ({}),
            setAddonConfig: () => {}
        };

        const mockAddonHost = { getAddonsList: () => [], enableAddon: () => {} };
        const mockRingBuffer = { getAll: () => [] };
        const mockStats = { getPaginated: () => ({}), adjustManualPoints: () => null, reset: () => {} };

        mockSendChat = async (text) => {
            if (text === 'fail') throw new Error("Mock Fail");
            return { ok: true, text };
        };

        const router = createApiRouter(
            mockAddonHost,
            mockRingBuffer,
            mockStore,
            () => ({}), // connectorState
            mockStats,
            () => {}, // onConnect
            () => [], // getGiftCatalog
            () => {}, // broadcastOverlay
            mockSendChat
        );

        app.use('/api', router);

        return new Promise((resolve) => {
            server = app.listen(0, () => {
                port = server.address().port;
                baseUrl = `http://localhost:${port}/api`;
                resolve();
            });
        });
    });

    after(() => {
        if (server) server.close();
    });

    it('should block chat when enableSend is false (403)', async () => {
        currentConfig = { chat: { enableSend: false } };

        const res = await fetch(`${baseUrl}/chat/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: 'Hello' })
        });

        assert.strictEqual(res.status, 403);
        const data = await res.json();
        assert.strictEqual(data.ok, false);
        assert.strictEqual(data.reason, 'DISABLED');
    });

    it('should allow chat when enableSend is true (200)', async () => {
        currentConfig = { chat: { enableSend: true } };

        const res = await fetch(`${baseUrl}/chat/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: 'Hello' })
        });

        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.ok, true);
    });

    it('should reject too long text (400)', async () => {
        currentConfig = { chat: { enableSend: true } };
        const longText = 'a'.repeat(301);

        const res = await fetch(`${baseUrl}/chat/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: longText })
        });

        assert.strictEqual(res.status, 400);
        const data = await res.json();
        assert.strictEqual(data.reason, 'Text too long');
    });

    it('should handle sendChat errors gracefully', async () => {
         currentConfig = { chat: { enableSend: true } };

         const res = await fetch(`${baseUrl}/chat/send`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ text: 'fail' }) // triggers throw in mock
         });

         const data = await res.json();
         assert.strictEqual(data.ok, false);
         assert.strictEqual(data.mode, 'live');
         assert.strictEqual(data.reason, 'Mock Fail');
    });
});
