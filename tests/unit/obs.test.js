const test = require('node:test');
const assert = require('node:assert');

// Mock obs-websocket-js
class MockOBS {
    constructor() {
        this.callbacks = {};
        this.connected = false;
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
        if (req === 'StartStream') return {};
        if (req === 'StopStream') return {};
        if (req === 'ToggleInputMute') return {};
        if (req === 'GetStreamStatus') return { outputActive: false };
        if (req === 'GetRecordStatus') return { outputActive: false };
        return {};
    }
}

// Ensure we are testing against the BUILT distribution as required by instructions
const { OBSService } = require('../../dist/src/connectors/obsService');

test('OBSService - Connect and Actions', async (t) => {
    const obsService = new OBSService();

    // Inject Mock
    const mockObs = new MockOBS();
    obsService.obs = mockObs; // Accessing private field in JS runtime (allowed)

    t.after(() => obsService.disconnect());

    // Fix: We must override the internal isConnected state of OBSService because
    // the real `obs.on('ConnectionOpened')` handler is attached in the constructor
    // to the *original* obs instance, not our mock.
    //
    // Workaround: Re-bind the event handlers or simulate the event emission
    // The constructor attaches listeners to `this.obs`.
    // We replaced `this.obs` with `mockObs`.
    // But the constructor ran BEFORE we swapped it.
    // So the original listeners are on the original object.
    //
    // Solution:
    // 1. Swap `obsService.obs`
    // 2. Manually trigger the listener logic or re-attach listeners?
    //
    // Better: Re-instantiate OBSService but patch the constructor? Hard.
    // Easier: Just manually set `obsService.isConnected = true` after mock connect.

    obsService.configure({ ip: 'localhost', port: 4455 });

    // Manually hook up our mock to the service's logic if needed,
    // OR just use the public methods that rely on `isConnected`.

    // Simulate connection
    await obsService.connect();
    // Since the event listener wasn't attached to OUR mock, we must manually update state
    // Wait, `obsService.connect()` calls `this.obs.connect()`.
    // If we swapped `this.obs`, it calls `mockObs.connect()`.
    // But `mockObs.on('ConnectionOpened')` was never called by OBSService because OBSService
    // called `this.obs.on(...)` in its constructor on the OLD object.

    // FIX: Re-attach listeners to the new mock
    mockObs.on('ConnectionOpened', () => {
        obsService.isConnected = true;
        obsService.emit('connected');
    });
    mockObs.on('ConnectionClosed', () => {
        obsService.isConnected = false;
        obsService.emit('disconnected');
    });

    // NOW connect
    await obsService.connect();

    assert.strictEqual(mockObs.connected, true);
    // Wait for event loop tick for event to fire?
    // Or just manually force it for the test if async timing is tricky.
    obsService.isConnected = true;

    // Test Switch Scene
    await obsService.switchScene('Scene X');
    assert.strictEqual(mockObs.lastCall.req, 'SetCurrentProgramScene');
    assert.strictEqual(mockObs.lastCall.data.sceneName, 'Scene X');

    // Test Toggle Input (Core Logic Verification)
    // We expect it to call GetCurrentProgramScene -> GetSceneItemList -> SetSceneItemEnabled
    await obsService.toggleInput('Mic', true);
    assert.strictEqual(mockObs.lastCall.req, 'SetSceneItemEnabled');
    assert.strictEqual(mockObs.lastCall.data.sceneItemId, 123);
    assert.strictEqual(mockObs.lastCall.data.sceneItemEnabled, true);

    // Test Toggle Mute
    await obsService.toggleMute('Mic');
    assert.strictEqual(mockObs.lastCall.req, 'ToggleInputMute');
    assert.strictEqual(mockObs.lastCall.data.inputName, 'Mic');

    // Test Stream Control
    await obsService.setStreamState(true);
    assert.strictEqual(mockObs.lastCall.req, 'StartStream');

    await obsService.setStreamState(false);
    assert.strictEqual(mockObs.lastCall.req, 'StopStream');

    // Test Disconnect Cleanup
    await obsService.disconnect();
    assert.strictEqual(mockObs.connected, false);
});
