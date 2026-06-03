// @red-tetris/shared — THE single source of truth for the socket.io contract:
// every event name, payload type, and the typed socket maps. `playerId` is the
// server-assigned stable UUID (NOT socket.id); the join ack returns it as `youId`.
import type { Spectrum } from './types';

export type GameStatus = 'lobby' | 'playing' | 'ended';

export interface PlayerDTO {
  id: string;
  name: string;
  isHost: boolean;
  alive: boolean;
}

export interface OpponentDTO {
  id: string;
  name: string;
  alive: boolean;
  spectrum: Spectrum;
}

export interface RoomState {
  room: string;
  status: GameStatus;
  hostId: string | null;
  players: PlayerDTO[];
  seed: number | null;
}

export type ErrorCode =
  | 'ROOM_NAME_INVALID'
  | 'NAME_INVALID'
  | 'NAME_TAKEN'
  | 'JOIN_AFTER_START'
  | 'NOT_HOST'
  | 'NOT_IN_ROOM'
  | 'INTERNAL';

export interface ProtocolError {
  code: ErrorCode;
  message: string;
  fatal: boolean;
}

export type Ack<T> = { ok: true; data: T } | { ok: false; error: ProtocolError };

export interface JoinPayload {
  room: string;
  name: string;
}
export interface JoinResult {
  state: RoomState;
  youId: string; // caller's stable playerId
}
export interface GameStartPayload {
  seed: number;
  startedAt: number;
  players: PlayerDTO[];
}
export interface LockReport {
  board: number[][];
  pieceIndex: number;
  linesCleared: number;
}
export interface PenaltyApplyPayload {
  count: number;
  fromId: string;
  fromName: string;
}
export interface SpectrumReport {
  spectrum: Spectrum;
}
export interface SpectrumUpdatePayload {
  id: string;
  name: string;
  spectrum: Spectrum;
}
export interface TopoutReport {
  atPieceIndex: number;
}
export interface PlayerGameOverPayload {
  playerId: string;
  name: string;
}
export interface GameOverPayload {
  winnerId: string | null;
  winnerName: string | null;
  reason: 'last-standing' | 'solo-end' | 'everyone-left';
}
export interface HostChangedPayload {
  hostId: string;
  reason: 'assigned' | 'migrated';
}

export interface ServerToClientEvents {
  'room:state': (s: RoomState) => void;
  'host:changed': (p: HostChangedPayload) => void;
  'game:started': (p: GameStartPayload) => void;
  'penalty:apply': (p: PenaltyApplyPayload) => void;
  'spectrum:update': (p: SpectrumUpdatePayload) => void;
  'player:gameover': (p: PlayerGameOverPayload) => void;
  'game:over': (p: GameOverPayload) => void;
  'server:error': (e: ProtocolError) => void;
}

export interface ClientToServerEvents {
  join: (p: JoinPayload, ack: (r: Ack<JoinResult>) => void) => void;
  start: (ack: (r: Ack<GameStartPayload>) => void) => void;
  restart: (ack: (r: Ack<RoomState>) => void) => void;
  'board:locked': (p: LockReport) => void;
  'spectrum:report': (p: SpectrumReport) => void;
  'player:topout': (p: TopoutReport) => void;
  leave: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InterServerEvents {}

export interface SocketData {
  room?: string;
  playerId?: string;
  name?: string;
}
