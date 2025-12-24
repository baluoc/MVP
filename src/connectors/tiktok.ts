import { EventBus } from "../core/eventBus";
import { AppEvent } from "../core/types";
import { id } from "../core/normalize";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { WebcastPushConnection } = require("tiktok-live-connector");

export async function startTikTok(uniqueId: string, bus: EventBus) {
  let active = true;

  const connect = async () => {
    if (!active) return;

    console.log(`[TikTok] Connecting to @${uniqueId}...`);

    try {
      const conn = new WebcastPushConnection(uniqueId);

      // --- Specific Normalizers (Inline) ---

      conn.on("chat", (data: any) => {
        const ev: AppEvent = {
          id: id(),
          ts: Date.now(),
          source: "tiktok",
          type: "chat",
          user: { userId: String(data.userId ?? ""), uniqueId: data.uniqueId, nickname: data.nickname },
          payload: { text: data.comment },
          raw: data,
        };
        bus.publish(ev);
      });

      conn.on("gift", (data: any) => {
        const ev: AppEvent = {
          id: id(),
          ts: Date.now(),
          source: "tiktok",
          type: "gift",
          user: { userId: String(data.userId ?? ""), uniqueId: data.uniqueId, nickname: data.nickname },
          payload: { giftName: data.giftName, count: data.repeatCount ?? 1 },
          raw: data,
        };
        bus.publish(ev);
      });

      conn.on("like", (data: any) => {
        const ev: AppEvent = {
          id: id(),
          ts: Date.now(),
          source: "tiktok",
          type: "like",
          user: { userId: String(data.userId ?? ""), uniqueId: data.uniqueId, nickname: data.nickname },
          payload: { likeDelta: data.likeCount ?? 1, totalLikeCount: data.totalLikeCount },
          raw: data,
        };
        bus.publish(ev);
      });

      conn.on("share", (data: any) => {
        const ev: AppEvent = {
          id: id(),
          ts: Date.now(),
          source: "tiktok",
          type: "share",
          user: { userId: String(data.userId ?? ""), uniqueId: data.uniqueId, nickname: data.nickname },
          payload: {},
          raw: data,
        };
        bus.publish(ev);
      });

      conn.on("follow", (data: any) => {
        const ev: AppEvent = {
          id: id(),
          ts: Date.now(),
          source: "tiktok",
          type: "follow",
          user: { userId: String(data.userId ?? ""), uniqueId: data.uniqueId, nickname: data.nickname },
          payload: {},
          raw: data,
        };
        bus.publish(ev);
      });

      // --- Reconnect Logic ---

      conn.on("disconnected", () => {
        console.warn("[TikTok] Disconnected via Event. Reconnecting in 5s...");
        bus.publish({ id: id(), ts: Date.now(), source: "tiktok", type: "error", payload: { msg: "disconnected" } });
        setTimeout(connect, 5000);
      });

      await conn.connect();
      bus.publish({ id: id(), ts: Date.now(), source: "tiktok", type: "system", payload: { msg: "connected" } });

    } catch (e: any) {
      const errParams = { msg: "connect failed", error: String(e?.message ?? e) };
      bus.publish({ id: id(), ts: Date.now(), source: "tiktok", type: "error", payload: errParams });
      console.error(`[TikTok] Connection failed (${errParams.error}). Retrying in 10s...`);
      setTimeout(connect, 10000);
    }
  };

  // Start
  connect();
}
