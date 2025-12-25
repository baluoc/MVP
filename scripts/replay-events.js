const path = require('path');
const { runReplay } = require('../tests/integration/replay_helper');

const FIXTURE = process.argv[2] || path.resolve(__dirname, '../fixtures/events.sample.json');

console.log("=== STARTING REPLAY ===");
const { stats, overlayBroadcasts } = runReplay(FIXTURE);

// Output Report
console.log("\n=== REPLAY REPORT ===");
console.log(`Events Processed: ${overlayBroadcasts.length} overlay triggers`);

console.log("\n--- User Stats ---");
stats.getAll().forEach(u => {
    console.log(`[${u.nickname}] Points: ${u.points} | Diamonds: ${u.diamondCount} | Chat: ${u.chatCount}`);
});

console.log("\n--- Overlay Log (Last 5) ---");
overlayBroadcasts.slice(-5).forEach(b => {
    console.log(JSON.stringify(b));
});

if(stats.dispose) stats.dispose();
console.log("\n=== DONE ===");
