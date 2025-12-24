import fs from "fs";
import path from "path";
import { EventBus } from "../core/bus";
import { OverlayServer } from "../overlay/server";
import { UserStatsStore } from "../stats/store";
import { ConfigStore } from "../core/configStore";
import { AddonContext, AddonManifest, AddonModule } from "./types";

interface LoadedAddon {
  manifest: AddonManifest;
  dirPath: string;
  dispose?: () => void;
  status: "active" | "error" | "disabled";
  error?: string;
}

export class AddonHost {
  private addons = new Map<string, LoadedAddon>();

  constructor(
    private bus: EventBus,
    private overlay: OverlayServer,
    private stats: UserStatsStore,
    private configStore: ConfigStore,
    private addonsDir: string
  ) {}

  async loadAll() {
    if (!fs.existsSync(this.addonsDir)) {
      try {
        fs.mkdirSync(this.addonsDir, { recursive: true });
      } catch (e) {
        console.error("[AddonHost] Could not create addons dir:", e);
        return;
      }
    }

    const entries = fs.readdirSync(this.addonsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await this.scanAddon(entry.name);
      }
    }
  }

  private async scanAddon(dirName: string) {
    const addonPath = path.join(this.addonsDir, dirName);
    const manifestPath = path.join(addonPath, "manifest.json");

    if (!fs.existsSync(manifestPath)) return;

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as AddonManifest;
      if (this.addons.has(manifest.id)) {
        console.warn(`[AddonHost] Duplicate addon id: ${manifest.id} in ${dirName}`);
        return;
      }

      this.addons.set(manifest.id, {
        manifest,
        dirPath: addonPath,
        status: "disabled",
      });

      const enabled = this.configStore.isAddonEnabled(manifest.id);
      if (enabled) {
        await this.activateAddon(manifest.id);
      }

    } catch (e: any) {
      console.error(`[AddonHost] Failed to scan ${dirName}:`, e);
    }
  }

  async activateAddon(id: string) {
    const entry = this.addons.get(id);
    if (!entry) return;
    if (entry.status === "active") return;

    try {
      const mainFile = path.join(entry.dirPath, entry.manifest.main);

      // Dynamic import
      const mod = await import(mainFile);

      if (typeof mod.activate !== "function") {
        throw new Error("No activate function exported");
      }

      const ctx = this.createContext(id);
      const dispose = (mod as AddonModule).activate(ctx);

      entry.status = "active";
      entry.dispose = typeof dispose === "function" ? dispose : undefined;
      entry.error = undefined;
      console.log(`[AddonHost] Activated ${id}`);

    } catch (e: any) {
      console.error(`[AddonHost] Failed to activate ${id}:`, e);
      entry.status = "error";
      entry.error = String(e?.message ?? e);
    }
  }

  deactivateAddon(id: string) {
    const entry = this.addons.get(id);
    if (!entry) return;
    if (entry.status !== "active") return;

    try {
      if (entry.dispose) {
        entry.dispose();
      }
    } catch (e) {
      console.error(`[AddonHost] Error disposing ${id}:`, e);
    }

    entry.status = "disabled";
    entry.dispose = undefined;
    console.log(`[AddonHost] Deactivated ${id}`);
  }

  enableAddon(id: string, enabled: boolean) {
    this.configStore.setAddonEnabled(id, enabled);
    if (enabled) {
      this.activateAddon(id);
    } else {
      this.deactivateAddon(id);
    }
  }

  getAddonsList() {
    return Array.from(this.addons.values()).map(a => ({
      id: a.manifest.id,
      name: a.manifest.name,
      version: a.manifest.version,
      description: a.manifest.description,
      enabled: this.configStore.isAddonEnabled(a.manifest.id),
      status: a.status,
      error: a.error
    }));
  }

  private createContext(addonId: string): AddonContext {
    return {
      events: {
        subscribe: (fn) => this.bus.subscribe(fn),
      },
      overlay: {
        emit: (cmd) => this.overlay.broadcast(cmd),
      },
      stats: {
        getAll: () => this.stats.getAll(),
        getByKey: (key) => this.stats.getAll().find(u => u.key === key),
      },
      config: {
        get: () => this.configStore.getAddonConfig(addonId),
        set: (cfg) => this.configStore.setAddonConfig(addonId, cfg),
      },
    };
  }
}
