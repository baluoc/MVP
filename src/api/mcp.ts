import { Router } from "express";
import http from 'http';
import { mcpManager } from "../mcp/manager";

export const mcpAdminRouter = Router();

mcpAdminRouter.get("/status", (req, res) => {
    const state = mcpManager.getStatus();
    res.json(state);
});

mcpAdminRouter.post("/start", (req, res) => {
    mcpManager.start();
    res.json(mcpManager.getStatus());
});

mcpAdminRouter.post("/stop", (req, res) => {
    mcpManager.stop();
    res.json(mcpManager.getStatus());
});

mcpAdminRouter.get("/logs", (req, res) => {
    res.json(mcpManager.getLogs());
});

export const mcpProxyHandler = (req: any, res: any) => {
    const state = mcpManager.getStatus();
    if (state.status !== 'running') {
      return res.status(503).json({ error: "MCP Service is not running" });
    }

    // Determine path for internal service
    // If mounted at /mcp (root), req.url is "/" or ""
    // We want to hit /mcp on the internal service.

    // Logic from routes.ts:
    // path: '/mcp' + req.url

    // If req.url is "/" -> /mcp/

    const options = {
      hostname: 'localhost',
      port: state.port,
      path: '/mcp' + (req.url === '/' ? '' : req.url),
      method: req.method,
      headers: { ...req.headers }
    };

    // Prevent loop or host header issues
    delete options.headers.host;

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (e) => {
      console.error("[MCP Proxy] Error:", e.message);
      if (!res.headersSent) res.status(502).json({ error: "Bad Gateway to MCP" });
    });

    req.pipe(proxyReq, { end: true });
};
