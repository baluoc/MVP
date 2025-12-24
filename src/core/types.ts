export type EventType =
  | "chat"
  | "like"
  | "gift"
  | "share"
  | "follow"
  | "subscribe"
  | "member"
  | "question"
  | "roomUser"
  | "tts"
  | "system"
  | "error";

export type AppUser = {
  userId?: string;
  uniqueId?: string; // @handle
  nickname?: string; // display name
  profilePictureUrl?: string; // NEW: Standardized field
};

export type AppEvent = {
  id: string;
  ts: number;
  source: "tiktok" | "mock" | "system";
  type: EventType;
  user?: AppUser;
  payload: Record<string, any>;
  raw?: any;
};

// Updated OverlayCommand to carry images
export type OverlayCommand =
  | { kind: "toast"; title: string; text: string; userImage?: string; ms?: number } // Added userImage
  | { kind: "gift"; from: string; userImage?: string; giftName: string; giftIconUrl?: string; count: number; ms?: number } // Added images
  | { kind: "dashboard-update"; stats: any; leaderboard: any }
  | { kind: "speak"; text: string };

export type UserStats = {
  key: string;
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
  diamondCount: number;

  points: number; // Changed from optional to required for logic consistency
};

export type ScoringPolicy = Partial<
  Record<"chat" | "like" | "gift" | "share" | "follow" | "subscribe" | "member", number>
>;
