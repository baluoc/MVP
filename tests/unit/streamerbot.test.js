const test = require('node:test');
const assert = require('node:assert');

// Mock WS
const EventEmitter = require('events');
class MockWebSocket extends EventEmitter {
    constructor(url) {
        super();
        this.url = url;
        this.readyState = 1; // Open
        setTimeout(() => this.emit('open'), 10);
    }
    send(data) {
        this.lastSent = data;
    }
    close() {
        this.emit('close');
    }
}
MockWebSocket.OPEN = 1;

const { StreamerBotService } = require('../../dist/src/connectors/streamerbotService');

test('StreamerBotService - DoAction Payload', async (t) => {
    // Inject MockWebSocket via constructor
    const sb = new StreamerBotService(MockWebSocket);

    // Prevent auto-reconnect from keeping process alive if test fails
    t.after(() => sb.disconnect());

    sb.configure({ address: '127.0.0.1', port: 8080 });

    // Wait for connect
    await new Promise(r => sb.once('connected', r));

    // Clear initial sub/get calls
    sb.ws.lastSent = null;

    await sb.doAction('test-action-id', { foo: 'bar' });

    const sent = JSON.parse(sb.ws.lastSent);

    assert.strictEqual(sent.request, 'DoAction');
    assert.strictEqual(sent.action.id, 'test-action-id');
    assert.deepStrictEqual(sent.args, { foo: 'bar' });
    assert.ok(sent.id, 'Should have a request id');
});
