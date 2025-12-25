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
  profilePictureUrl?: string; // Standardized field
  isSubscriber?: boolean; // NEW: Sub Status
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
  | { kind: "toast"; title: string; text: string; userImage?: string; ms?: number }
  | { kind: "gift"; from: string; userImage?: string; giftName: string; giftIconUrl?: string; count: number; ms?: number }
  | { kind: "dashboard-update"; stats: any; leaderboard: any }
  | { kind: "speak"; text: string }
  | { kind: "scene"; sceneId: string }
  | { kind: "scene_state"; activeSceneId: string; locked?: boolean };

export type UserStats = {
  key: string;
  userId?: string;
  uniqueId?: string;
  nickname?: string;
  profilePictureUrl?: string;
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
  isSubscriber?: boolean; // NEW: Sub Status

  manualPoints: number; // Admin manual adjustment
  points: number; // Required for logic consistency
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
    uniqueId: string;
    session: {
        mode: "none" | "manual" | "webview";
        sessionId: string;
        updatedAt: number;
    }
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
  chat: {
      enableSend: boolean;
      enableZoom: boolean;
      sessionCookie: string;
  };
  commands: {
      enabled: boolean;
      setupComplete: boolean;
      builtIn: Record<string, { enabled: boolean; trigger: string }>;
      listing: Record<string, { enabled: boolean; trigger: string }>;
  };
  gifts: {
      blackWhiteDefault: boolean;
  };
  tts: {
    enabled: boolean;
    language: string;
    allowed: Record<string, boolean> | "all" | "follower" | "sub" | "mod"; // Fixed allowed type to match config usage
    voice: string;
    speed: number;
    pitch: number;
    volume: number; // 0.0 - 1.0
    randomVoice: boolean;
    trigger: string;
    command: string;
    mode: string;
    costPerMsg: number;
    spam: any;
    template: string;
    specialUsers: any[];
  };
  overlay: {
      activeSceneId: string;
      scenes: any[];
  };
};
