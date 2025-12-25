const test = require('node:test');
const assert = require('node:assert');

// Mock obs-websocket-js
class MockOBS {
    constructor() {
        this.callbacks = {};
    }
    on(event, cb) {
        this.callbacks[event] = cb;
    }
    async connect(url, password) {
        this.connected = true;
        if(this.callbacks['ConnectionOpened']) this.callbacks['ConnectionOpened']();
    }
    async disconnect() {
        this.connected = false;
        if(this.callbacks['ConnectionClosed']) this.callbacks['ConnectionClosed']({});
    }
    async call(req, data) {
        this.lastCall = { req, data };
        if (req === 'GetSceneList') return { scenes: [{ sceneName: 'Scene A' }] };
        if (req === 'GetInputList') return { inputs: [{ inputName: 'Mic' }] };
        if (req === 'GetCurrentProgramScene') return { currentProgramSceneName: 'Scene A' };
        if (req === 'GetSceneItemList') return { sceneItems: [{ sceneItemId: 123, sourceName: 'Mic' }] };
        if (req === 'SetSceneItemEnabled') return {};
        if (req === 'SetCurrentProgramScene') return {};
        return {};
    }
}

const { OBSService } = require('../../dist/src/connectors/obsService');

test('OBSService - Connect and Actions', async (t) => {
    const obsService = new OBSService();

    // Inject Mock
    const mockObs = new MockOBS();
    obsService.obs = mockObs; // TS private field access in JS works

    t.after(() => obsService.disconnect());

    obsService.configure({ ip: 'localhost', port: 4455 });

    // Trigger manual connect (which calls obs.connect)
    await obsService.connect();

    assert.strictEqual(mockObs.connected, true);

    // Test Switch Scene
    await obsService.switchScene('Scene X');
    assert.strictEqual(mockObs.lastCall.req, 'SetCurrentProgramScene');
    assert.strictEqual(mockObs.lastCall.data.sceneName, 'Scene X');

    // Test Toggle Input
    // We expect it to call GetCurrentProgramScene -> GetSceneItemList -> SetSceneItemEnabled
    await obsService.toggleInput('Mic', true);

    // Since we can only check the LAST call easily with this simple mock
    assert.strictEqual(mockObs.lastCall.req, 'SetSceneItemEnabled');
    assert.strictEqual(mockObs.lastCall.data.sceneItemId, 123);
    assert.strictEqual(mockObs.lastCall.data.sceneItemEnabled, true);
});
