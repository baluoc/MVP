const { test, describe, it } = require('node:test');
const assert = require('node:assert');
const { ConfigStore } = require('../../dist/src/core/configStore');

describe('ConfigStore Migration Logic', () => {
    it('should normalize overlay scenes', () => {
        const store = new ConfigStore();
        store.data = {
            overlay: {
                scenes: [
                    { id: "s1" } // Missing props
                ]
            }
        };
        // Trigger normalize by calling private method or reloading (but reloading reads file)
        // Since normalize is private and called in constructor/load,
        // we can simulate load behavior by mocking data and calling a public method that triggers save/reload logic
        // OR we just rely on the fact that if we access getCore() it returns data.

        // Wait, normalizeOverlay is called in load().
        // Constructor calls load().
        // If we want to test migration, we should mock fs.readFileSync to return bad data.

        // Since we can't easily mock fs in this environment without proxyquire etc,
        // and I just added the logic to load(), I will trust the logic or create a manual test case
        // by calling the private method via 'any' cast if possible in TS, but this is JS test.

        // Let's use the fact that `store` instance has the method attached.
        store.normalizeOverlay();

        const s = store.getCore().overlay.scenes[0];
        assert.strictEqual(s.name, "Szene s1");
        assert.strictEqual(s.width, 1080);
        assert.ok(Array.isArray(s.widgets));
    });
});
