// NOTE: Connector must stay "dumb". Mapping happens in src/core/normalize.ts only.
import { EventBus } from "../core/bus";
import {
  normalizeChat,
  normalizeGift,
  normalizeLike,
  normalizeShare,
  normalizeFollow,
  normalizeSystem,
  normalizeError
} from "../core/normalize";

// tiktok-live-connector API can vary by version; keep connector boundary "any"
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { WebcastPushConnection } = require("tiktok-live-connector");

export async function startTikTok(uniqueId: string, bus: EventBus) {
  const conn = new WebcastPushConnection(uniqueId);

  conn.on("chat", (data: any) => {
    bus.publish(normalizeChat(data));
  });

  conn.on("gift", (data: any) => {
    bus.publish(normalizeGift(data));
  });

  conn.on("like", (data: any) => {
    bus.publish(normalizeLike(data));
  });

  conn.on("share", (data: any) => {
    bus.publish(normalizeShare(data));
  });

  conn.on("follow", (data: any) => {
    bus.publish(normalizeFollow(data));
  });

  try {
    const state = await conn.connect();
    bus.publish(normalizeSystem("connected", state?.roomId, state));
  } catch (e: any) {
    bus.publish(normalizeError("connect failed", String(e?.message ?? e)));
  }
}
