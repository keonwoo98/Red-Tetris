import { randomUUID } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import { SPECTRUM_LENGTH } from '@red-tetris/shared';
import type {
  Ack,
  ClientToServerEvents,
  GameMode,
  GameStartPayload,
  InterServerEvents,
  JoinPayload,
  JoinResult,
  LeaderboardEntry,
  LockReport,
  ProtocolError,
  RoomState,
  ScoreReport,
  ServerToClientEvents,
  SocketData,
  SpectrumReport,
} from '@red-tetris/shared';
import { RoomManager } from '../models/RoomManager.js';
import type { ScoreStore } from '../persistence/scoreStore.js';
import { validateName, validateRoom } from './validation.js';

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const fail = (code: ProtocolError['code'], message: string, fatal = false): ProtocolError => ({
  code,
  message,
  fatal,
});

/** Resolve the Game for a socket's bound room, or undefined. */
const gameOf = (registry: RoomManager, socket: AppSocket) => {
  const room = socket.data.room;
  return room ? registry.find(room) : undefined;
};

function handleJoin(
  io: IO,
  registry: RoomManager,
  socket: AppSocket,
  payload: JoinPayload,
  ack: (r: Ack<JoinResult>) => void,
): void {
  const room = validateRoom(payload?.room);
  const name = validateName(payload?.name);
  if (!room) return ack({ ok: false, error: fail('ROOM_NAME_INVALID', 'Invalid room name', true) });
  if (!name) return ack({ ok: false, error: fail('NAME_INVALID', 'Invalid player name', true) });

  const g = registry.getOrCreate(room);
  const existing = g.findByName(name);

  // New players may join in the lobby AND after a game has ENDED (between rounds, before the host
  // relaunches). Only mid-game ('playing') is locked, where an existing name may merely reconnect.
  if (g.status !== 'playing') {
    if (existing && existing.connected) {
      return ack({ ok: false, error: fail('NAME_TAKEN', `Name "${name}" is taken`) });
    }
  } else if (!existing) {
    return ack({ ok: false, error: fail('JOIN_AFTER_START', 'Game already started') });
  }

  const wasEmpty = g.isEmpty;
  void socket.join(room);
  const player = g.addPlayer(randomUUID(), socket.id, name);
  socket.data = { room, playerId: player.id, name: player.name };

  ack({ ok: true, data: { state: g.serializeRoom(), youId: player.id } });
  io.to(room).emit('room:state', g.serializeRoom());
  if (wasEmpty && g.hostId) io.to(room).emit('host:changed', { hostId: g.hostId, reason: 'assigned' });
}

function handleStart(
  io: IO,
  registry: RoomManager,
  socket: AppSocket,
  ack: (r: Ack<GameStartPayload>) => void,
): void {
  const { room, playerId } = socket.data;
  const g = gameOf(registry, socket);
  if (!room || !playerId || !g) return ack({ ok: false, error: fail('NOT_IN_ROOM', 'Not in a room') });
  if (!g.isHost(playerId)) return ack({ ok: false, error: fail('NOT_HOST', 'Only the host can start') });
  if (!g.start(playerId)) return ack({ ok: false, error: fail('NOT_HOST', 'Cannot start now') });

  const payload: GameStartPayload = {
    seed: g.seed!,
    startedAt: g.startedAt!,
    players: g.serializeRoom().players,
    mode: g.mode,
  };
  ack({ ok: true, data: payload });
  io.to(room).emit('game:started', payload);
  io.to(room).emit('room:state', g.serializeRoom());
}

function handleRestart(
  io: IO,
  registry: RoomManager,
  socket: AppSocket,
  ack: (r: Ack<RoomState>) => void,
): void {
  const { room, playerId } = socket.data;
  const g = gameOf(registry, socket);
  if (!room || !playerId || !g) return ack({ ok: false, error: fail('NOT_IN_ROOM', 'Not in a room') });
  if (!g.isHost(playerId)) return ack({ ok: false, error: fail('NOT_HOST', 'Only the host can restart') });
  g.restart(playerId);
  ack({ ok: true, data: g.serializeRoom() });
  io.to(room).emit('room:state', g.serializeRoom());
}

