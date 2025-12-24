import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");

interface CoreConfig {
  port?: number;
  [key: string]: any;
}

interface FullConfig {
  core: CoreConfig;
  addons: Record<string, AddonConfigWrapper>;
}

interface AddonConfigWrapper {
  enabled: boolean;
  config: any;
}

const DEFAULT_CONFIG: FullConfig = {
  core: { port: 5175 },
  addons: {},
};

export class ConfigStore {
  private data: FullConfig;

  constructor() {
    this.data = this.load();
  }

  private load(): FullConfig {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(CONFIG_FILE)) {
      this.save(DEFAULT_CONFIG);
      return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }
    try {
      const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch (e) {
      console.error("[ConfigStore] Failed to load config, using default:", e);
      return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }
  }

  private save(data: FullConfig) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tempFile = `${CONFIG_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
      fs.renameSync(tempFile, CONFIG_FILE);
    } catch (e) {
      console.error("[ConfigStore] Failed to save config:", e);
    }
  }

  // Core
  getCore(): CoreConfig {
    return this.data.core;
  }

  setCore(partial: Partial<CoreConfig>) {
    this.data.core = { ...this.data.core, ...partial };
    this.save(this.data);
  }

  // Add-ons
  getAddonEntry(id: string): AddonConfigWrapper {
    return this.data.addons[id] ?? { enabled: false, config: {} };
  }

  isAddonEnabled(id: string): boolean {
    return this.getAddonEntry(id).enabled;
  }

  setAddonEnabled(id: string, enabled: boolean) {
    const entry = this.getAddonEntry(id);
    entry.enabled = enabled;
    this.data.addons[id] = entry;
    this.save(this.data);
  }

  getAddonConfig(id: string): any {
    return this.getAddonEntry(id).config;
  }

  setAddonConfig(id: string, config: any) {
    const entry = this.getAddonEntry(id);
    entry.config = config;
    this.data.addons[id] = entry;
    this.save(this.data);
  }
}
