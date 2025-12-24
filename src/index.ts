import path from "path";
import express from "express";
import { EventBus } from "./core/bus";
import { createOverlayServer } from "./overlay/server";
import { UserStatsStore } from "./stats/store";
import { createStatsRouter } from "./api/stats";
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
  // 1. Args & Config
  const portArg = getArg("--port");
  const mock = hasArg("--mock");
  const user = getArg("--user") || getArg("-u");

  const configStore = new ConfigStore();
  const coreConfig = configStore.getCore();

  // Override port if arg provided, else config, else default
  const port = portArg ? Number(portArg) : (coreConfig.port || 5175);

  // Update config if arg is different? Maybe strictly transient arg.
  // Let's stick to using port for server.
  if (coreConfig.port !== port) {
      // optional: update config with new default?
      // configStore.setCore({ port });
  }

  if (!mock && !user) {
    console.log("Usage:");
    console.log(" npm run dev -- --mock [--port 5175]");
    console.log(" npm run dev -- --user <tiktokName> [--port 5175]");
    process.exit(1);
  }

  // 2. Overlay Server
  const overlay = createOverlayServer(port);

  // NEU: Statische Dateien (Dashboard) ausliefern
  overlay.app.use(express.static("public"));

  // 3. Bus, Stats, Ringbuffer
  const bus = new EventBus();
  const stats = new UserStatsStore();
  const ringBuffer = new RingBuffer(500);

  // 4. API Routes
  // Legacy stats routes
  overlay.app.use("/api", createStatsRouter(stats));

  // New Core APIs
  const connectorState = () => ({
      mode: mock ? "mock" : "tiktok",
      user: user || "mock",
      connected: true // simplistic for now, ideally track connection status
  });

  const addonsDir = path.join(__dirname, "../addons");
  const addonHost = new AddonHost(bus, overlay, stats, configStore, addonsDir);

  overlay.app.use("/api", createApiRouter(addonHost, ringBuffer, configStore, connectorState));

  let currentViewerCount = 0;

  // 5. Main bus subscription
  bus.subscribe((ev) => {
    // Viewer Count abfangen
    if (ev.type === "roomUser" && typeof ev.payload.viewerCount === 'number') {
      currentViewerCount = ev.payload.viewerCount;
    }

    // log
    console.log(`[${new Date(ev.ts).toLocaleTimeString()}] ${ev.source}:${ev.type} ${ev.user?.uniqueId ?? ""}`, ev.payload);
    // stats
    stats.ingest(ev);
    // ringbuffer
    ringBuffer.push(ev);
    // overlay
    const cmd = eventToOverlay(ev);
    if (cmd) {
      if (Array.isArray(cmd)) {
        cmd.forEach(c => overlay.broadcast(c));
      } else {
        overlay.broadcast(cmd);
      }
    }
  });

  // NEU: Alle 2 Sekunden Dashboard-Daten senden
  setInterval(() => {
    overlay.broadcast({
      kind: "dashboard-update",
      stats: { viewers: currentViewerCount },
      leaderboard: stats.getLeaderboard()
    });
  }, 2000);

  // 6. Start Add-ons
  await addonHost.loadAll();

  // 7. Start Connector
  if (mock) {
    startMock(bus);
  } else {
    // For real connector, we might want to track connection state in a variable for API
    await startTikTok(user!, bus);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
