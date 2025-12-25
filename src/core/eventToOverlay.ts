import { AppEvent, OverlayCommand } from "./types";

export function eventToOverlay(ev: AppEvent): OverlayCommand | null {
  const userLabel = ev.user?.nickname ?? ev.user?.uniqueId ?? "Gast";
  const userImg = ev.user?.profilePictureUrl; // Updated to match type

  switch (ev.type) {
    case "chat":
      return { kind: "toast", title: `Chat ${userLabel}`, text: String(ev.payload.text ?? ""), userImage: userImg, ms: 5000 };
    case "gift":
      return {
          kind: "gift",
          from: userLabel,
          userImage: userImg,
          giftName: String(ev.payload.giftName ?? "Geschenk"),
          giftIconUrl: ev.payload.giftIconUrl,
          count: Number(ev.payload.count ?? 1),
          ms: 4000
      };
    case "like":
      // Keine Details für Likes im Overlay, nur im Zähler, aber wir senden Toast für Feedback
      return { kind: "toast", title: "Like", text: `${userLabel} sendete Likes`, userImage: userImg, ms: 1500 };
    case "follow":
      return { kind: "toast", title: "Neuer Follower", text: `${userLabel} ist gefolgt!`, userImage: userImg, ms: 3000 };
    case "share":
      return { kind: "toast", title: "Geteilt", text: `${userLabel} hat den Stream geteilt!`, userImage: userImg, ms: 3000 };
    case "subscribe":
      return { kind: "toast", title: "Neues Abo", text: `${userLabel} hat abonniert! Danke!`, userImage: userImg, ms: 5000 };
    default:
      return null;
  }
}
