const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

// Re-implement logic in test to verify (or import from built source if available)
// Ideally we import the function under test.
const { calculateStreamerBotAuth } = require('../../dist/src/utils/streamerbotAuth');

test('Streamer.bot Auth Algorithm', (t) => {
    // Known Test Vector
    // Since we don't have an official vector from SB docs in the prompt, we construct one that follows the algo def.
    // algo:
    // secret = base64( sha256( pass + salt ) )
    // auth = base64( sha256( secret + challenge ) )

    const password = 'mySecretPassword';
    const salt = 'randomSalt123';
    const challenge = 'challenge456';

    // Manual Calculation
    const s1 = crypto.createHash('sha256').update(password + salt).digest('base64');
    const expectedAuth = crypto.createHash('sha256').update(s1 + challenge).digest('base64');

    const result = calculateStreamerBotAuth(password, salt, challenge);

    assert.strictEqual(result, expectedAuth, "Auth hash calculation mismatch");
});
