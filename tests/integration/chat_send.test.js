const { test, describe, it, before } = require('node:test');
const assert = require('node:assert');
const { TikTokService } = require('../../dist/src/connectors/tiktokService');
const { EventBus } = require('../../dist/src/core/bus');

describe('Chat Sending Logic', () => {
    let service;
    let bus;

    before(() => {
        bus = new EventBus();
        service = new TikTokService(bus);
    });

    it('should fail if not connected', async () => {
        await assert.rejects(
            async () => await service.sendChat('test'),
            (err) => {
                assert.strictEqual(err.message, 'NOT_CONNECTED');
                return true;
            }
        );
    });

    it('should fail if connected but no sessionId', async () => {
        // Mock connected state
        service.isConnected = true;
        // Mock connection object without sessionId in options
        service.conn = { options: {} };

        await assert.rejects(
            async () => await service.sendChat('test'),
            (err) => {
                assert.strictEqual(err.message, 'NO_SESSIONID');
                return true;
            }
        );
    });

    it('should succeed if connected and sessionId present', async () => {
        // Mock connected state
        service.isConnected = true;
        service.lastChatSentAt = 0; // Reset rate limit
        // Mock connection object WITH sessionId and sendMessage
        service.conn = {
            options: { sessionId: "valid_session" },
            sendMessage: async (txt) => { return { status: 200 }; }
        };

        const result = await service.sendChat('Hello');
        assert.strictEqual(result.ok, true);
        assert.strictEqual(result.mode, 'live');
    });

    it('should prevent spam (Rate Limit)', async () => {
        // Mock connected state
        service.isConnected = true;
        service.conn = {
            options: { sessionId: "valid_session" },
            sendMessage: async (txt) => { return { status: 200 }; }
        };

        // First message (should work, resets timer)
        service.lastChatSentAt = 0;
        await service.sendChat('Msg1');

        // Immediate second message (should fail)
        await assert.rejects(
            async () => await service.sendChat('Msg2'),
            (err) => {
                assert.match(err.message, /RATE_LIMIT/);
                return true;
            }
        );
    });
});
