import fs from "fs";
import path from "path";

const CONFIG_FILE = path.resolve("data", "config.json");

export const DEFAULT_CONFIG = {
  // Server Core
  port: 5175,

  // Punktesystem
  points: {
    name: "Punkte",
    coin: 10,
    share: 50,
    chat: 5,
    subBonus: 10
  },

  // Level System
  levels: {
    points: 100,
    multiplier: 1.5
  },

  // Integrationen
  obs: { ip: "127.0.0.1", port: 4455, password: "" },
  streamerbot: { address: "127.0.0.1", port: 8080, endpoint: "/" },

  // TTS (Das Herzstück)
  tts: {
    enabled: false,
    language: "de-DE",
    voice: "default",
    randomVoice: true,
    volume: 0.7,
    speed: 1.0,
    pitch: 1.0,

    // Who
    allowed: {
      all: true,
      follower: true,
      sub: true,
      mod: true,
      team: true,
      topGifters: true,
      whitelist: [] // Liste von Usernamen
    },

    // When/Trigger
    trigger: "any", // "any", "dot", "slash", "command"
    command: "!tts",

    // Cost
    mode: "free", // "free", "cost"
    costPerMsg: 5,

    // Protection
    spam: {
      cooldown: 0,
      maxQueue: 5,
      maxChar: 300,
      filterSpam: true,
      filterMentions: false,
      filterCommands: false
    },

    // Advanced
    template: "{nickname} sagt {comment}",
    specialUsers: [] // [{ name: "agent_one", voice: "...", speed: 1.2 }]
  },

  // Overlay Widgets
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
    // Deep Merge für verschachtelte Objekte wie 'tts'
    this.data = {
        ...this.data,
        ...newConf,
        tts: { ...this.data.tts, ...(newConf.tts || {}) },
        points: { ...this.data.points, ...(newConf.points || {}) }
    };
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
        // Merge mit Defaults
        this.data = { ...DEFAULT_CONFIG, ...loaded };

        // Sicherstellen, dass verschachtelte Objekte existieren
        if(!this.data.tts) this.data.tts = DEFAULT_CONFIG.tts;
        this.data.tts = { ...DEFAULT_CONFIG.tts, ...this.data.tts };

      } else {
        this.data = { ...DEFAULT_CONFIG };
      }
    } catch (e) {
      this.data = { ...DEFAULT_CONFIG };
    }
  }

  save() {
    try {
      if (!fs.existsSync("data")) fs.mkdirSync("data");
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.data, null, 2));
    } catch (e) { console.error("[Config] Save failed", e); }
  }
}
