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
  profilePictureUrl?: string; // NEW
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

  manualPoints: number; // NEW: Admin manual adjustment
  points: number; // Changed from optional to required for logic consistency
};

export type ScoringPolicy = Partial<
  Record<"chat" | "like" | "gift" | "share" | "follow" | "subscribe" | "member", number>
>;

export type WidgetConfig = {
  id: string;
  type: "chat" | "alert" | "leaderboard" | string;
  x: number;
  y: number;
  width?: number; // Optional
  height?: number; // Optional
  scale: number;
  visible: boolean;
};

export type AppConfig = {
  core: {
    port: number;
  };
  tiktok: {
    sessionId?: string; // For writing to chat
  };
  points: {
    name: string;
    coin: number;      // Points per Coin
    share: number;     // Points per Share
    chat: number;      // Points per Msg
    subBonus: number;  // Multiplier %
  };
  levels: {
    points: number;         // Base Points
    multiplier: number;    // Exponential Growth
  };
  obs: {
    ip: string;
    port: number;
    password: "";
  };
  streamerbot: {
    address: string;
    port: number;
    endpoint: string;
  };
  tts: {
    enabled: boolean;
    allowed: "all" | "follower" | "sub" | "mod";
    voice: string;
    speed: number;
    pitch: number;
    volume: number; // 0.0 - 1.0
    prefix: string; // Command
    cost: number;   // Points Cost
    minLevel?: number; // Optional for now until I can verify extensive usage
    readCommands?: boolean;
  };
  widgets: WidgetConfig[];
};
