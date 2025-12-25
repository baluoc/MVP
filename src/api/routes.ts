import { Router } from "express";
import { AddonHost } from "../addons/host";
import { RingBuffer } from "../core/ringbuffer";
import { ConfigStore } from "../core/configStore";
import { UserStatsStore } from "../stats/store";
import { getWidgetRegistry } from "../overlay/registry";

export function createApiRouter(
  addonHost: AddonHost,
  ringBuffer: RingBuffer,
  configStore: ConfigStore,
  connectorState: () => any,
  stats: UserStatsStore,
  onConnect: (uniqueId: string) => void,
  getGiftCatalog: () => any[], // New param
  broadcastOverlay: (cmd: any) => void, // New param for live updates
  sendChat?: (text: string) => Promise<{ok: boolean, mode: string, reason?: string}> // New param for sending chat
) {
  const r = Router();

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
    res.json(configStore.getCore());
  });

  r.post("/settings", (req, res) => {
    configStore.setCore(req.body);
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
      // NOTE: Protection logic (header check) can be added here if needed,
      // but current task removed Supervisor requirement.
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
          // Pass through known errors (NO_SESSIONID, RATE_LIMIT)
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

      // Sanitized response
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
          conf.tiktok.session.sessionId = sessionId; // Saved RAW in config (backend only)
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

  // 6. Gifts Catalog (NEW)
  r.get("/gifts", (req, res) => {
      const catalog = getGiftCatalog();
      if (catalog && catalog.length > 0) {
          res.json(catalog);
      } else {
          // Fallback
          try {
              const fallback = require("../../fixtures/gifts_fallback.json");
              res.json(fallback);
          } catch(e) {
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

    // Config Update
    const conf = configStore.getCore();
    if(!conf.overlay) conf.overlay = {};

    // Simple check if scene exists
    const exists = conf.overlay.scenes.find((s: any) => s.id === sceneId);
    if (!exists) return res.status(404).json({ error: "Scene not found" });

    conf.overlay.activeSceneId = sceneId;
    configStore.setCore(conf);

    // Broadcast change so overlay updates immediately
    broadcastOverlay({ kind: 'scene', sceneId });

    res.json({ ok: true });
  });

  // --- STATUS & ADDONS ---

  r.get("/status", (_req, res) => {
    const coreConfig = configStore.getCore();
    const cState = connectorState();
    res.json({
      uptime: process.uptime(),
      version: "1.0.0",
      overlay: { url: `ws://localhost:${coreConfig.port || 5175}/overlay/ws` },
      addonsLoaded: addonHost.getAddonsList().length,
      // Expanded Connector State
      connected: cState.connected,
      uniqueId: cState.uniqueId,
      roomInfo: cState.roomInfo,
      lastError: cState.lastError,
      mode: cState.mode
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
