import { Router } from "express";
import { AddonHost } from "../addons/host";
import { RingBuffer } from "../core/ringbuffer";
import { ConfigStore } from "../core/configStore";
import { UserStatsStore } from "../stats/store"; // Importieren!

export function createApiRouter(
  addonHost: AddonHost,
  ringBuffer: RingBuffer,
  configStore: ConfigStore,
  connectorState: () => any,
  stats: UserStatsStore,
  onConnect: (uniqueId: string) => void
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
    const result = stats.getPaginated(page, limit, "score");
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

  // 4. Chat (Mock-Funktion für 'Senden')
  r.post("/chat", (req, res) => {
      const { text } = req.body;
      console.log("[Chat] WÜRDE SENDEN (Mock):", text);
      // Hier später echte TikTok API Logik
      res.json({ ok: true, mocked: true });
  });

  // --- STATUS & ADDONS ---

  r.get("/status", (_req, res) => {
    const coreConfig = configStore.getCore();
    res.json({
      uptime: process.uptime(),
      version: "1.0.0",
      connector: connectorState(),
      overlay: { url: `ws://localhost:${coreConfig.port || 5175}/overlay/ws` },
      addonsLoaded: addonHost.getAddonsList().length,
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
