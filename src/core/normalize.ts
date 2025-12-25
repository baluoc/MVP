import crypto from "crypto";
import { AppEvent, EventType } from "./types";

export function id() {
  return crypto.randomBytes(8).toString("hex");
}

function normalizeUser(data: any) {
  return {
    userId: String(data.userId ?? ""),
    uniqueId: data.uniqueId,
    nickname: data.nickname,
    avatarUrl: data.profilePictureUrl,
  };
}

export function normalizeChat(data: any): AppEvent {
  return {
    id: id(),
    ts: Date.now(),
    source: "tiktok",
    type: "chat",
    user: normalizeUser(data),
    payload: { text: data.comment },
    raw: data,
  };
}

export function normalizeGift(data: any): AppEvent {
  return {
    id: id(),
    ts: Date.now(),
    source: "tiktok",
    type: "gift",
    user: normalizeUser(data),
    payload: {
      giftName: data.giftName,
      giftIconUrl: data.giftIconUrl || data.gift?.icon_url,
      count: data.repeatCount ?? 1,
      diamondCost: data.diamondCount // Cost per gift unit
    },
    raw: data,
  };
}

export function normalizeLike(data: any): AppEvent {
  return {
    id: id(),
    ts: Date.now(),
    source: "tiktok",
    type: "like",
    user: normalizeUser(data),
    payload: {
      likeDelta: data.likeCount ?? 1,
      totalLikeCount: data.totalLikeCount
    },
    raw: data,
  };
}

export function normalizeShare(data: any): AppEvent {
  return {
    id: id(),
    ts: Date.now(),
    source: "tiktok",
    type: "share",
    user: normalizeUser(data),
    payload: {},
    raw: data,
  };
}

export function normalizeFollow(data: any): AppEvent {
  return {
    id: id(),
    ts: Date.now(),
    source: "tiktok",
    type: "follow",
    user: normalizeUser(data),
    payload: {},
    raw: data,
  };
}

export function normalizeMember(data: any): AppEvent {
  return {
    id: id(),
    ts: Date.now(),
    source: "tiktok",
    type: "member",
    user: normalizeUser(data),
    payload: {},
    raw: data,
  };
}

export function normalizeSubscribe(data: any): AppEvent {
  return {
    id: id(),
    ts: Date.now(),
    source: "tiktok",
    type: "subscribe",
    user: normalizeUser(data),
    payload: {},
    raw: data,
  };
}

export function normalizeSystem(msg: string, roomId?: string, raw?: any): AppEvent {
  return {
    id: id(),
    ts: Date.now(),
    source: "tiktok",
    type: "system",
    payload: { msg, roomId },
    raw,
  };
}

export function normalizeError(msg: string, error?: string): AppEvent {
  return {
    id: id(),
    ts: Date.now(),
    source: "tiktok",
    type: "error",
    payload: { msg, error },
  };
}
