import fs from "fs";
import path from "path";
import { AppEvent, UserStats } from "../core/types";

const DB_FILE = path.resolve("data", "stats.json");

function userKey(ev: AppEvent): string | null {
  const u = ev.user;
  if (!u) return null;
  if (u.userId) return `id:${u.userId}`;
  if (u.uniqueId) return `u:${u.uniqueId.toLowerCase()}`;
  return null;
}

function extractGiftId(raw: any): string | undefined {
  if (!raw) return undefined;
  // Common paths for giftId
  return raw.giftId || raw.gift_id || raw.giftDetails?.giftId || raw.gift?.gift_id || raw.gift?.id;
}

export class UserStatsStore {
  private map = new Map<string, UserStats>();
  private giftDedupeMap = new Map<string, number>(); // key -> expiresAt

  constructor() {
    // Load data on startup
    this.load();

    // Autosave every 30 seconds
    setInterval(() => this.save(), 30000);

    // Periodic cleanup for dedupe map every 10 seconds
    setInterval(() => this.cleanupDedupe(), 10000);
  }

  private cleanupDedupe() {
    const now = Date.now();
    for (const [k, expires] of this.giftDedupeMap) {
      if (expires < now) this.giftDedupeMap.delete(k);
    }
  }

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
        diamondCount: 0,
        points: 0,
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
        this.handleGift(row, ev);
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

    // Recalculate score after updates
    row.points = this.calculateScore(row);
  }

  private calculateScore(stats: UserStats): number {
    // Policy:
    // Like: 1
    // Chat: 5
    // Follow: 50
    // Gift: 10 per diamond
    return (
      (stats.likeCount * 1) +
      (stats.chatCount * 5) +
      (stats.followCount * 50) +
      (stats.diamondCount * 10)
    );
  }

  private handleGift(row: UserStats, ev: AppEvent) {
    const raw = ev.raw || {};
    const giftName = ev.payload.giftName || "unknown";
    const repeatCount = Number(ev.payload.count ?? 1);

    // Strategy A: Check for repeatEnd / streaking signals
    const hasRepeatEnd = raw.repeatEnd === true || raw.repeat_end === true;
    const hasStreaking = raw.streaking !== undefined || raw.is_streaking !== undefined;

    const isEnd = hasRepeatEnd || (hasStreaking && (raw.streaking === false || raw.is_streaking === false));

    // If we have explicit signals about streaking/repeat
    if (hasRepeatEnd || hasStreaking) {
      if (isEnd) {
        row.giftCount += repeatCount;
      }
      return;
    }

    // Strategy B: Fallback (no repeat info)
    const giftId = extractGiftId(raw) || giftName;
    // dedupeKey = userKey + giftId + floor(ts/1000)
    const bucket = Math.floor(ev.ts / 1000);
    const dedupeKey = `${row.key}:${giftId}:${bucket}`;

    if (this.giftDedupeMap.has(dedupeKey)) {
      return; // Already counted in this second
    }

    // Mark seen (TTL 10s)
    this.giftDedupeMap.set(dedupeKey, Date.now() + 10000);

    // Count it
    row.giftCount += repeatCount;
    // Estimate diamonds (fallback to 1 if unknown)
    row.diamondCount += Number(ev.payload.diamondCost ?? 1) * repeatCount;
  }

  getLeaderboard() {
    return Array.from(this.map.values())
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);
  }

  getAll(): UserStats[] {
    return Array.from(this.map.values());
  }

  reset() {
    this.map.clear();
    this.giftDedupeMap.clear();
    this.save();
  }

  private save() {
    try {
      if (!fs.existsSync("data")) {
        fs.mkdirSync("data");
      }
      const data = JSON.stringify(Array.from(this.map.entries()), null, 2);
      fs.writeFileSync(DB_FILE, data);
    } catch (e) {
      console.error("[Stats] Save failed:", e);
    }
  }

  private load() {
    try {
      if (!fs.existsSync(DB_FILE)) return;
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const entries = JSON.parse(raw);
      this.map = new Map(entries);

      // Retroactive score calculation
      for (const user of this.map.values()) {
        if (user.points === undefined) {
          user.points = this.calculateScore(user);
        }
      }

      console.log(`[Stats] Loaded ${this.map.size} users.`);
    } catch (e) {
      console.error("[Stats] Load failed:", e);
    }
  }
}
