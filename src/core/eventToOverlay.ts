import { AppEvent, OverlayCommand } from "./types";

export function eventToOverlay(ev: AppEvent): OverlayCommand | null {
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
    case "subscribe":
      return { kind: "toast", title: "⭐ NEUER ABO", text: `${userLabel} hat abonniert!`, ms: 5000 };
    case "question":
      return { kind: "toast", title: `❓ FRAGE von ${userLabel}`, text: String(ev.payload.text ?? ""), ms: 6000 };
    case "tts":
      return { kind: "speak", text: String(ev.payload.text ?? "") };
    case "error":
      return { kind: "toast", title: "Fehler", text: String(ev.payload.error ?? ev.payload.msg ?? "unknown"), ms: 4000 };
    default:
      return null;
  }
}
