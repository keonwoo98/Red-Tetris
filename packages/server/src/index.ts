import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@red-tetris/shared';
import { CLIENT_ORIGIN, PORT, isDev } from './config.js';
import { buildApp } from './http/createHttpApp.js';
import { RoomManager } from './models/RoomManager.js';
import { registerSocketHandlers } from './socket/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, '../../client/dist');

const app = buildApp(clientDist);
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
  httpServer,
  { cors: isDev ? { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] } : {} },
);

registerSocketHandlers(io, new RoomManager());

httpServer.listen(PORT, () => {
  console.log(`Red Tetris server listening on http://localhost:${PORT}`);
});
