import { EventBus } from "../core/bus";
import { AppEvent } from "../core/types";
import { id } from "../core/normalize";

// Mock Data Definitions
const MOCK_USERS = [
  { uniqueId: "agent_one", nickname: "Agent One", avatar: "https://api.dicebear.com/9.x/bottts/svg?seed=agent_one" },
  { uniqueId: "gift_goblin", nickname: "Gift Goblin", avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=gift_goblin" },
  { uniqueId: "chat_katze", nickname: "Chat Katze", avatar: "https://api.dicebear.com/9.x/micah/svg?seed=chat_katze" },
  { uniqueId: "new_fan_99", nickname: "New Fan", avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=new_fan" },
];

const MOCK_GIFTS = [
  { id: 5655, name: "Rose", cost: 1, icon: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/rose_0920.png~tplv-obj.png" },
  { id: 5828, name: "Galaxy", cost: 1000, icon: "https://p19-webcast.tiktokcdn.com/img/maliva/webcast-va/galaxy_gift_720.png~tplv-obj.png" }, // Placeholder URL pattern
  { id: 6104, name: "Lion", cost: 29999, icon: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/lion_1012.png~tplv-obj.png" },
  { id: 1, name: "TikTok", cost: 1, icon: "https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/tiktok_1012.png~tplv-obj.png" }
];

// Helper to get random item
const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export async function startMock(bus: EventBus) {
  console.log("[Mock] Started. Generating events...");
  bus.publish({ id: id(), ts: Date.now(), source: "mock", type: "system", payload: { msg: "mock started" } });

  // Simulation Loop
  setInterval(() => {
    const type = Math.random() > 0.7 ? "gift" : (Math.random() > 0.5 ? "chat" : "like");
    const user = randomItem(MOCK_USERS);

    let event: AppEvent = {
      id: id(),
      ts: Date.now(),
      source: "mock",
      type: type as any,
      user: {
        userId: user.uniqueId,
        uniqueId: user.uniqueId,
        nickname: user.nickname,
        profilePictureUrl: user.avatar // Inject Avatar
      },
      payload: {},
      raw: {}
    };

    if (type === "chat") {
      event.payload.text = "Hallo aus dem Mock";
    } else if (type === "like") {
      event.payload.likeDelta = Math.floor(Math.random() * 10) + 1;
    } else if (type === "gift") {
      const gift = randomItem(MOCK_GIFTS);
      event.payload.giftName = gift.name;
      event.payload.count = Math.floor(Math.random() * 3) + 1;
      event.payload.diamondCost = gift.cost;
      event.payload.giftIconUrl = gift.icon; // Inject Gift Icon
    }

    // Occasional special events
    if (Math.random() > 0.9) {
      const action = Math.random() > 0.5 ? "follow" : "share";
      event.type = action as any;
      event.payload = {};
    }

    bus.publish(event);

  }, 1500 + Math.random() * 2000);
}
