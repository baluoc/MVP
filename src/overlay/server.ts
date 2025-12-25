import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { OverlayCommand } from "../core/types";
import { ConfigStore } from "../core/configStore";

export interface OverlayServer {
  app: express.Express;
  server: http.Server;
  broadcast: (cmd: OverlayCommand) => void;
}

// We need access to config for initial state
export function createOverlayServer(port: number): OverlayServer {
  const app = express();
  app.use(express.json()); // Enable JSON body parsing

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/overlay/ws" });

  // Quick config read (fresh on connect)
  const configStore = new ConfigStore();

  wss.on('connection', (ws) => {
      // Send initial scene state
      const conf = configStore.getCore();
      const activeId = conf.overlay?.activeSceneId || "default";

      const msg: OverlayCommand = {
          kind: "scene_state",
          activeSceneId: activeId
      };
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  });

  function broadcast(cmd: OverlayCommand) {
    const msg = JSON.stringify(cmd);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(msg);
    }
  }

  app.get("/overlay/main", (_req, res) => {
      // Serve the static file instead of hardcoded string
      res.sendFile("overlay.html", { root: "./public" });
  });

  // lightweight stats API will be attached from index.ts (router)
  server.listen(port, "127.0.0.1", () => {
    console.log(`[overlay] http://127.0.0.1:${port}/overlay/main`);
  });

  return { app, server, broadcast };
}
