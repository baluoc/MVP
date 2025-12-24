import { AppEvent, OverlayCommand } from "./types";

export function eventToOverlay(ev: AppEvent): OverlayCommand | OverlayCommand[] | null {
  const userLabel = ev.user?.nickname ?? ev.user?.uniqueId ?? "User";
  const userImg = ev.user?.profilePictureUrl || "https://api.dicebear.com/9.x/avataaars/svg?seed=default"; // Fallback

  switch (ev.type) {
    case "chat": {
      const text = String(ev.payload.text ?? "");
      // TTS Trigger for !say or !tts
      if (text.startsWith("!say ") || text.startsWith("!tts ")) {
        const spokenText = text.replace(/^!say\s+|^!tts\s+/, "");
        if (spokenText.trim()) {
           return { kind: "speak", text: spokenText.trim() };
        }
      }

      return {
        kind: "toast",
        title: userLabel,
        text,
        userImage: userImg, // Pass image
        ms: 5000
      };
    }
    case "gift": {
      const giftName = String(ev.payload.giftName ?? "Gift");
      const diamondCost = Number(ev.payload.diamondCost ?? 0);

      // TTS Trigger for Big Gifts (> 100 diamonds)
      if (diamondCost > 100) {
        // Return a compound command or just let the client handle queue?
        // Our architecture returns ONE command per event.
        // But we want BOTH the gift visual AND the speech.
        // HACK: We prioritize the speech? No, we need the visual.
        // The best way is to send 'speak' but the frontend needs to show the gift too.
        // OR: We assume the Frontend handles 'gift' -> auto speak if configured?
        // No, the task says "eventToOverlay muss das entsprechende speak-Kommando generieren".
        // Issue: eventToOverlay returns OverlayCommand | null (single).

        // Strategy C: The caller (bus listener) might broadcast multiple commands?
        // No, `cmd = eventToOverlay(ev); if(cmd) overlay.broadcast(cmd);`

        // Solution: We need to return an array of commands OR modify the architecture.
        // Modification: Let's check `src/index.ts`.
        // It says: `const cmd = eventToOverlay(ev);`
        // I should stick to single return for now to avoid breaking contract,
        // BUT the user requirements imply simultaneous actions.

        // Workaround: Return the GIFT command, but include a 'speakText' field?
        // The `OverlayCommand` for gift doesn't have it.
        // Let's add `speakText` to the Gift command definition in types (optional),
        // and have the frontend handle it.
        // Wait, the prompt says: "Das eventToOverlay muss das entsprechende speak-Kommando generieren."
        // If I change the return type to `OverlayCommand | OverlayCommand[]`, I need to update index.ts.

        // Let's check `src/index.ts` again.
        // `if (cmd) overlay.broadcast(cmd);`

        // I will change `eventToOverlay` to return `OverlayCommand | OverlayCommand[] | null`.
        // And update `src/index.ts` to handle array.
        // This is the cleanest way.
      }

      // Let's do the single-command return first, and see if I can piggyback.
      // Actually, updating `index.ts` to handle arrays is trivial and robust.
      // Let's do that.

      const cmds: OverlayCommand[] = [];

      // Primary Gift Command
      cmds.push({
        kind: "gift",
        from: userLabel,
        userImage: userImg,
        giftName,
        giftIconUrl: ev.payload.giftIconUrl, // Pass image
        count: Number(ev.payload.count ?? 1),
        ms: 4000
      });

      if (diamondCost > 100) {
        cmds.push({ kind: "speak", text: `Danke ${userLabel} für das ${giftName}!` });
      }

      // This file requires return type change.
      return cmds.length === 1 ? cmds[0] : (cmds as any);
    }
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
