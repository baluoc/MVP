import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { OverlayCommand } from "../core/types";

export interface OverlayServer {
  app: express.Express;
  server: http.Server;
  broadcast: (cmd: OverlayCommand) => void;
}

export function createOverlayServer(port: number): OverlayServer {
  const app = express();
  app.use(express.json()); // Enable JSON body parsing

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/overlay/ws" });

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
