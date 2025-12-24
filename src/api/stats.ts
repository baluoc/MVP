import { Router } from "express";
import { UserStatsStore } from "../stats/store";

export function createStatsRouter(store: UserStatsStore) {
  const r = Router();

  r.get("/stats", (_req, res) => {
    res.json(store.getAll());
  });

  r.get("/stats.csv", (_req, res) => {
    const rows = store.getAll();
    const header = [
      "key", "userId", "uniqueId", "nickname", "firstSeenTs", "lastSeenTs",
      "chatCount", "likeCount", "giftCount", "shareCount", "followCount", "subscribeCount", "memberCount", "points",
    ];
    const csv = [
      header.join(","),
      ...rows.map((u) => header.map((k) => JSON.stringify((u as any)[k] ?? "")).join(",")),
    ].join("\n");
    res.type("text/csv").send(csv);
  });

  r.post("/stats/reset", (_req, res) => {
    store.reset();
    res.json({ ok: true });
  });

  return r;
}
