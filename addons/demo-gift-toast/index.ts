import { AddonContext } from "../../src/addons/types";

export function activate(ctx: AddonContext) {
  const unsubscribe = ctx.events.subscribe((ev) => {
    if (ev.type === "gift") {
      const config = ctx.config.get() || {};
      const minCount = config.minCount ?? 1;
      const prefix = config.prefix ?? "Demo Addon";

      const count = Number(ev.payload.count ?? 1);

      if (count >= minCount) {
        const user = ev.user?.nickname ?? ev.user?.uniqueId ?? "Someone";
        const gift = ev.payload.giftName ?? "Gift";

        ctx.overlay.emit({
          kind: "toast",
          title: prefix,
          text: `${user} sent ${count}x ${gift}!`,
          ms: 5000,
        });
      }
    }
  });

  console.log("[DemoAddon] Activated!");

  return () => {
    unsubscribe();
    console.log("[DemoAddon] Deactivated.");
  };
}
