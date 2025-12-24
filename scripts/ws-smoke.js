"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
function getArg(name) {
    const i = process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : undefined;
}
const port = Number(getArg("--port") ?? "5175");
const url = `ws://127.0.0.1:${port}/overlay/ws`;
console.log(`[smoke] connecting ${url}`);
const ws = new ws_1.default(url);
const timeout = setTimeout(() => {
    console.error("[smoke] timeout: no message received");
    process.exit(1);
}, 3000);
ws.on("open", () => console.log("[smoke] open"));
ws.on("message", (data) => {
    clearTimeout(timeout);
    try {
        const msg = JSON.parse(String(data));
        if (!msg.kind)
            throw new Error("no kind field");
        console.log("[smoke] ok:", msg.kind);
        process.exit(0);
    }
    catch (e) {
        console.error("[smoke] invalid json:", e?.message ?? e);
        process.exit(1);
    }
});
ws.on("error", (err) => {
    clearTimeout(timeout);
    console.error("[smoke] ws error:", err);
    process.exit(1);
});
