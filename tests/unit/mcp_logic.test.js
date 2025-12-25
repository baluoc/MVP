const test = require('node:test');
const assert = require('node:assert');
// Use the compiled JS file from mcp-server
const { validateDIV } = require('../../mcp-server/dist/div/validator.js');

const validDiv = {
    id: "div_1",
    titel: "Test",
    autor: "tester",
    rolle: "core_fix",
    erstelltAm: "2025-01-01T00:00:00Z",
    intent: "fix",
    scope: { paths: ["src/foo.ts"], risiko: "low" },
    plan: [],
    changes: [
        { op: "modify", path: "src/foo.ts", content: "new" }
    ],
    qa: { required: [], results: { status: "pending", artifacts: [] } },
    rollback: { strategy: "reverse", notes: "" },
    review: { status: "draft", comments: [] }
};

test('DIV Validator - Valid Packet', () => {
    const res = validateDIV(validDiv);
    assert.strictEqual(res.valid, true);
});

test('DIV Validator - Invalid Role', () => {
    const div = { ...validDiv, rolle: "hacker" };
    const res = validateDIV(div);
    assert.strictEqual(res.valid, false);
    assert.match(res.error, /Invalid role/);
});

test('DIV Validator - Policy Deny src/** for addon_dev', () => {
    const div = { ...validDiv, rolle: "addon_dev", changes: [{ op: "modify", path: "src/secret.ts", content: "" }] };
    const res = validateDIV(div);
    assert.strictEqual(res.valid, false);
    assert.match(res.error, /Access denied/);
});

test('DIV Validator - Policy Allow public/** for addon_dev', () => {
    const div = { ...validDiv, rolle: "addon_dev", changes: [{ op: "modify", path: "public/style.css", content: "" }] };
    const res = validateDIV(div);
    assert.strictEqual(res.valid, true);
});

test('DIV Validator - QA Role cannot change', () => {
    const div = { ...validDiv, rolle: "qa_only", changes: [{ op: "modify", path: "public/test.css", content: "" }] };
    const res = validateDIV(div);
    assert.strictEqual(res.valid, false);
    assert.match(res.error, /QA role cannot make changes/);
});
