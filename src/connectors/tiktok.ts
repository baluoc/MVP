import crypto from "crypto";
import { EventBus } from "../core/bus";
import { AppEvent } from "../core/types";

// tiktok-live-connector API can vary by version; keep connector boundary "any"
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { WebcastPushConnection } = require("tiktok-live-connector");

function id() {
  return crypto.randomBytes(8).toString("hex");
}

export async function startTikTok(uniqueId: string, bus: EventBus) {
  const conn = new WebcastPushConnection(uniqueId);

  // Minimal mapping ? extend later in normalize layer if you want stricter typing
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

  try {
    const state = await conn.connect();
    bus.publish({ id: id(), ts: Date.now(), source: "tiktok", type: "system", payload: { msg: "connected", roomId: state?.roomId }, raw: state });
  } catch (e: any) {
    bus.publish({ id: id(), ts: Date.now(), source: "tiktok", type: "error", payload: { msg: "connect failed", error: String(e?.message ?? e) } });
  }
}
