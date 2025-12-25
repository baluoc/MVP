import fs from "fs";
import path from "path";

const CONFIG_FILE = path.resolve("data", "config.json");

export const DEFAULT_CONFIG = {
  // Server Core
  port: 5175,

  // Punktesystem
  points: {
    name: "Punkte",
    coin: 10,       // 10 Punkte pro Coin (Wert)
    share: 50,      // 50 Punkte pro Share
    chat: 5,        // 5 Punkte pro Nachricht
    subBonus: 10    // 10% Bonus für Abonnenten
  },

  // Level System
  levels: {
    points: 100,        // Basis: 100 Punkte für Level 2
    multiplier: 1.5     // Exponentieller Faktor
  },

  // Integrationen
  obs: {
    ip: "127.0.0.1",
    port: 4455,
    password: ""
  },
  streamerbot: {
    address: "127.0.0.1",
    port: 8080,
    endpoint: "/"
  },

  // TTS (Text-zu-Sprache)
  tts: {
    enabled: false,
    voice: "Google Deutsch",
    volume: 1.0,
    minLevel: 0,      // Ab welchem Level darf man sprechen?
    readChat: false,  // Soll jeder Chat gelesen werden?
    readGifts: true   // Sollen Geschenke gelesen werden?
  },

  // Overlay Widgets (Positionen)
  widgets: [
    { id: "chat", type: "chat", x: 20, y: 20, visible: true, scale: 1 },
    { id: "alert", type: "alert", x: 100, y: 100, visible: true, scale: 1 },
    { id: "leaderboard", type: "leaderboard", x: 20, y: 500, visible: true, scale: 0.8 }
  ]
};

export class ConfigStore {
  private data: any;

  constructor() {
    this.load();
  }

  getCore() { return this.data; }
  setCore(newConf: any) {
    this.data = { ...this.data, ...newConf };
    this.save();
  }

  // Hilfsmethode für Addons
  getAddonConfig(addonId: string) {
    if (!this.data.addons) this.data.addons = {};
    return this.data.addons[addonId] || {};
  }

  setAddonConfig(addonId: string, cfg: any) {
    if (!this.data.addons) this.data.addons = {};
    this.data.addons[addonId] = cfg;
    this.save();
  }

  // --- ADDON MANAGEMENT ---
  isAddonEnabled(addonId: string): boolean {
    if (!this.data.addonsMeta) this.data.addonsMeta = {};
    return this.data.addonsMeta[addonId]?.enabled ?? false;
  }

  setAddonEnabled(addonId: string, enabled: boolean) {
    if (!this.data.addonsMeta) this.data.addonsMeta = {};
    if (!this.data.addonsMeta[addonId]) this.data.addonsMeta[addonId] = {};
    this.data.addonsMeta[addonId].enabled = enabled;
    this.save();
  }

  load() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
        const loaded = JSON.parse(raw);
        // Merge mit Defaults, damit neue Felder (wie 'tts') vorhanden sind
        this.data = { ...DEFAULT_CONFIG, ...loaded,
            points: { ...DEFAULT_CONFIG.points, ...(loaded.points || {}) },
            levels: { ...DEFAULT_CONFIG.levels, ...(loaded.levels || {}) },
            tts: { ...DEFAULT_CONFIG.tts, ...(loaded.tts || {}) },
            obs: { ...DEFAULT_CONFIG.obs, ...(loaded.obs || {}) }
        };
      } else {
        this.data = { ...DEFAULT_CONFIG };
      }
    } catch (e) {
      console.error("[Config] Load failed, using defaults", e);
      this.data = { ...DEFAULT_CONFIG };
    }
  }

  save() {
    try {
      if (!fs.existsSync("data")) fs.mkdirSync("data");
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.data, null, 2));
    } catch (e) {
      console.error("[Config] Save failed", e);
    }
  }
}
