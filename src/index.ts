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
import { parseCommand, buildCommandResponse } from "./core/commands";
import { setupOAuth } from "./auth/oauth";

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
  const overlay = createOverlayServer(port, configStore);

  // Initialize OAuth Provider (Core) - must be before static to handle routes
  // But wait, express.static is usually generic. Specific routes take precedence.
  setupOAuth(overlay.app, configStore);

  overlay.app.use(express.static("public"));
  overlay.app.use("/artifacts", express.static(path.join(process.cwd(), "jules_review", "verification")));
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
          // Fetch Session ID from Config
          const conf = configStore.getCore();
          const session = conf.tiktok?.session;
          const options: any = {};
          if (session && session.mode === 'manual' && session.sessionId) {
              options.sessionId = session.sessionId;
              console.log("[System] Connecting with Session ID");
          }
          tiktokService.connect(u, options);
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
      overlay.broadcast, // Pass broadcast function
      (text) => tiktokService.sendChat(text) // Pass sendChat
  ));

  // Bus Logic
  bus.subscribe((ev) => {
    console.log(`[Event] ${ev.type} von ${ev.user?.nickname ?? "Unknown"}`);

    // Config und Points logic
    const conf = configStore.getCore();
    stats.ingest(ev, conf.points);

    // COMMAND Logic
    if (ev.type === "chat" && conf.chat?.enableSend === true) {
        // Check Conditions: SessionId present? Connected? Commands Enabled?
        const hasSession = conf.tiktok?.session?.sessionId && conf.tiktok.session.sessionId.length > 0;
        // Connected check is implicitly true if we receive events from TikTokService,
        // but explicit check matches spec better if we had access to state here easily.
        // Since we are in the bus subscription, receiving an event implies connection or mock.

        if (hasSession && (conf.commands?.enabled !== false)) {
            const txt = ev.payload.text || "";
            const cmdResult = parseCommand(txt, conf);

            if (cmdResult) {
                // stats.findUser works by uniqueId
                const userObj = stats.findUser(ev.user?.uniqueId);

                if (userObj) {
                    const reply = buildCommandResponse(cmdResult.cmdKey, { user: ev.user!, stats: userObj }, conf);
                    if (reply) {
                        tiktokService.sendChat(reply).catch(err => console.error("[Command] Reply failed", err));
                    }
                }
            }
        }
    }

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
                const tmpl = conf.tts.template || "{nickname} sagt {comment}"; // German Default
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
    const currentConf = configStore.getCore();
    const totalPoints = stats.getAll().reduce((sum, u) => sum + (u.points || 0), 0);
    overlay.broadcast({
      kind: "dashboard-update",
      stats: { viewers: tiktokService.getState().roomInfo?.roomUserCount || 0 },
      leaderboard: stats.getLeaderboard(),
      goalCurrent: totalPoints,
      goalTarget: currentConf.points?.goalTarget || 1000
    });
  }, 2000);

  await addonHost.loadAll();

  console.log("System ready. Waiting for connection...");
}

main().catch(console.error);
