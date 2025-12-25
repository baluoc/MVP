const { test, describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');

// Dynamically import the compiled output
// Adjust path to point to dist/src/core/configStore.js
const { ConfigStore } = require('../../dist/src/core/configStore');

describe('ConfigStore Logic', () => {

    it('should perform a deep merge without deleting nested keys', () => {
        const store = new ConfigStore();

        // Initial state (assuming default config)
        const initial = store.getCore();
        const initialActive = initial.overlay.activeSceneId;
        const initialScenes = initial.overlay.scenes;

        // Perform a partial update on 'overlay'
        // We only want to change activeSceneId
        // This MUST NOT delete 'scenes'
        store.setCore({
            overlay: {
                activeSceneId: 'test_scene_123'
            }
        });

        const updated = store.getCore();

        // Check if value updated
        assert.strictEqual(updated.overlay.activeSceneId, 'test_scene_123', 'activeSceneId should be updated');

        // Check if other keys in 'overlay' are preserved
        assert.ok(updated.overlay.scenes, 'scenes array should still exist');
        assert.ok(updated.overlay.scenes.length > 0, 'scenes array should not be empty');
        assert.deepStrictEqual(updated.overlay.scenes, initialScenes, 'scenes should be unchanged');
    });

    it('should perform a deep merge on tts settings without losing nested keys', () => {
        const store = new ConfigStore();

        // Enable TTS
        store.setCore({
            tts: {
                enabled: true
            }
        });

        const updated = store.getCore();
        assert.strictEqual(updated.tts.enabled, true);
        // Ensure 'allowed' and 'voice' etc are still there
        assert.ok(updated.tts.allowed, 'tts.allowed should exist');
        assert.ok(updated.tts.voice, 'tts.voice should exist');
        assert.strictEqual(updated.tts.language, 'de-DE', 'tts.language should be default');
    });

    it('should handle array replacement correctly (arrays are replaced, not merged)', () => {
         const store = new ConfigStore();
         const newScenes = [{ id: 'new', name: 'New Scene' }];

         store.setCore({
             overlay: {
                 scenes: newScenes
             }
         });

         const updated = store.getCore();
         assert.strictEqual(updated.overlay.scenes.length, 1);
         assert.strictEqual(updated.overlay.scenes[0].id, 'new');
    });
});
