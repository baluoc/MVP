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

  // Chat
  chat: {
    enableSend: false,
    enableZoom: false,
    sessionCookie: ""
  },

  // Commands
  commands: {
    enabled: true,
    setupComplete: false,
    builtIn: {
      help: { enabled: true, trigger: "!help" },
      score: { enabled: true, trigger: "!score" },
      send: { enabled: true, trigger: "!send" },
      spin: { enabled: true, trigger: "!spin" },
      get: { enabled: false, trigger: "!get" }
    },
    listing: {
      commands: { enabled: true, trigger: "!commands" },
      subcommands: { enabled: true, trigger: "!subcommands" },
      mycommands: { enabled: true, trigger: "!mycommands" }
    }
  },

  // Gifts (Settings)
  gifts: {
    blackWhiteDefault: false
  },

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

// Generic Deep Merge
function deepMerge(target: any, source: any): any {
  if (typeof target !== 'object' || target === null) return source;
  if (typeof source !== 'object' || source === null) return target;

  const output = { ...target };

  for (const key of Object.keys(source)) {
    if (source[key] instanceof Array) {
        // Arrays werden ersetzt, nicht gemergt (meistens gewünschtes Verhalten bei Configs)
        output[key] = source[key];
    } else if (typeof source[key] === 'object' && source[key] !== null) {
        output[key] = key in target ? deepMerge(target[key], source[key]) : source[key];
    } else {
        output[key] = source[key];
    }
  }
  return output;
}

export class ConfigStore {
  private data: any;

  constructor() {
    this.load();
  }

  getCore() { return this.data; }

  setCore(newConf: any) {
    this.data = deepMerge(this.data, newConf);
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
        // Merge mit Defaults (Deep!)
        this.data = deepMerge({ ...DEFAULT_CONFIG }, loaded);
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
