import { AppEvent, UserStats } from "../core/types";

function userKey(ev: AppEvent): string | null {
  const u = ev.user;
  if (!u) return null;
  if (u.userId) return `id:${u.userId}`;
  if (u.uniqueId) return `u:${u.uniqueId.toLowerCase()}`;
  return null;
}

export class UserStatsStore {
  private map = new Map<string, UserStats>();

  ingest(ev: AppEvent) {
    const key = userKey(ev);
    if (!key) return;

    const now = ev.ts;
    const u = ev.user ?? {};

    let row = this.map.get(key);
    if (!row) {
      row = {
        key,
        userId: u.userId,
        uniqueId: u.uniqueId,
        nickname: u.nickname,
        firstSeenTs: now,
        lastSeenTs: now,
        chatCount: 0,
        likeCount: 0,
        giftCount: 0,
        shareCount: 0,
        followCount: 0,
        subscribeCount: 0,
        memberCount: 0,
      };
      this.map.set(key, row);
    }

    // Update profile-ish fields
    row.lastSeenTs = now;
    row.uniqueId = row.uniqueId ?? u.uniqueId;
    row.userId = row.userId ?? u.userId;
    row.nickname = u.nickname ?? row.nickname;

    // Counters
    switch (ev.type) {
      case "chat":
        row.chatCount += 1;
        break;
      case "like":
        row.likeCount += Number(ev.payload.likeDelta ?? 1);
        break;
      case "gift":
        row.giftCount += Number(ev.payload.count ?? 1);
        break;
      case "share":
        row.shareCount += 1;
        break;
      case "follow":
        row.followCount += 1;
        break;
      case "subscribe":
        row.subscribeCount += 1;
        break;
      case "member":
        row.memberCount += 1;
        break;
      default:
        break;
    }
  }

  getAll(): UserStats[] {
    return Array.from(this.map.values());
  }

  reset() {
    this.map.clear();
  }
}
