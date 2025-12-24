import crypto from "crypto";
import { AppEvent } from "../core/types";
import { EventBus } from "../core/bus";

function id() {
  return crypto.randomBytes(8).toString("hex");
}

const users = [
  { userId: "101", uniqueId: "agent_one", nickname: "Agent One" },
  { userId: "102", uniqueId: "chat_katze", nickname: "Chat Katze" },
  { userId: "103", uniqueId: "gift_goblin", nickname: "Gift Goblin" },
];

const gifts = ["Rose", "TikTok", "Galaxy", "Lion"];

export function startMock(bus: EventBus) {
  bus.publish({ id: id(), ts: Date.now(), source: "mock", type: "system", payload: { msg: "mock started" } });

  setInterval(() => {
    const u = users[Math.floor(Math.random() * users.length)];
    const pick = Math.random();
    let ev: AppEvent;

    if (pick < 0.45) {
      ev = { id: id(), ts: Date.now(), source: "mock", type: "chat", user: u, payload: { text: "Hallo aus dem Mock" } };
    } else if (pick < 0.7) {
      ev = { id: id(), ts: Date.now(), source: "mock", type: "like", user: u, payload: { likeDelta: 1 + Math.floor(Math.random() * 10) } };
    } else if (pick < 0.88) {
      ev = { id: id(), ts: Date.now(), source: "mock", type: "gift", user: u, payload: { giftName: gifts[Math.floor(Math.random() * gifts.length)], count: 1 + Math.floor(Math.random() * 3) } };
    } else if (pick < 0.95) {
      ev = { id: id(), ts: Date.now(), source: "mock", type: "share", user: u, payload: {} };
    } else {
      ev = { id: id(), ts: Date.now(), source: "mock", type: "follow", user: u, payload: {} };
    }

    bus.publish(ev);
  }, 1000 + Math.floor(Math.random() * 1000));
}