function handleLock(io: IO, registry: RoomManager, socket: AppSocket, p: LockReport): void {
  const { room, playerId } = socket.data;
  const g = gameOf(registry, socket);
  if (!room || !playerId || !g) return;
  const player = g.find(playerId);
  if (g.status !== 'playing' || !player?.alive) return;

  g.setPieceIndex(playerId, p.pieceIndex);
  const dist = g.registerLineClear(playerId, p.linesCleared);
  if (dist.penaltyCount === 0) return;
  for (const targetId of dist.targets) {
    const target = g.find(targetId);
    if (target) {
      io.to(target.socketId).emit('penalty:apply', {
        count: dist.penaltyCount,
        fromId: playerId,
        fromName: player.name,
      });
    }
  }
}

function handleSpectrum(io: IO, registry: RoomManager, socket: AppSocket, p: SpectrumReport): void {
  const { room, playerId } = socket.data;
  const g = gameOf(registry, socket);
  if (!room || !playerId || !g) return;
  if (!Array.isArray(p?.spectrum) || p.spectrum.length !== SPECTRUM_LENGTH) return;

  const dto = g.updateSpectrum(playerId, p.spectrum);
  if (dto) socket.to(room).emit('spectrum:update', { id: dto.id, name: dto.name, spectrum: dto.spectrum });
}

function handleTopout(io: IO, registry: RoomManager, socket: AppSocket): void {
  const { room, playerId } = socket.data;
  const g = gameOf(registry, socket);
  if (!room || !playerId || !g) return;
  const player = g.find(playerId);
  if (g.status !== 'playing' || !player?.alive) return;

  const res = g.eliminate(playerId);
  io.to(room).emit('player:gameover', { playerId, name: player.name });
  if (res.decided && res.reason !== 'not-decided') {
    io.to(room).emit('game:over', {
      winnerId: res.winnerId,
      winnerName: res.winnerName,
      reason: res.reason,
    });
    io.to(room).emit('room:state', g.serializeRoom());
  }
}

function handleExit(io: IO, registry: RoomManager, socket: AppSocket, mode: 'leave' | 'disconnect'): void {
  const { room, playerId } = socket.data;
  if (!room || !playerId) return;
  const g = registry.find(room);
  if (!g) return;

  const prevHost = g.hostId;
  const res = mode === 'leave' ? g.removePlayer(playerId) : g.handleDisconnect(playerId);

  io.to(room).emit('room:state', g.serializeRoom());
  if (g.hostId && g.hostId !== prevHost) {
    io.to(room).emit('host:changed', { hostId: g.hostId, reason: 'migrated' });
  }
  if (res.decided && res.reason !== 'not-decided') {
    io.to(room).emit('game:over', {
      winnerId: res.winnerId,
      winnerName: res.winnerName,
      reason: res.reason,
    });
  }
  registry.removeEmpty(room);
  if (mode === 'leave') {
    void socket.leave(room);
    socket.data = {};
  }
}

function handleScore(socket: AppSocket, store: ScoreStore, p: ScoreReport): void {
  const name = socket.data.name;
  if (!name || !p || typeof p.score !== 'number') return;
  store.record(name, p.score, Date.now());
}

function handleSetMode(io: IO, registry: RoomManager, socket: AppSocket, mode: GameMode): void {
  const { room, playerId } = socket.data;
  const g = gameOf(registry, socket);
  if (!room || !playerId || !g) return;
  if (g.setMode(playerId, mode)) io.to(room).emit('room:state', g.serializeRoom());
}

/** Wire all socket.io event handlers. One RoomManager backs all concurrent games. */
export function registerSocketHandlers(io: IO, registry: RoomManager, store: ScoreStore): void {
  io.on('connection', (socket) => {
    socket.on('join', (payload, ack) => handleJoin(io, registry, socket, payload, ack));
    socket.on('start', (ack) => handleStart(io, registry, socket, ack));
    socket.on('restart', (ack) => handleRestart(io, registry, socket, ack));
    socket.on('board:locked', (p) => handleLock(io, registry, socket, p));
    socket.on('spectrum:report', (p) => handleSpectrum(io, registry, socket, p));
    socket.on('player:topout', () => handleTopout(io, registry, socket));
    socket.on('score:report', (p) => handleScore(socket, store, p));
    socket.on('leaderboard', (ack: (entries: LeaderboardEntry[]) => void) => ack(store.top(10)));
    socket.on('set-mode', (mode) => handleSetMode(io, registry, socket, mode));
    socket.on('leave', () => handleExit(io, registry, socket, 'leave'));
    socket.on('disconnect', () => handleExit(io, registry, socket, 'disconnect'));
  });
}
