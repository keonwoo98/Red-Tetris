import { existsSync, rmSync } from 'node:fs';
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Server } from 'socket.io';
import { io as ioc, type Socket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  Ack,
  ClientToServerEvents,
  GameStartPayload,
  JoinResult,
  LeaderboardEntry,
  PenaltyApplyPayload,
  RoomState,
  ServerToClientEvents,
} from '@red-tetris/shared';
import { RoomManager } from '../models/RoomManager.js';
import { createFileScoreStore } from '../persistence/scoreStore.js';
import { registerSocketHandlers } from './index.js';

const SCORE_TMP = '/tmp/rt-integration-scores.json';

type CS = Socket<ServerToClientEvents, ClientToServerEvents>;

let httpServer: HttpServer;
let io: Server;
let port: number;
const open: CS[] = [];

beforeEach(async () => {
  httpServer = createServer();
  io = new Server(httpServer);
  registerSocketHandlers(io, new RoomManager(), createFileScoreStore(SCORE_TMP));
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  port = (httpServer.address() as AddressInfo).port;
});

afterEach(async () => {
  for (const s of open.splice(0)) s.disconnect();
  await new Promise<void>((resolve) => io.close(() => resolve()));
  if (existsSync(SCORE_TMP)) rmSync(SCORE_TMP);
});

const connect = (): CS => {
  const s: CS = ioc(`http://localhost:${port}`, { forceNew: true, transports: ['websocket'] });
  open.push(s);
  return s;
};

const join = (sock: CS, room: string, name: string): Promise<Ack<JoinResult>> =>
  new Promise((resolve) => sock.emit('join', { room, name }, resolve));

const start = (sock: CS): Promise<Ack<GameStartPayload>> =>
  new Promise((resolve) => sock.emit('start', resolve));

const once = <T>(sock: CS, ev: keyof ServerToClientEvents): Promise<T> =>
  new Promise((resolve) => sock.once(ev, resolve as (...a: unknown[]) => void));

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

