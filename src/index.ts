import path from "path";
import express from "express";
import { EventBus } from "./core/bus";
import { createOverlayServer } from "./overlay/server";
import { UserStatsStore } from "./stats/store";
import { startMock } from "./connectors/mock";
import { TikTokService } from "./connectors/tiktokService";
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
  overlay.app.use(express.json());

  // Core Systems
  const bus = new EventBus();
  const stats = new UserStatsStore();
  const ringBuffer = new RingBuffer(500);

  // Addons
  const addonsDir = path.join(__dirname, "../addons");
  const addonHost = new AddonHost(bus, overlay, stats, configStore, addonsDir);

  // Connectors
  const tiktokService = new TikTokService(bus);

  const connectorState = () => {
      if (hasArg("--mock")) {
          return { mode: "mock", connected: true, uniqueId: "mock_user", lastError: null, roomInfo: null };
      }
      return { mode: "tiktok", ...tiktokService.getState() };
  };

  const getGiftCatalog = () => {
      if (hasArg("--mock")) return []; // Mock gift catalog TODO
      return tiktokService.getGiftCatalog();
  }

  const connectSystem = (u: string) => {
      if (hasArg("--mock")) {
          startMock(bus);
      } else {
          tiktokService.connect(u);
      }
  };

  // Pass additional getters to API router
  overlay.app.use("/api", createApiRouter(
      addonHost,
      ringBuffer,
      configStore,
      connectorState,
      stats,
      connectSystem,
      getGiftCatalog,
      overlay.broadcast // Pass broadcast function
  ));

  // Bus Logic
  bus.subscribe((ev) => {
    console.log(`[Event] ${ev.type} von ${ev.user?.nickname ?? "Unknown"}`);

    // Config und Points logic
    const conf = configStore.getCore();
    stats.ingest(ev, conf.points);

    // TTS Logic Trigger
    if (conf.tts && conf.tts.enabled) {
        let shouldSpeak = false;
        let textToSpeak = "";

        // CHAT TTS
        if (ev.type === "chat") {
            const txt = ev.payload.text || "";
            const trigger = conf.tts.trigger || "any"; // any, dot, slash, command
            const cmd = conf.tts.command || "!tts";

            if (trigger === "any") shouldSpeak = true;
            else if (trigger === "dot" && txt.startsWith(".")) shouldSpeak = true;
            else if (trigger === "slash" && txt.startsWith("/")) shouldSpeak = true;
            else if (trigger === "command" && txt.startsWith(cmd)) shouldSpeak = true;

            // TODO: Permissions check (allowed roles) - impl simplified for now
            // if (!checkPermissions(ev.user, conf.tts.allowed)) shouldSpeak = false;

            if (shouldSpeak) {
                // Template
                const tmpl = conf.tts.template || "{nickname} says {comment}";
                textToSpeak = tmpl
                    .replace("{nickname}", ev.user?.nickname || "User")
                    .replace("{username}", ev.user?.uniqueId || "")
                    .replace("{comment}", txt);
            }
        }

        // TODO: Gift TTS (if configured to read gifts separate from chat)

        // Broadcast Speak Command
        if (shouldSpeak && textToSpeak) {
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
      stats: { viewers: tiktokService.getState().roomInfo?.roomUserCount || 0 },
      leaderboard: stats.getLeaderboard()
    });
  }, 2000);

  await addonHost.loadAll();

  console.log("System ready. Waiting for connection...");
}

main().catch(console.error);
