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
    res.type("html").send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Overlay</title>
    <style>
      body { margin: 0; background: transparent; font-family: system-ui, sans-serif; }
      #wrap { position: relative; width: 100vw; height: 100vh; overflow: hidden; }
      .toast {
        position: absolute; left: 24px; bottom: 24px;
        background: rgba(0,0,0,.65); color: #fff; padding: 14px 16px;
        border-radius: 12px; min-width: 260px; max-width: 520px;
        box-shadow: 0 10px 30px rgba(0,0,0,.25);
        animation: in .18s ease-out;
      }
      .title { font-weight: 700; margin-bottom: 6px; }
      @keyframes in { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    </style>
  </head>
  <body>
    <div id="wrap"></div>
    <script>
      const wrap = document.getElementById("wrap");
      const wsUrl = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/overlay/ws";
      const ws = new WebSocket(wsUrl);

      function showToast(title, text, ms = 3500) {
        const el = document.createElement("div");
        el.className = "toast";
        el.innerHTML = '<div class="title"></div><div class="text"></div>';
        el.querySelector(".title").textContent = title;
        el.querySelector(".text").textContent = text;
        wrap.appendChild(el);
        setTimeout(() => el.remove(), ms);
      }

      ws.onmessage = (e) => {
        const cmd = JSON.parse(e.data);
        if (cmd.kind === "toast") showToast(cmd.title, cmd.text, cmd.ms || 3500);
        if (cmd.kind === "gift") showToast("Gift", cmd.from + " -> " + cmd.giftName + " x" + cmd.count, cmd.ms || 4000);
      };
      ws.onopen = () => showToast("Overlay", "verbunden", 1200);
      ws.onerror = () => showToast("Overlay", "WS Fehler", 2500);
    </script>
  </body>
</html>`);
  });

  // lightweight stats API will be attached from index.ts (router)
  server.listen(port, "127.0.0.1", () => {
    console.log(`[overlay] http://127.0.0.1:${port}/overlay/main`);
  });

  return { app, server, broadcast };
}
