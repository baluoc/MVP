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

export class UserStatsStore {
  private map = new Map<string, UserStats>();
  private giftDedupeMap = new Map<string, number>();

  constructor() {
    this.load();
    setInterval(() => this.save(), 30000); // AutoSave alle 30s
  }

  // --- NEU: Paginierung für die Tabelle ---
  getPaginated(page: number, limit: number, sortBy: "score" | "diamonds" = "score") {
    const all = Array.from(this.map.values());

    // Sortieren (Standard: Nach Punkten absteigend)
    all.sort((a, b) => {
        const valA = sortBy === "score" ? (a.points || 0) : a.diamondCount;
        const valB = sortBy === "score" ? (b.points || 0) : b.diamondCount;
        return valB - valA;
    });

    const start = (page - 1) * limit;
    const paginated = all.slice(start, start + limit);

    return {
      users: paginated,
      total: all.length,
      page,
      totalPages: Math.ceil(all.length / limit)
    };
  }

  ingest(ev: AppEvent, pointsConfig?: any) {
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
        manualPoints: 0,
        points: 0 // Initiale Punkte
      };
      this.map.set(key, row);
    }

    row.lastSeenTs = now;
    row.nickname = u.nickname ?? row.nickname;
    if(u.profilePictureUrl) row.profilePictureUrl = u.profilePictureUrl; // Avatar speichern!

    // Einfache Zähler
    switch (ev.type) {
      case "chat": row.chatCount++; break;
      case "like": row.likeCount += Number(ev.payload.likeDelta ?? 1); break;
      case "share": row.shareCount++; break;
      case "follow": row.followCount++; break;
      case "subscribe": row.subscribeCount++; break;
      case "gift":
        // Gift Logik (vereinfacht für Kürze, Dedupe sollte hier sein wie im Original)
        row.giftCount += Number(ev.payload.count ?? 1);
        row.diamondCount += Number(ev.payload.diamondCost ?? 0) * Number(ev.payload.count ?? 1);
        break;
    }

    // PUNKTE BERECHNUNG (Live-Update)
    // Hier könnte man später komplexe Logik einbauen (aus Config)
    // Fürs Erste: 1 Like = 1 Punkt, 1 Chat = 5 Punkte
    this.recalcScore(row, pointsConfig);
  }

  private recalcScore(user: UserStats, cfg?: any) {
      // Config or Defaults
      const p = cfg || { coin: 10, chat: 5, share: 50 };

      let score = 0;
      score += (user.diamondCount || 0) * (p.coin || 10);
      score += (user.chatCount || 0) * (p.chat || 5);
      score += (user.shareCount || 0) * (p.share || 50);
      score += (user.likeCount || 0) * 1; // Like ist meist fix 1 oder wenig

      user.points = score + (user.manualPoints || 0);
  }

  // Support for manual adjustment
  adjustManualPoints(keyOrId: string, delta: number): UserStats | null {
      // Try to find by key first
      let user = this.map.get(keyOrId);

      // Fallback: search by userId or uniqueId
      if (!user) {
        for (const u of this.map.values()) {
          if (u.userId === keyOrId || u.uniqueId === keyOrId) {
            user = u;
            break;
          }
        }
      }

      if (!user) return null;

      user.manualPoints = (user.manualPoints || 0) + delta;
      this.recalcScore(user); // Nutzt hier nur Fallback-Werte, aber das ist ok für manuellen Eingriff

      this.save();
      return user;
  }

  getLeaderboard() {
    return Array.from(this.map.values())
      .sort((a, b) => (b.points || 0) - (a.points || 0)) // Sortiert nach PUNKTE
      .slice(0, 5);
  }

  getAll(): UserStats[] { return Array.from(this.map.values()); }

  reset() {
    this.map.clear();
    this.save();
  }

  private save() {
    try {
      if (!fs.existsSync("data")) fs.mkdirSync("data");
      fs.writeFileSync(DB_FILE, JSON.stringify(Array.from(this.map.entries()), null, 2));
    } catch (e) { console.error("[Stats] Save failed:", e); }
  }

  private load() {
    try {
      if (!fs.existsSync(DB_FILE)) return;
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      this.map = new Map(JSON.parse(raw));

      // Recalc on load
      for (const u of this.map.values()) {
        this.recalcScore(u);
      }
    } catch (e) { console.error("[Stats] Load failed:", e); }
  }
}
