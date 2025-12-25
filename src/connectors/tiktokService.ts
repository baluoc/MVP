import { EventBus } from "../core/bus";
import { AppEvent } from "../core/types";
import { id } from "../core/normalize";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { WebcastPushConnection } = require("tiktok-live-connector");

export interface GiftItem {
  id: string;
  name: string;
  cost: number;
  iconUrl: string;
}

export class TikTokService {
  private conn: any = null;
  private activeUniqueId: string | null = null;
  private isConnected = false;
  private lastError: string | null = null;
  private roomInfo: any = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private currentOptions: any = {}; // Persist options for reconnect
  private lastChatSentAt: number = 0; // Rate Limiter state
  private bus: EventBus;
  private giftCache = new Map<string, GiftItem>();

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  async connect(uniqueId: string, options: any = {}) {
    // 1. Cleanup existing connection
    this.disconnect();

    this.activeUniqueId = uniqueId;
    this.currentOptions = options; // Store for reconnect
    console.log(`[TikTokService] Connecting to @${uniqueId}...`);

    try {
      const connOptions = {
        processInitialData: true,
        enableExtendedGiftInfo: true,
        ...options // Inject sessionId and other options
      };

      this.conn = new WebcastPushConnection(uniqueId, connOptions);

      // Store reference to check against race conditions (if disconnect called during await)
      const currentConn = this.conn;

      // Event Listeners
      this.setupListeners(currentConn);

      // Connect
      const state = await currentConn.connect();

      if (this.conn !== currentConn) return; // Connection was cancelled

      this.isConnected = true;
      this.roomInfo = state.roomInfo;
      this.lastError = null;

      this.bus.publish({
        id: id(), ts: Date.now(), source: "tiktok", type: "system",
        payload: { msg: "connected", roomInfo: this.roomInfo }
      });

      // Try to populate gifts from lib if available
      this.populateGiftsFromLib();

    } catch (e: any) {
      this.handleError(e);
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.conn) {
      try {
        this.conn.disconnect();
      } catch(e) { /* ignore */ }
      this.conn = null;
    }

    this.isConnected = false;
    this.activeUniqueId = null;
    this.roomInfo = null;
  }

  getState() {
    return {
      connected: this.isConnected,
      uniqueId: this.activeUniqueId,
      roomInfo: this.roomInfo,
      lastError: this.lastError
    };
  }

  getGiftCatalog(): GiftItem[] {
    return Array.from(this.giftCache.values());
  }

  private setupListeners(conn: any) {
    const emit = (type: string, payload: any, raw: any, userOverride?: any) => {
      if (this.conn !== conn) return; // Stale event

      const u = userOverride || {
        userId: String(raw.userId ?? ""),
        uniqueId: raw.uniqueId,
        nickname: raw.nickname,
        profilePictureUrl: raw.profilePictureUrl
      };

      this.bus.publish({
        id: id(),
        ts: Date.now(),
        source: "tiktok",
        type: type as any,
        user: u,
        payload,
        raw
      });
    };

    conn.on("chat", (d: any) => emit("chat", { text: d.comment }, d));

    conn.on("gift", (d: any) => {
      // Cache Gift
      this.cacheGift(d);

      // Enrich payload
      const giftIcon = this.getGiftIcon(d);
      emit("gift", {
        giftId: d.giftId, // Add giftId
        giftName: d.giftName,
        count: d.repeatCount ?? 1,
        diamondCost: d.diamondCount,
        giftIconUrl: giftIcon
      }, d);
    });

    conn.on("like", (d: any) => emit("like", { likeDelta: d.likeCount ?? 1, totalLikeCount: d.totalLikeCount }, d));
    conn.on("share", (d: any) => emit("share", {}, d));
    conn.on("follow", (d: any) => emit("follow", {}, d));
    conn.on("subscribe", (d: any) => emit("subscribe", {}, d));
    conn.on("roomUser", (d: any) => emit("roomUser", { viewerCount: d.viewerCount }, d, {})); // no user

    conn.on("disconnected", () => {
      if (this.conn !== conn) return;
      console.warn("[TikTokService] Disconnected. Reconnecting in 5s...");
      this.isConnected = false;
      this.scheduleReconnect();
    });
  }

  private handleError(e: any) {
    this.lastError = String(e?.message ?? e);
    console.error(`[TikTokService] Error: ${this.lastError}`);
    this.bus.publish({
      id: id(), ts: Date.now(), source: "tiktok", type: "error",
      payload: { msg: "connect failed", error: this.lastError }
    });
    this.scheduleReconnect(10000);
  }

  async sendChat(text: string): Promise<{ ok: boolean; mode: string; reason?: string }> {
      if (!this.isConnected || !this.conn) {
          throw new Error("NOT_CONNECTED");
      }

      // Check for sessionId presence in current connection options or instance
      // Note: WebcastPushConnection stores options in public `options` prop usually
      const hasSession = !!this.conn.options?.sessionId;
      if (!hasSession) {
          throw new Error("NO_SESSIONID");
      }

      // Rate Limit (Global 2s)
      const now = Date.now();
      if (now - this.lastChatSentAt < 2000) {
          throw new Error("RATE_LIMIT: Wait 2s");
      }

      try {
          // Attempt send
          const res = await this.conn.sendMessage(text);
          this.lastChatSentAt = Date.now();
          return { ok: true, mode: "live" };
      } catch (e: any) {
           throw new Error("SEND_FAILED: " + (e.message || String(e)));
      }
  }

  private scheduleReconnect(delay = 5000) {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.activeUniqueId) this.connect(this.activeUniqueId, this.currentOptions);
    }, delay);
  }

  private cacheGift(d: any) {
    // Try to find stable ID or create composite
    const giftId = d.giftId ? String(d.giftId) : `${d.giftName}:${d.diamondCount}`;
    if (!this.giftCache.has(giftId)) {
      this.giftCache.set(giftId, {
        id: giftId,
        name: d.giftName,
        cost: d.diamondCount,
        iconUrl: d.giftPictureUrl || d.giftIcon || "" // Try raw fields
      });
    }
  }

  private getGiftIcon(d: any): string {
    const giftId = d.giftId ? String(d.giftId) : `${d.giftName}:${d.diamondCount}`;
    return this.giftCache.get(giftId)?.iconUrl || "";
  }

  private populateGiftsFromLib() {
    // If the library exposes getAvailableGifts or similar, we could use it.
    // Currently tiktok-live-connector doesn't expose a clean public catalog easily without connection events
    // or digging into internals. We rely on learning from events for now.
    // If conn.getAvailableGifts() exists, we use it.
    if (typeof this.conn?.getAvailableGifts === 'function') {
        this.conn.getAvailableGifts().then((gifts: any[]) => {
            gifts.forEach(g => {
                 this.giftCache.set(String(g.id), {
                     id: String(g.id),
                     name: g.name,
                     cost: g.diamond_count,
                     iconUrl: g.image?.url_list?.[0] || ""
                 });
            });
        }).catch(() => {});
    }
  }
}
