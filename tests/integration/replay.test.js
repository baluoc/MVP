const { test, describe, it, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { runReplay } = require('./replay_helper');

const FIXTURE = path.resolve(__dirname, '../../fixtures/events.sample.json');

const TEST_CONFIG = {
    points: {
        name: "TestPunkte",
        coin: 10,
        share: 50,
        chat: 5,
        subBonus: 10
    }
};

describe('Integration Replay Test', () => {

    const { stats, overlayBroadcasts } = runReplay(FIXTURE, TEST_CONFIG);

    after(() => {
        if(stats.dispose) stats.dispose();
    });

    it('should calculate points correctly for Alice', () => {
        // Alice: 1 chat (5) + 5 gifts (1 diamond * 5 count * 10 multiplier = 50) = 55 points
        // NOTE: If Config changes defaults, this test needs update or mocked config.
        // Assuming defaults: chat=5, coin=10

        const alice = stats.getAll().find(u => u.nickname === 'Alice');
        assert.ok(alice, 'Alice should exist');
        assert.strictEqual(alice.chatCount, 1);
        assert.strictEqual(alice.giftCount, 5);
        assert.strictEqual(alice.points, 55);
    });

    it('should calculate points correctly for Bob', () => {
        // Bob: 1 share (50)
        const bob = stats.getAll().find(u => u.nickname === 'Bob');
        assert.ok(bob, 'Bob should exist');
        assert.strictEqual(bob.points, 50);
    });

    it('should generate correct overlay commands', () => {
        // We expect Toasts for Chat, Share, Gift
        // Chat Alice
        const chatToast = overlayBroadcasts.find(b => b.kind === 'toast' && b.text === 'Hello World');
        assert.ok(chatToast, 'Chat toast missing');

        // Gift Alice
        const giftEvent = overlayBroadcasts.find(b => b.kind === 'gift' && b.giftName === 'Rose');
        assert.ok(giftEvent, 'Gift overlay command missing');
        assert.strictEqual(giftEvent.count, 5);
    });
});
