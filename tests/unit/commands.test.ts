import { test } from 'node:test';
import assert from 'node:assert';
import { parseCommand, buildCommandResponse } from '../../src/core/commands';

test('Command Logic', async (t) => {

    await t.test('parseCommand - basics', () => {
        const conf = { commands: { builtIn: { score: { enabled: true, trigger: '!score' } } } };

        // Match
        const res = parseCommand('!score', conf);
        assert.ok(res);
        assert.strictEqual(res.cmdKey, 'score');
        assert.deepStrictEqual(res.args, []);

        // No match
        const res2 = parseCommand('!unknown', conf);
        assert.strictEqual(res2, null);

        // Not a command
        const res3 = parseCommand('hello', conf);
        assert.strictEqual(res3, null);
    });

    await t.test('parseCommand - triggers from config', () => {
        const conf = { commands: { builtIn: { score: { enabled: true, trigger: '!punkte' } } } };
        const res = parseCommand('!punkte', conf);
        assert.ok(res);
        assert.strictEqual(res.cmdKey, 'score');

        // Old trigger should fail
        const res2 = parseCommand('!score', conf);
        assert.strictEqual(res2, null);
    });

    await t.test('buildCommandResponse - score', () => {
        const conf = {};
        const ctx = { user: { nickname: 'Tester', uniqueId: 'tester' }, stats: { points: 123 } };

        const reply = buildCommandResponse('score', ctx, conf);
        assert.strictEqual(reply, '@Tester du hast 123 Punkte.');
    });

    await t.test('buildCommandResponse - commands listing', () => {
        const conf = {
            commands: {
                builtIn: {
                    score: { enabled: true, trigger: '!score' },
                    help: { enabled: true, trigger: '!help' }
                },
                listing: {
                    commands: { enabled: true, trigger: '!commands' }
                }
            }
        };
        const ctx = { user: {}, stats: {} };
        const reply = buildCommandResponse('commands', ctx, conf);
        assert.ok(reply.includes('!score'));
        assert.ok(reply.includes('!help'));
        assert.ok(reply.includes('!commands'));
    });
});
