export type EventType =
  | "chat"
  | "like"
  | "gift"
  | "share"
  | "follow"
  | "subscribe"
  | "member"
  | "roomStats"
  | "system"
  | "error";

export type AppUser = {
  userId?: string;
  uniqueId?: string; // @handle
  nickname?: string; // display name
  avatarUrl?: string;
};

export type AppEvent = {
  id: string;
  ts: number;
  source: "tiktok" | "mock";
  type: EventType;
  user?: AppUser;
  payload: Record<string, any>;
  raw?: any;
};

export type OverlayCommand =
  | { kind: "toast"; title: string; text: string; ms?: number }
  | { kind: "gift"; from: string; giftName: string; count: number; ms?: number };

export type UserStats = {
  key: string; // stable key in our store (prefer userId else uniqueId)
  userId?: string;
  uniqueId?: string;
  nickname?: string;
  firstSeenTs: number;
  lastSeenTs: number;

  chatCount: number;
  likeCount: number;
  giftCount: number;
  shareCount: number;
  followCount: number;
  subscribeCount: number;
  memberCount: number;

  // optional: points (computed by policy later)
  points?: number;
};

export type ScoringPolicy = Partial<
  Record<"chat" | "like" | "gift" | "share" | "follow" | "subscribe" | "member", number>
>;
