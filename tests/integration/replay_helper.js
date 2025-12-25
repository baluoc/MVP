// Integration Helper for Replay
// This logic is shared between the test runner and the manual script.

const fs = require('fs');
const path = require('path');
const { EventBus } = require('../../dist/src/core/bus');
const { UserStatsStore } = require('../../dist/src/stats/store');
const { ConfigStore } = require('../../dist/src/core/configStore');
const { normalizeChat, normalizeShare, normalizeGift } = require('../../dist/src/core/normalize');

// Load Config
const configStore = new ConfigStore();
// Use defaults if file not present, but allow override
let CORE_CONFIG = configStore.getCore();

// We need to mock the Overlay Broadcast to assert outputs
let overlayBroadcasts = [];
const mockOverlay = {
    broadcast: (msg) => {
        overlayBroadcasts.push(msg);
    }
};

// Initialize Core Systems
const bus = new EventBus();
const stats = new UserStatsStore();

// Subscribe like real app
bus.subscribe((ev) => {
    // Points Logic
    stats.ingest(ev, CORE_CONFIG.points);

    // In real app, we also trigger Overlay Commands here (via eventToOverlay)
    // For replay verification, we might want to check this too.
    const { eventToOverlay } = require('../../dist/src/core/eventToOverlay');
    const cmd = eventToOverlay(ev);
    if (cmd) {
         if (Array.isArray(cmd)) cmd.forEach(c => mockOverlay.broadcast(c));
         else mockOverlay.broadcast(cmd);
    }
});

function runReplay(fixturePath, configOverride) {
    if (configOverride) CORE_CONFIG = configOverride;

    console.log(`[Replay] Loading fixture: ${fixturePath}`);
    const rawEvents = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

    console.log(`[Replay] Processing ${rawEvents.length} events...`);

    rawEvents.forEach((raw, idx) => {
        let ev;
        switch(raw.type) {
            case 'chat': ev = normalizeChat(raw); break;
            case 'share': ev = normalizeShare(raw); break;
            case 'gift': ev = normalizeGift(raw); break;
            default: console.log(`[Replay] Unknown type ${raw.type}`); return;
        }

        // Inject into Bus
        bus.publish(ev);
    });

    return {
        stats,
        overlayBroadcasts
    };
}

module.exports = { runReplay, stats, overlayBroadcasts };
