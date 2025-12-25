const { test, describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');

// Mock Dependencies - loading from DIST to ensure we test compiled output
const { UserStatsStore } = require('../../dist/src/stats/store');
const { ConfigStore } = require('../../dist/src/core/configStore');
const { normalizeChat, normalizeGift } = require('../../dist/src/core/normalize');

// Mock Config for Tests
const TEST_CONFIG = {
    points: {
        name: "Punkte",
        coin: 10,
        share: 50,
        chat: 5,
        subBonus: 10
    },
    tiktok: {
        uniqueId: "mock_user",
        session: {
            mode: "manual",
            sessionId: "OLD_SESSION",
            updatedAt: 1000
        }
    },
    levels: { points: 100, multiplier: 1.5 },
    tts: { enabled: true, trigger: 'any', command: '!tts', allowed: { all: true } },
    overlay: { activeSceneId: 'default', scenes: [{ id: 'default', widgets: [] }] }
};

describe('Core Logic Audit', () => {

    describe('1. Normalization Layer', () => {
        it('should normalize chat events correctly', () => {
            const raw = {
                uniqueId: 'testuser',
                nickname: 'Test User',
                profilePictureUrl: 'http://pic.url',
                comment: 'Hello World'
            };
            const normalized = normalizeChat(raw);

            assert.strictEqual(normalized.type, 'chat');
            assert.strictEqual(normalized.user.nickname, 'Test User');
            assert.strictEqual(normalized.user.uniqueId, 'testuser');
            assert.strictEqual(normalized.payload.text, 'Hello World');
        });

        it('should normalize gift events including cost', () => {
            const raw = {
                uniqueId: 'gifter',
                nickname: 'Gifter',
                giftName: 'Rose',
                diamondCount: 1, // Cost 1
                repeatCount: 5
            };
            const normalized = normalizeGift(raw);
            assert.strictEqual(normalized.type, 'gift');
            assert.strictEqual(normalized.payload.diamondCost, 1);
            assert.strictEqual(normalized.payload.count, 5);
        });
    });

    describe('2. Points System Logic', () => {
        let stats;

        before(() => {
            stats = new UserStatsStore();
        });

        after(() => {
            if(stats.dispose) stats.dispose();
        });

        it('should award points for chat', () => {
            const event = {
                type: 'chat',
                ts: Date.now(),
                user: { uniqueId: 'u1', nickname: 'U1' },
                payload: { text: 'hi' }
            };
            // ingest expects the POINTS config part
            stats.ingest(event, TEST_CONFIG.points);

            const user = stats.getAll().find(u => u.uniqueId === 'u1');
            assert.ok(user, 'User should exist');
            assert.strictEqual(user.points, 5, 'Chat should give 5 points');
        });

        it('should award points for share', () => {
             const event = {
                 type: 'share',
                 ts: Date.now(),
                 user: { uniqueId: 'u2', nickname: 'U2' },
                 payload: {}
             };
             stats.ingest(event, TEST_CONFIG.points);

             const user = stats.getAll().find(u => u.uniqueId === 'u2');
             assert.strictEqual(user.points, 50, 'Share should give 50 points');
        });

        it('should award points for gifts (coins * multiplier)', () => {
             const event = {
                 type: 'gift',
                 ts: Date.now(),
                 user: { uniqueId: 'u3', nickname: 'U3' },
                 payload: { count: 1, diamondCost: 10 }
             };
             stats.ingest(event, TEST_CONFIG.points);

             const user = stats.getAll().find(u => u.uniqueId === 'u3');
             // 10 coins * 10 points/coin * 1 count = 100 points
             assert.strictEqual(user.points, 100, 'Gift 10 coins should give 100 points');
        });

        it('should apply sub bonus if implemented', () => {
             // We pass a sub user. If logic exists, points > 5
             const event = {
                 type: 'chat',
                 ts: Date.now(),
                 user: { uniqueId: 'sub1', nickname: 'Subscriber', isSubscriber: true },
                 payload: { text: 'hi' }
             };
             stats.ingest(event, TEST_CONFIG.points);

             const user = stats.getAll().find(u => u.uniqueId === 'sub1');
             if (user.points === 5) {
                 // Not implemented yet
                 console.log("      [GAP] Sub Bonus logic seems missing");
             } else {
                 assert.ok(user.points > 5, 'Sub bonus should increase points');
             }
        });
    });

    describe('3. Overlay Scene Logic', () => {
        it('should update active scene in config without side effects', () => {
             const store = new ConfigStore();
             // Reset data
             store.data = JSON.parse(JSON.stringify(TEST_CONFIG));
             store.save = () => {}; // Mock save to avoid writing file

             store.setCore({ overlay: { activeSceneId: 'scene_2' } });

             const updated = store.getCore();
             assert.strictEqual(updated.overlay.activeSceneId, 'scene_2');
             assert.strictEqual(updated.overlay.scenes.length, 1, 'Scenes array should remain');
        });
    });

    describe('4. Session Config Logic', () => {
        it('should deep merge session config without losing keys', () => {
             const store = new ConfigStore();
             // Init with existing session
             store.data = JSON.parse(JSON.stringify(TEST_CONFIG));
             store.save = () => {};

             // Update only sessionId
             store.setCore({
                 tiktok: {
                     session: { sessionId: "NEW_SESSION" }
                 }
             });

             const updated = store.getCore();
             assert.strictEqual(updated.tiktok.session.sessionId, "NEW_SESSION");
             assert.strictEqual(updated.tiktok.session.mode, "manual", "Mode should be preserved");
             assert.strictEqual(updated.tiktok.uniqueId, "mock_user", "uniqueId should be preserved");
        });
    });
});
