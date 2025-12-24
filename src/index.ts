import { EventBus } from "./core/bus";
import { AppEvent, OverlayCommand } from "./core/types";
import { createOverlayServer } from "./overlay/server";
import { UserStatsStore } from "./stats/store";
import { createStatsRouter } from "./api/stats";
import { startMock } from "./connectors/mock";
import { startTikTok } from "./connectors/tiktok";

function getArg(name: string) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function hasArg(name: string) {
  return process.argv.includes(name);
}

function eventToOverlay(ev: AppEvent): OverlayCommand | null {
  const userLabel = ev.user?.nickname ?? ev.user?.uniqueId ?? "User";
  switch (ev.type) {
    case "chat":
      return { kind: "toast", title: `Chat ${userLabel}`, text: String(ev.payload.text ?? ""), ms: 3500 };
    case "gift":
      return { kind: "gift", from: userLabel, giftName: String(ev.payload.giftName ?? "Gift"), count: Number(ev.payload.count ?? 1), ms: 4000 };
    case "like":
      return { kind: "toast", title: "Like", text: `${userLabel} +${ev.payload.likeDelta ?? 1}`, ms: 1500 };
    case "share":
      return { kind: "toast", title: "Share", text: `${userLabel} shared`, ms: 2500 };
    case "follow":
      return { kind: "toast", title: "Follow", text: `${userLabel} followed`, ms: 2500 };
    case "error":
      return { kind: "toast", title: "Fehler", text: String(ev.payload.error ?? ev.payload.msg ?? "unknown"), ms: 4000 };
    default:
      return null;
  }
}

async function main() {
  const port = Number(getArg("--port") ?? "5175");
  const mock = hasArg("--mock");
  const user = getArg("--user") || getArg("-u");

  if (!mock && !user) {
    console.log("Usage:");
    console.log(" npm run dev -- --mock [--port 5175]");
    console.log(" npm run dev -- --user <tiktokName> [--port 5175]");
    process.exit(1);
  }

  const bus = new EventBus();
  const stats = new UserStatsStore();
  const overlay = createOverlayServer(port);

  // attach stats api
  overlay.app.use("/api", createStatsRouter(stats));

  bus.subscribe((ev) => {
    // log
    console.log(`[${new Date(ev.ts).toLocaleTimeString()}] ${ev.source}:${ev.type} ${ev.user?.uniqueId ?? ""}`, ev.payload);
    // stats
    stats.ingest(ev);
    // overlay
    const cmd = eventToOverlay(ev);
    if (cmd) overlay.broadcast(cmd);
  });

  if (mock) {
    startMock(bus);
    return;
  }
  await startTikTok(user!, bus);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
