import { AppEvent, OverlayCommand } from "./types";

export function eventToOverlay(ev: AppEvent): OverlayCommand | null {
  const userLabel = ev.user?.nickname ?? ev.user?.uniqueId ?? "User";
  const userImg = ev.user?.profilePictureUrl || "https://api.dicebear.com/9.x/avataaars/svg?seed=default"; // Fallback

  switch (ev.type) {
    case "chat":
      return {
        kind: "toast",
        title: userLabel,
        text: String(ev.payload.text ?? ""),
        userImage: userImg, // Pass image
        ms: 5000
      };
    case "gift":
      return {
        kind: "gift",
        from: userLabel,
        userImage: userImg,
        giftName: String(ev.payload.giftName ?? "Gift"),
        giftIconUrl: ev.payload.giftIconUrl, // Pass image
        count: Number(ev.payload.count ?? 1),
        ms: 4000
      };
    case "like":
      // Likes are usually high volume, maybe skip avatar to save space, or keep it.
      return { kind: "toast", title: "Like", text: `${userLabel} sent likes!`, userImage: userImg, ms: 2000 };
    case "follow":
      return { kind: "toast", title: "New Follower", text: `${userLabel} followed!`, userImage: userImg, ms: 3000 };
    case "share":
      return { kind: "toast", title: "Share", text: `${userLabel} shared the stream!`, userImage: userImg, ms: 3000 };
    default:
      return null;
  }
}
