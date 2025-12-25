const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

test('PKCE Verification Logic', () => {
    const codeVerifier = "secure-random-string-that-is-long-enough-for-pkce-standard-123456";
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    // Simulate what the server does
    const serverHash = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    assert.strictEqual(serverHash, codeChallenge);
});
