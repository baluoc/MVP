export interface WidgetDefinition {
  type: string;
  name: string;
  defaultSize: { w: number; h: number };
  defaultProps?: Record<string, any>;
  category: string;
}

export const CORE_WIDGETS: WidgetDefinition[] = [
  {
    type: "chat",
    name: "Chat Stream",
    defaultSize: { w: 400, h: 600 },
    category: "Core"
  },
  {
    type: "alert",
    name: "Alert Box",
    defaultSize: { w: 600, h: 300 },
    category: "Core"
  },
  {
    type: "leaderboard",
    name: "Leaderboard",
    defaultSize: { w: 400, h: 400 },
    category: "Core"
  },
  {
    type: "goal",
    name: "Goal Bar",
    defaultSize: { w: 800, h: 100 },
    category: "Core"
  }
];

export function getWidgetRegistry() {
  return CORE_WIDGETS;
}
