import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/protocol';

// From the client's perspective the socket LISTENS to ServerToClientEvents and EMITS
// ClientToServerEvents. Connects to the serving origin; dev uses Vite's /socket.io proxy.
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({ autoConnect: false });