describe('socket integration', () => {
  it('I1: single player joins and becomes host', async () => {
    const a = connect();
    const res = await join(a, 'neon', 'alice');
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.youId).toBeTruthy();
      expect(res.data.state.hostId).toBe(res.data.youId);
      expect(res.data.state.players).toHaveLength(1);
    }
  });

  it('I2: second player sees a 2-player roster and is not host', async () => {
    const a = connect();
    await join(a, 'neon', 'alice');
    const b = connect();
    const roster = once<RoomState>(a, 'room:state');
    const res = await join(b, 'neon', 'bob');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.state.hostId).not.toBe(res.data.youId);
    expect((await roster).players).toHaveLength(2);
  });

  it('I3: invalid room/name is rejected', async () => {
    const a = connect();
    expect((await join(a, 'bad room!', 'alice')).ok).toBe(false);
    expect((await join(a, 'neon', '')).ok).toBe(false);
  });

  it('I4: NAME_TAKEN when a connected name rejoins in lobby', async () => {
    const a = connect();
    await join(a, 'neon', 'alice');
    const b = connect();
    const res = await join(b, 'neon', 'alice');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('NAME_TAKEN');
  });

  it('I5: start broadcasts an identical seed to all players (determinism)', async () => {
    const a = connect();
    await join(a, 'neon', 'alice');
    const b = connect();
    await join(b, 'neon', 'bob');
    const aStarted = once<GameStartPayload>(a, 'game:started');
    const bStarted = once<GameStartPayload>(b, 'game:started');
    const ack = await start(a);
    expect(ack.ok).toBe(true);
    const [sa, sb] = await Promise.all([aStarted, bStarted]);
    expect(sa.seed).toBe(sb.seed);
    if (ack.ok) expect(ack.data.seed).toBe(sa.seed);
  });

  it('I6: non-host cannot start, and join-after-start is rejected', async () => {
    const a = connect();
    await join(a, 'neon', 'alice');
    const b = connect();
    await join(b, 'neon', 'bob');
    const nonHost = await start(b);
    expect(nonHost.ok).toBe(false);
    if (!nonHost.ok) expect(nonHost.error.code).toBe('NOT_HOST');
    await start(a);
    const c = connect();
    const late = await join(c, 'neon', 'carol');
    expect(late.ok).toBe(false);
    if (!late.ok) expect(late.error.code).toBe('JOIN_AFTER_START');
  });

  it('I7: clearing 3 lines sends exactly one penalty of count 2 to the opponent', async () => {
    const a = connect();
    await join(a, 'neon', 'alice');
    const b = connect();
    await join(b, 'neon', 'bob');
    await Promise.all([once(a, 'game:started'), once(b, 'game:started'), start(a)]);
    const penalties: PenaltyApplyPayload[] = [];
    b.on('penalty:apply', (p) => penalties.push(p));
    a.emit('board:locked', { board: [], pieceIndex: 1, linesCleared: 3 });
    await wait(60);
    expect(penalties).toHaveLength(1);
    expect(penalties[0]!.count).toBe(2);
    expect(penalties[0]!.fromName).toBe('alice');
  });

  it('I8: spectrum:report relays to opponents only', async () => {
    const a = connect();
    await join(a, 'neon', 'alice');
    const b = connect();
    await join(b, 'neon', 'bob');
    const field = Array.from({ length: 20 }, () => new Array<number>(10).fill(0));
    field[19] = [1, 2, 3, 4, 5, 6, 7, 8, 0, 0];
    const update = once<{ name: string; spectrum: number[][] }>(b, 'spectrum:update');
    a.emit('spectrum:report', { spectrum: field });
    const u = await update;
    expect(u.name).toBe('alice');
    expect(u.spectrum).toEqual(field);
  });

  it('I9: a topout decides last-standing and broadcasts game:over', async () => {
    const a = connect();
    await join(a, 'neon', 'alice');
    const b = connect();
    await join(b, 'neon', 'bob');
    await Promise.all([once(a, 'game:started'), once(b, 'game:started'), start(a)]);
    const gameover = once<{ playerId: string }>(a, 'player:gameover');
    const over = once<{ reason: string; winnerName: string }>(a, 'game:over');
    b.emit('player:topout', { atPieceIndex: 5 });
    expect((await gameover).playerId).toBeTruthy();
    const ov = await over;
    expect(ov.reason).toBe('last-standing');
    expect(ov.winnerName).toBe('alice');
  });

  it('I10: host disconnect migrates the host role', async () => {
    const a = connect();
    await join(a, 'neon', 'alice');
    const b = connect();
    await join(b, 'neon', 'bob');
    const migrated = once<{ hostId: string; reason: string }>(b, 'host:changed');
    a.disconnect();
    const hc = await migrated;
    expect(hc.reason).toBe('migrated');
  });

  it('I11: score:report persists and leaderboard returns the top entries (bonus)', async () => {
    const a = connect();
    await join(a, 'neon', 'alice');
    a.emit('score:report', { score: 4200 });
    await wait(40);
    const entries = await new Promise<LeaderboardEntry[]>((resolve) => a.emit('leaderboard', resolve));
    expect(entries[0]).toEqual({ name: 'alice', score: 4200 });
  });

  it('I12: a mid-game disconnect does NOT end the round (only top-out / leave do)', async () => {
    const a = connect();
    await join(a, 'neon', 'alice');
    const b = connect();
    await join(b, 'neon', 'bob');
    const startedB = once<GameStartPayload>(b, 'game:started');
    await start(a);
    await startedB;

    let gameOver = false;
    a.on('game:over', () => {
      gameOver = true;
    });
    b.disconnect(); // transient drop mid-game (tab throttle/background)
    await wait(700);
    expect(gameOver).toBe(false); // a disconnect never resolves the round
  });
});
