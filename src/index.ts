import path from "path";
import express from "express";
import { EventBus } from "./core/bus";
import { createOverlayServer } from "./overlay/server";
import { UserStatsStore } from "./stats/store";
// import { createStatsRouter } from "./api/stats"; // Brauchen wir nicht mehr zwingend
import { startMock } from "./connectors/mock";
import { startTikTok } from "./connectors/tiktok";
import { eventToOverlay } from "./core/eventToOverlay";
import { AddonHost } from "./addons/host";
import { ConfigStore } from "./core/configStore";
import { RingBuffer } from "./core/ringbuffer";
import { createApiRouter } from "./api/routes";

function getArg(name: string) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function hasArg(name: string) {
  return process.argv.includes(name);
}

async function main() {
  const configStore = new ConfigStore();
  const coreConfig = configStore.getCore();
  const port = coreConfig.port || 5175;

  // Server Setup
  const overlay = createOverlayServer(port);
  overlay.app.use(express.static("public"));
  overlay.app.use(express.json()); // WICHTIG für POST Requests!

  // Core Systems
  const bus = new EventBus();
  const stats = new UserStatsStore(); // Stats instanziieren
  const ringBuffer = new RingBuffer(500);

  // Addons
  const addonsDir = path.join(__dirname, "../addons");
  const addonHost = new AddonHost(bus, overlay, stats, configStore, addonsDir);

  // API Router (MIT stats!)
  const connectorState = () => ({
      mode: hasArg("--mock") ? "mock" : "tiktok",
      connected: true // TODO: make dynamic?
  });

  const connectSystem = (u: string) => {
      if (hasArg("--mock")) {
          startMock(bus);
      } else {
          startTikTok(u, bus);
      }
  };

  overlay.app.use("/api", createApiRouter(addonHost, ringBuffer, configStore, connectorState, stats, connectSystem));

  // Bus Logic
  bus.subscribe((ev) => {
    console.log(`[Event] ${ev.type} von ${ev.user?.nickname ?? "Unknown"}`);

    // Config und Points logic
    const conf = configStore.getCore();
    stats.ingest(ev, conf.points);

    // TTS Logic Trigger
    if (conf.tts && conf.tts.enabled) {
        let textToSpeak = "";

        // Regel: Chat vorlesen?
        if (ev.type === "chat" && conf.tts.readChat) {
            textToSpeak = `${ev.user?.nickname} sagt: ${ev.payload.text}`;
        }
        // Regel: Geschenk vorlesen?
        else if (ev.type === "gift" && conf.tts.readGifts) {
            textToSpeak = `${ev.user?.nickname} sendet ${ev.payload.count} mal ${ev.payload.giftName}`;
        }

        // Sende Speak-Befehl an Frontend
        if (textToSpeak) {
            overlay.broadcast({ kind: "speak", text: textToSpeak });
        }
    }

    ringBuffer.push(ev);
    const cmd = eventToOverlay(ev);
    if (cmd) {
        if (Array.isArray(cmd)) cmd.forEach(c => overlay.broadcast(c));
        else overlay.broadcast(cmd);
    }
  });

  // Dashboard Heartbeat
  setInterval(() => {
    overlay.broadcast({
      kind: "dashboard-update",
      stats: { viewers: 0 }, // Viewers logic tbd
      leaderboard: stats.getLeaderboard()
    });
  }, 2000);

  await addonHost.loadAll();

  console.log("System ready. Waiting for connection...");
}

main().catch(console.error);
