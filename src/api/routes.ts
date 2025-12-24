import { Router } from "express";
import { AddonHost } from "../addons/host";
import { RingBuffer } from "../core/ringbuffer";
import { ConfigStore } from "../core/configStore";

export function createApiRouter(
  addonHost: AddonHost,
  ringBuffer: RingBuffer,
  configStore: ConfigStore,
  connectorState: () => any
) {
  const r = Router();

  // C1: Status
  r.get("/status", (_req, res) => {
    const coreConfig = configStore.getCore();
    res.json({
      uptime: process.uptime(),
      version: process.env.npm_package_version || "unknown",
      connector: connectorState(),
      overlay: {
        url: `ws://localhost:${coreConfig.port || 5175}/overlay/ws`
      },
      addonsLoaded: addonHost.getAddonsList().length,
    });
  });

  // C2: Add-ons
  r.get("/addons", (_req, res) => {
    res.json(addonHost.getAddonsList());
  });

  r.post("/addons/:id/enable", (req, res) => {
    const { id } = req.params;
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") {
        res.status(400).json({ error: "enabled must be boolean" });
        return;
    }
    addonHost.enableAddon(id, enabled);
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

  // C3: Events Ringbuffer
  r.get("/events", (req, res) => {
    const limit = Number(req.query.limit) || 200;
    const events = ringBuffer.getAll();
    // Return last 'limit' events (newest at end? RingBuffer pushes to end)
    // Client usually wants newest. Let's return as is (chronological).
    const result = events.slice(-limit);
    res.json(result);
  });

  return r;
}
