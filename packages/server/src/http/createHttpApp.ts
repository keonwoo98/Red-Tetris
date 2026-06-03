import path from 'node:path';
import express from 'express';

/**
 * Express app that serves the built client (index.html, bundle.js, assets) and falls back to
 * index.html for client-side routes (BrowserRouter deep links). socket.io shares the same HTTP
 * server and intercepts /socket.io/ before Express; express.static is mounted BEFORE the splat
 * fallback so /bundle.js returns JS, not index.html.
 */
export function buildApp(clientDist: string): express.Application {
  const app = express();

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use(express.static(clientDist));

  // Express 5: a bare '*' is invalid under path-to-regexp v8 — use a named splat.
  app.get('/*splat', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  return app;
}
