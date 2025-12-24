
import { UserStatsStore } from "./src/stats/store";
import { AppEvent } from "./src/core/types";
import fs from "fs";
import path from "path";

const store = new UserStatsStore();
const dbFile = path.resolve("data", "stats.json");

// Clean up previous run
if (fs.existsSync(dbFile)) {
  fs.unlinkSync(dbFile);
}

// Ingest a dummy event
const ev: AppEvent = {
  id: "test1",
  ts: Date.now(),
  source: "mock",
  type: "chat",
  user: { userId: "u1", uniqueId: "tester", nickname: "Tester" },
  payload: { text: "hello" }
};

store.ingest(ev);

// Force save (we can't call private save directly, but reset calls it, but reset clears map first :/)
// Actually, I can't easily force save without exposing it or waiting.
// BUT, the requirement said: "nach ingest this.save() aufrufen wenn du es sofort willst".
// I didn't add save() after ingest because the plan said interval.
// I will wait for 30 seconds in the real verification.
// OR I can use `any` cast to call private method for testing.

(store as any).save();

// Check if file exists
if (!fs.existsSync(dbFile)) {
  console.error("FAIL: stats.json not created");
  process.exit(1);
}

const content = fs.readFileSync(dbFile, "utf-8");
console.log("File content:", content);

// Create new store to test load
const store2 = new UserStatsStore();
// it loads in constructor
const users = store2.getAll();
if (users.length !== 1) {
    console.error(`FAIL: Expected 1 user, got ${users.length}`);
    process.exit(1);
}

if (users[0].uniqueId !== "tester") {
     console.error(`FAIL: Expected uniqueId 'tester', got ${users[0].uniqueId}`);
     process.exit(1);
}

console.log("SUCCESS: Persistence working.");
