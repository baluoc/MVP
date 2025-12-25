import { Router } from "express";
import { AddonHost } from "../addons/host";
import { RingBuffer } from "../core/ringbuffer";
import { ConfigStore } from "../core/configStore";
import { UserStatsStore } from "../stats/store";
import { getWidgetRegistry } from "../overlay/registry";
import { obsService } from "../connectors/obsService";
import { streamerBotService } from "../connectors/streamerbotService";

export function createApiRouter(
  addonHost: AddonHost,
  ringBuffer: RingBuffer,
  configStore: ConfigStore,
  connectorState: () => any,
  stats: UserStatsStore,
  onConnect: (uniqueId: string) => void,
  getGiftCatalog: () => any[],
  broadcastOverlay: (cmd: any) => void,
  sendChat?: (text: string) => Promise<{ok: boolean, mode: string, reason?: string}>
) {
  const r = Router();

  // Initialize Services with Config
  const conf = configStore.getCore();
  if (conf.obs) obsService.configure(conf.obs);
  if (conf.streamerbot) streamerBotService.configure(conf.streamerbot);
  // Migrate legacy Simabot if present?
  if (conf.simabot && conf.simabot.enabled) {
     // Optional: migrate config on fly or just ignore
  }

  // --- CORE ROUTES ---

  // 0. Manual Connect
  r.post("/connect", (req, res) => {
    const { uniqueId } = req.body;
    if (!uniqueId) return res.status(400).json({ error: "Missing uniqueId" });
    console.log("[API] Manuelle Verbindung für:", uniqueId);
    onConnect(uniqueId);
    res.json({ ok: true });
  });

  // 1. Settings (Config)
  r.get("/settings", (req, res) => {
    // SECURITY: Clone and redact sensitive fields
    const core = JSON.parse(JSON.stringify(configStore.getCore()));

    if (core.tiktok?.session) core.tiktok.session.sessionId = "";
    if (core.obs) core.obs.password = "";
    if (core.streamerbot) core.streamerbot.password = "";

    res.json(core);
  });

  r.post("/settings", (req, res) => {
    configStore.setCore(req.body);
    // Reconfigure services dynamically
    if (req.body.obs) obsService.configure(req.body.obs);
    if (req.body.streamerbot) streamerBotService.configure(req.body.streamerbot);

    res.json({ ok: true });
  });

  // 2. Users (Datenbank)
  r.get("/users", (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const sort = (req.query.sort as "score" | "diamonds") || "score";

    const result = stats.getPaginated(page, limit, sort);
    res.json(result);
  });

  // 2b. User Adjustment
  r.post("/users/:id/adjust", (req, res) => {
    const { id } = req.params;
    const { delta } = req.body;

    if (typeof delta !== "number") {
      res.status(400).json({ error: "delta must be a number" });
      return;
    }

    const updated = stats.adjustManualPoints(id, delta);
    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ ok: true, user: updated });
  });

  // 3. Reset (Punkte löschen)
  r.post("/reset-stats", (req, res) => {
      stats.reset();
      res.json({ ok: true });
  });

  // 4. Chat Senden (Live)
  r.post("/chat/send", async (req, res) => {
      const conf = configStore.getCore();
      if (conf.chat?.enableSend !== true) {
          return res.status(403).json({ ok: false, reason: 'DISABLED' });
      }

      const { text } = req.body;
      if (!text || typeof text !== 'string') return res.status(400).json({ ok: false, reason: "Text missing" });
      if (text.length > 300) return res.status(400).json({ ok: false, reason: "Text too long" });

      if (!sendChat) {
          return res.json({ ok: false, mode: "stub", reason: "SendChat not hooked" });
      }

      try {
          const result = await sendChat(text.trim());
          res.json(result);
      } catch (e: any) {
          const reason = e.message;
          res.json({ ok: false, mode: "live", reason });
      }
  });

  // Legacy mock alias
  r.post("/chat", (req, res) => {
      res.status(410).json({ ok: false, reason: 'DEPRECATED' });
  });

  // 5. TikTok Session Management
  r.get("/tiktok/session", (req, res) => {
      const conf = configStore.getCore();
      const s = conf.tiktok?.session || {};

      res.json({
          mode: s.mode || "none",
          hasSessionId: !!s.sessionId && s.sessionId.length > 0,
          updatedAt: s.updatedAt || 0
      });
  });

  r.post("/tiktok/session", (req, res) => {
      const { mode, sessionId } = req.body;
      if (!mode) return res.status(400).json({ error: "Missing mode" });

      const conf = configStore.getCore();
      if (!conf.tiktok) conf.tiktok = {};
      if (!conf.tiktok.session) conf.tiktok.session = {};

      conf.tiktok.session.mode = mode;
      if (sessionId !== undefined) {
          conf.tiktok.session.sessionId = sessionId;
      }
      conf.tiktok.session.updatedAt = Date.now();

      configStore.setCore(conf);
      res.json({ ok: true });
  });

  r.post("/tiktok/session/clear", (req, res) => {
      const conf = configStore.getCore();
      if (conf.tiktok?.session) {
          conf.tiktok.session.sessionId = "";
          conf.tiktok.session.mode = "none";
          conf.tiktok.session.updatedAt = Date.now();
          configStore.setCore(conf);
      }
      res.json({ ok: true });
  });

  // 6. Gifts Catalog
  r.get("/gifts", (req, res) => {
      const catalog = getGiftCatalog();
      if (catalog && catalog.length > 0) {
          res.json(catalog);
      } else {
          try {
              const path = require('path');
              const fallbackPath = path.join(process.cwd(), 'fixtures', 'gifts_fallback.json');
              const fallback = require(fallbackPath);
              res.json(fallback);
          } catch(e) {
              console.error("Failed to load fallback gifts", e);
              res.json([]);
          }
      }
  });

  // --- OVERLAY API ---

  r.get("/overlay/widgets", (req, res) => {
    res.json(getWidgetRegistry());
  });

  r.post("/overlay/active-scene", (req, res) => {
    const { sceneId } = req.body;
    if (!sceneId) return res.status(400).json({ error: "Missing sceneId" });

    const conf = configStore.getCore();
    if(!conf.overlay) conf.overlay = {};

    const exists = conf.overlay.scenes.find((s: any) => s.id === sceneId);
    if (!exists) return res.status(404).json({ error: "Scene not found" });

    conf.overlay.activeSceneId = sceneId;
    configStore.setCore(conf);

    broadcastOverlay({ kind: 'scene', sceneId });

    res.json({ ok: true });
  });

  // --- OBS INTEGRATION (REAL) ---
  r.post("/obs/connect", async (req, res) => {
      try {
          await obsService.connect();
          res.json({ ok: true });
      } catch(e:any) {
          res.status(500).json({ ok: false, reason: e.message });
      }
  });

  r.post("/obs/disconnect", async (req, res) => {
      await obsService.disconnect();
      res.json({ ok: true });
  });

  r.post("/obs/test", async (req, res) => {
      const status = obsService.getStatus();
      if(status.connected) {
          res.json({ ok: true, info: status });
      } else {
          try {
              await obsService.connect();
              res.json({ ok: true, info: "Connected" });
          } catch(e:any) {
              res.json({ ok: false, reason: e.message });
          }
      }
  });

  r.post("/obs/action", async (req, res) => {
      const { type, data } = req.body;
      if(!type) return res.status(400).json({ error: "Missing action type" });

      try {
          if (type === 'switchScene') {
              await obsService.switchScene(data.sceneName);
          } else {
              await obsService.sendRaw(type, data);
          }
          res.json({ ok: true });
      } catch(e:any) {
          res.status(500).json({ ok: false, reason: e.message });
      }
  });

  r.post("/obs/raw", async (req, res) => {
      const { requestType, requestData } = req.body;
      try {
          const result = await obsService.sendRaw(requestType, requestData);
          res.json({ ok: true, result });
      } catch(e:any) {
          res.status(500).json({ ok: false, reason: e.message });
      }
  });


  // --- STREAMER.BOT INTEGRATION (REAL) ---
  r.post("/streamerbot/connect", async (req, res) => {
      try {
          streamerBotService.connect();
          res.json({ ok: true });
      } catch(e:any) {
          res.status(500).json({ ok: false, reason: e.message });
      }
  });

  r.post("/streamerbot/disconnect", (req, res) => {
      streamerBotService.disconnect();
      res.json({ ok: true });
  });

  r.post("/streamerbot/test", (req, res) => {
      const status = streamerBotService.getStatus();
      if(status.connected) {
          res.json({ ok: true, info: status });
      } else {
          streamerBotService.connect();
          // Async connect, just return connecting state
          res.json({ ok: true, info: "Connecting..." });
      }
  });

  r.post("/streamerbot/action", async (req, res) => {
      const { action } = req.body; // Expecting action name/id
      if(!action) return res.status(400).json({ error: "Missing action" });

      try {
          await streamerBotService.doAction(action);
          res.json({ ok: true });
      } catch(e:any) {
           res.status(500).json({ ok: false, reason: e.message });
      }
  });

  r.post("/streamerbot/raw", (req, res) => {
      const { payload } = req.body;
      try {
          streamerBotService.sendJson(payload);
          res.json({ ok: true });
      } catch(e:any) {
           res.status(500).json({ ok: false, reason: e.message });
      }
  });

  // --- STATUS & ADDONS ---

  r.get("/status", (req, res) => {
    const cState = connectorState();

    const host = req.get('host');
    const proto = req.protocol;

    res.json({
      uptime: process.uptime(),
      version: "1.0.0",
      overlay: { url: `${proto}://${host}/overlay/main` },
      addonsLoaded: addonHost.getAddonsList().length,
      connected: cState.connected,
      uniqueId: cState.uniqueId,
      roomInfo: cState.roomInfo,
      lastError: cState.lastError,
      mode: cState.mode,
      // Integrations status
      obs: obsService.getStatus(),
      streamerbot: streamerBotService.getStatus()
    });
  });

  // Addons API
  r.get("/addons", (_req, res) => res.json(addonHost.getAddonsList()));
  r.post("/addons/:id/enable", (req, res) => {
      addonHost.enableAddon(req.params.id, req.body.enabled);
      res.json({ ok: true });
  });

  r.get("/addons/:id/config", (req, res) => {
    const { id } = req.params;
    res.json(configStore.getAddonConfig(id));
  });

  r.post("/addons/:id/config", (req, res) => {
    const { id } = req.params;
    configStore.setAddonConfig(id, req.body);
    res.json({ ok: true });
  });

  // Event History
  r.get("/events", (req, res) => {
    const limit = Number(req.query.limit) || 50;
    res.json(ringBuffer.getAll().slice(-limit));
  });

  return r;
}
