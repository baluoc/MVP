const test = require('node:test');
const assert = require('node:assert');
const { handleMCPRequest } = require('../../mcp-server/dist/mcp/protocol.js');

// Mock request helper
async function callMCP(method, params, id = 1) {
    return handleMCPRequest({ jsonrpc: "2.0", id, method, params });
}

test('MCP Protocol - Initialize', async () => {
    const res = await callMCP('initialize', { clientInfo: { name: 'test' } });
    assert.strictEqual(res.jsonrpc, "2.0");
    assert.strictEqual(res.result.protocolVersion, "2025-03-26");
    assert.ok(res.result.capabilities);
});

test('MCP Protocol - Tools List', async () => {
    const res = await callMCP('tools/list', {});
    assert.ok(res.result.tools);
    assert.ok(res.result.tools.some(t => t.name === 'div.list_queue'));
    assert.ok(res.result.tools.some(t => t.name === 'div.create_draft'));
});

test('MCP Protocol - Unknown Tool Error (Protocol Error)', async () => {
    const res = await callMCP('tools/call', { name: 'div.does_not_exist' });
    assert.ok(res.error);
    assert.strictEqual(res.error.code, -32601);
    assert.ok(res.error.message.includes('Unknown tool'));
    assert.ok(res.error.data.availableToolsHint); // "Call tools/list"
});

test('MCP Protocol - System Status (Success)', async () => {
    const res = await callMCP('tools/call', { name: 'system.get_status' });
    assert.ok(res.result);
    assert.strictEqual(res.result.isError, undefined); // No error
    assert.strictEqual(res.result.structuredContent.status, 'running');
});

test('MCP Protocol - DIV Validation Failure (Tool Execution Error)', async () => {
    // We need a div that doesn't exist for "DIV not found" -> throws Error -> caught -> isError: true?
    // Wait, the tools implementation for `div.validate` throws if ID not found.
    // The protocol handler catches and returns isError: true (internal error) OR the tool returns isError: true.
    // Let's check `div.validate` impl:
    // `const div = loadDIV(args.id); if (!div) throw new Error("DIV not found");`
    // Protocol handler catches `toolErr` and returns result with `isError: true`.

    const res = await callMCP('tools/call', { name: 'div.validate', arguments: { id: 'non_existent' } });

    // Check it returns a Result with isError: true (Execution Error), NOT a JSON-RPC Error (Protocol Error)
    assert.ok(res.result);
    assert.strictEqual(res.result.isError, true);
    assert.ok(res.result.content[0].text.includes('Internal Error')); // Or specific message depending on catch block
});
