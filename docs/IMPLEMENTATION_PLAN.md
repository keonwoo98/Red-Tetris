# Red Tetris — Definitive Implementation Plan (Single Source of Truth)

## 1. Overview & Guiding Principles

Red Tetris is a deterministic, networked multiplayer Tetris (42 spec v5.2), built as a TypeScript npm-workspaces monorepo. **Spec-compliance summary:** the client is a React 19 Single Page Application (BrowserRouter, URL `/<room>/<player>`) whose board/piece logic is implemented entirely as **pure functions with zero `this`** (ESLint-enforced, sole exception: custom `Error` subclasses); the server is **OOP TypeScript** (classes `Player`, `Piece`, `Game`, `RoomManager`) on Express 5 + socket.io v4 sharing one HTTP server that statically serves `index.html`/`bundle.js`; rendering uses **only CSS grid/flexbox `<div>`s** (no Canvas/SVG/`<table>`/jQuery); every player in a game derives the **same piece sequence by index** from one broadcast 32-bit `seed` via `pieceAt(seed, index)` (mulberry32 + 7-bag, no `Math.random`/`Date.now` in shared/engine); clearing `n` lines sends `n-1` **full-width indestructible** penalty lines to opponents; the **last player alive wins** (no scoring in mandatory); state is in-memory only; secrets live in a gitignored `.env`. Tests (Vitest 3.2 + v8) gate at **statements/functions/lines ≥ 70, branches ≥ 50**. The single highest-risk property — determinism — is guaranteed by making `pieceAt` the SOLE source of pieces and keeping the entire engine pure and table-driven.

**Authority model (FROZEN — resolves the client/server authority contradiction):** The **client is authoritative for its own board simulation** (gravity, lock-delay, rotation, movement, drops, line-clear, penalty application, top-out detection) using the pure shared engine; the **server is authoritative ONLY for shared/contested state** (room registry, roster, host identity, the `seed`, game lifecycle status, penalty *routing*, and win determination). There is **NO server-side gravity loop and NO server board simulation** — `GravityLoop.ts` is deleted from the design. The server never re-simulates boards; it routes penalty *counts* and adjudicates the alive-set. This is sufficient and correct because the deterministic piece stream + client inputs fully determine each board, and the mandatory spec requires no anti-cheat (no scoring, trusted classroom peers).

**Protocol (FROZEN — resolves the four incompatible vocabularies):** ONE protocol file, `packages/shared/src/protocol.ts`, is the single source of truth for all event names, payloads, and typed socket maps. The input model is **client-optimistic**: the client runs the game locally and reports derived facts (`board:locked`, `player:topout`) plus a spectrum; there is **no per-keystroke `game:action` event** and **no `EVENTS` map in `types.ts`**. Request/response events (`join`, `start`, `restart`) use socket.io **ack callbacks** (`Ack<T>`); reports/relays are fire-and-forget. No event name is ever reused across directions.

---

## 2. Final Tech Stack (pinned MAJOR versions)

| Layer | Package | Pin | Notes |
|---|---|---|---|
| Runtime | Node.js | engines `>=20.19` | Vite 7 floor; local dev 24.6.0. |
| Pkg mgr | npm | `>=10` | Native workspaces (local 11.5.1). |
| Language | TypeScript | `~5.9.0` | `moduleResolution: bundler`, `verbatimModuleSyntax`, `erasableSyntaxOnly`. |
| Bundler | Vite | `^7.1.0` | **Do NOT use Vite 8** (renames `rollupOptions`→`rolldownOptions`). |
| React plugin | @vitejs/plugin-react | `^5.0.0` | |
| Test runner | Vitest | `^3.2.0` | `test.projects` (not deprecated `workspace`). |
| Coverage | @vitest/coverage-v8 | `^3.2.0` | **Must exactly match Vitest version.** |
| UI | react / react-dom | `^19.1.0` | `react-dom/client` `createRoot`. |
| Types | @types/react / -dom | `^19.1.0` | |
| Router | react-router-dom | `^7.16.0` | Declarative `<BrowserRouter>` mode only. |
| State | @reduxjs/toolkit | `^2.12.0` | ESM-first. |
| React-Redux | react-redux | `^9.3.0` | React 18+ (OK on 19). |
| Server | express | `^5.1.0` | Named splat `/*splat` for SPA fallback. |
| Sockets | socket.io | `^4.8.0` | server. |
| Sockets (client) | socket.io-client | `^4.8.0` | |
| Test DOM | @testing-library/react | `^16.3.0` | React 19 support. |
| Test DOM | @testing-library/jest-dom | `^6.6.0` | import `/vitest`. |
| Test DOM | @testing-library/user-event | `^14.6.0` | |
| Test env | jsdom | `^26.0.0` | client project. |
| TS paths | vite-tsconfig-paths | `^5.1.0` | `@shared/*` for Vite + Vitest. |
| Dev runner | tsx | `^4.20.0` | server `tsx watch`. |
| Concurrency | concurrently | `^9.2.0` | dev. |
| Lint | eslint | `^9.30.0` | flat config. |
| Lint TS | typescript-eslint | `^8.39.0` | `tseslint.config()`. |
| Lint cfg | eslint-config-prettier | `^10.1.0` | last. |
| Lint react | eslint-plugin-react-hooks | `^5.2.0`, eslint-plugin-react-refresh `^0.4.20` | |
| Format | prettier | `^3.6.0` | |
| Types (node) | @types/node | `^24.0.0` | |
| Types (express) | @types/express | `^5.0.0` | |

---

## 3. Complete File/Folder Tree

```
red-tetris/
├── package.json                         # root: workspaces + unified scripts + all devDeps
├── package-lock.json                    # lockfile (generated)
├── tsconfig.base.json                   # shared compiler options + @shared/* path
├── tsconfig.json                        # solution file: references the 3 packages
├── vitest.config.ts                     # root: test.projects + coverage thresholds/excludes
├── eslint.config.js                     # flat config: no-`this` in client/shared, OOP in server
├── .prettierrc.json                     # formatting rules
├── .gitignore                           # node_modules, dist, coverage, .env, .env.*
├── .env.example                         # value-free: PORT, CLIENT_ORIGIN, NODE_ENV
├── README.md                            # run instructions + penalty-rule spec citation
│
├── packages/shared/
│   ├── package.json                     # @red-tetris/shared; type:module; exports dist
│   ├── tsconfig.json                    # composite; rootDir src, outDir dist
│   └── src/
│       ├── index.ts                     # barrel re-export (coverage-excluded)
│       ├── constants.ts                 # board dims, gravity/lock timing, SPAWN, colors, sentinels
│       ├── types.ts                     # Cell/Board/PieceType/ActivePiece/RoomState/PlayerDTO/...
│       ├── protocol.ts                  # THE socket contract: events, payloads, typed maps, Ack<T>
│       ├── tetrominoes.ts               # SHAPES, COLORS, KICKS_I, KICKS_JLSTZ, pure accessors
│       └── rng.ts                       # makeRng (mulberry32), shuffleBag, pieceAt, PIECE_ORDER
│
├── packages/server/
│   ├── package.json                     # @red-tetris/server; deps express, socket.io, shared
│   ├── tsconfig.json                    # composite; references shared; types node
│   └── src/
│       ├── index.ts                     # bootstrap: dotenv, express, http, io, registry, listen
│       ├── config.ts                    # PORT, CLIENT_ORIGIN, isDev from process.env (+defaults)
│       ├── http/
│       │   └── createHttpApp.ts         # express static + /health + named-splat SPA fallback
│       ├── models/
│       │   ├── Piece.ts                 # class Piece (immutable value object, OO transforms)
│       │   ├── Player.ts                # class Player (per-participant authoritative state)
│       │   ├── Game.ts                  # class Game (one room: lifecycle, host, seed, win)
│       │   ├── RoomManager.ts           # class RoomManager (Map<room,Game>; multi-game)
│       │   └── errors.ts                # class GameNotStartedError extends Error (the `this` site)
│       └── socket/
│           ├── events.ts                # re-export of protocol event names (server convenience)
│           ├── validation.ts            # validateRoom/validateName (regex, length, trim)
│           ├── SocketSession.ts         # class SocketSession (per-socket {socketId,room,playerId})
│           └── index.ts                 # registerSocketHandlers(io, registry)
│
└── packages/client/
    ├── package.json                     # @red-tetris/client; deps react, redux, router, shared
    ├── tsconfig.json                    # references shared; noEmit; jsx react-jsx; DOM libs
    ├── vite.config.ts                   # single bundle.js output + dev proxy to :3000
    ├── vitest.setup.ts                  # jest-dom/vitest + RTL cleanup
    ├── index.html                       # SPA mount point (<div id="root">, src/main.tsx)
    └── src/
        ├── main.tsx                     # createRoot + Provider + BrowserRouter + bindSocketListeners
        ├── types.ts                     # client-local view types (RenderCell, etc.)
        ├── errors/
        │   └── join.error.ts            # class JoinError extends Error (the ONLY client `this`)
        ├── engine/                      # PURE functions (zero this, no Math.random/Date.now)
        │   ├── index.ts                 # barrel (coverage-excluded)
        │   ├── board.ts                 # createBoard, cloneBoard, inBounds
        │   ├── piece.ts                 # spawnPiece (re-export), pieceCells, pieceColor, nextQueue
        │   ├── collision.ts             # collides
        │   ├── movement.ts              # moveLeft/Right/Down, isGrounded
        │   ├── rotation.ts              # rotate (SRS CW + wall kicks)
        │   ├── drop.ts                  # softDrop, hardDrop, ghostPiece
        │   ├── lock.ts                  # lockPiece, lockStep (one-frame grace state machine)
        │   ├── lines.ts                 # clearLines (penalty rows never clear)
        │   ├── penalty.ts               # addPenaltyLines (full-width, shift-up, overflow→topout)
        │   ├── spectrum.ts              # computeSpectrum
        │   ├── gameover.ts              # isGameOver, isTopOut
        │   └── render.ts                # overlayForRender (board+active+ghost → RenderCell grid)
        ├── store/
        │   ├── index.ts                 # configureStore + RootState/AppDispatch
        │   ├── lobbySlice.ts            # room/host/players/connection/joinError
        │   ├── gameSlice.ts             # board/current/pieceIndex/lockEvent/pendingPenalty/...
        │   ├── opponentsSlice.ts        # normalized opponents byId/ids
        │   ├── selectors.ts             # memoized selectors incl. selectRenderBoard
        │   └── socketMiddleware.ts      # OUTBOUND: action → socket.emit
        ├── socket/
        │   └── socket.ts                # io() singleton + bindSocketListeners(dispatch) INBOUND
        ├── hooks/
        │   ├── useAppDispatch.ts        # typed useDispatch
        │   ├── useAppSelector.ts        # typed useSelector
        │   ├── useGameLoop.ts           # fixed-step RAF → dispatch(tick)
        │   └── useKeyboard.ts           # window key listeners → input actions
        ├── routes/
        │   ├── AppRouter.tsx            # BrowserRouter + Routes (/ and /:room/:player)
        │   ├── Landing.tsx              # optional room+name form → navigate
        │   └── GameRoute.tsx            # useParams → validate → setIdentity → Lobby|GameView
        └── components/
            ├── App.tsx                  # Provider + AppRouter + global CSS
            ├── ErrorBoundary.tsx        # catches JoinError → friendly message
            ├── Lobby.tsx                # players + host badge + Start
            ├── PlayerList.tsx           # names + host badge
            ├── GameView.tsx             # runs hooks; lays out board + sidebar
            ├── Board.tsx                # CSS grid 10×20, 200 cells
            ├── Cell.tsx                 # one div, class per cell value (memoized)
            ├── NextPiece.tsx            # mini 4×4 preview of next[0]
            ├── Controls.tsx             # static key legend
            ├── OpponentsPanel.tsx       # flex column of opponents
            ├── OpponentSpectrum.tsx     # name + 10 column bars
            ├── GameOverOverlay.tsx      # winner / lost / solo + Restart (host)
            ├── Board.module.css         # grid + cell color classes
            ├── GameView.module.css      # flex layout
            ├── Lobby.module.css         # lobby layout
            ├── Opponents.module.css     # spectrum bars
            ├── Overlay.module.css       # overlay
            └── global.css               # reset + variables
```

Test files are co-located as `*.test.ts(x)` next to each source file (enumerated in §8).

---

## 4. Network Protocol

All event names, payload types, and the typed socket maps live in `packages/shared/src/protocol.ts`. `playerId` is the **server-assigned stable UUID** (NOT `socket.id`) — the join ack returns the caller's own `playerId` as `youId` so the client stores the correct identity (resolves the id-mismatch bug).

### 4.1 Event Catalog

| Event | Direction | Payload type | Ack | Trigger |
|---|---|---|---|---|
| `join` | C→S | `JoinPayload {room,name}` | `Ack<JoinResult>` | Client mounts `/:room/:player`, connects, emits once. Server validates, creates `Game` if absent, adds `Player`, assigns host if first. Ack returns `{state: RoomState, youId}` or `{ok:false,error}`. |
| `room:state` | S→C | `RoomState` | — | Broadcast to room after ANY roster/status/host change. Idempotent full snapshot; clients replace wholesale. |
| `host:changed` | S→C | `HostChangedPayload {hostId, reason}` | — | `reason:'assigned'` (first host) or `'migrated'` (host left). |
| `start` | C→S | *(none)* | `Ack<GameStartPayload>` | HOST only. Server checks `playerId===hostId && status==='lobby'`, host still connected, ≥1 connected player; picks `seed`, sets `status='playing'`, freezes connected roster as starters, returns + broadcasts `game:started`. |
| `game:started` | S→C | `GameStartPayload {seed, startedAt, players}` | — | Broadcast to all. **Determinism anchor.** Each client sets `index=0`, derives `pieceAt(seed,0)`, starts its local loop. No piece data ever sent again. |
| `restart` | C→S | *(none)* | `Ack<RoomState>` | HOST only, `status` ∈ `{playing, ended}`. Forces status→`lobby`, resets all players, clears seed, re-opens joins, returns/broadcasts `room:state`. |
| `board:locked` | C→S | `LockReport {board, pieceIndex, linesCleared}` | — | Fire-and-forget. Sent exactly once per lock (via `lockCommitted` action). `linesCleared∈0..4`. Server recomputes nothing; uses `linesCleared` for penalty routing and stores `pieceIndex`. |
| `penalty:apply` | S→C | `PenaltyApplyPayload {count, fromId, fromName}` | — | Sent to each OTHER alive player when an attacker's `linesCleared≥2`. `count = linesCleared-1`. |
| `spectrum:report` | C→S | `SpectrumReport {spectrum}` | — | Client emits after every settled-board change (lock, clear, penalty applied, top-out). `spectrum.length===10`. |
| `spectrum:update` | S→C | `SpectrumUpdatePayload {id, name, spectrum}` | — | Server relays to OPPONENTS only (`socket.to(room)`). |
| `player:topout` | C→S | `TopoutReport {atPieceIndex}` | — | Client's engine detected spawn collision on its OWN board. Server marks `alive=false`, removes from `alivePlayers`, broadcasts `player:gameover`, runs win check. Idempotent (no-op if already dead/not running). |
| `player:gameover` | S→C | `PlayerGameOverPayload {playerId, name}` | — | Broadcast when any player tops out. Opponents grey out that panel. |
| `game:over` | S→C | `GameOverPayload {winnerId, winnerName, reason}` | — | Win decided: `status='ended'`. `reason ∈ 'last-standing'|'solo-end'|'everyone-left'`. |
| `leave` | C→S | *(none)* | — | Explicit leave / route unmount. Server removes player, migrates host, GCs empty room, broadcasts `room:state`, runs win check if mid-game. |
| `server:error` | S→C | `ProtocolError {code, message, fatal}` | — | Out-of-band errors not tied to an ack (e.g. event before join). `fatal:true`→client routes to landing. |
| `disconnect` | (builtin) | — | — | Transport drop. Runs the same path as `leave`; mid-game it eliminates the player so the round can resolve. |

**No `game:action`, no `EVENTS` const, no `draw` reason.** (The `draw` branch is removed — see Flow E.)

### 4.2 Payload types (`protocol.ts`)

```ts
export type Spectrum = number[];                       // length 10, each 0..20
export type GameStatus = 'lobby' | 'playing' | 'ended';

export interface PlayerDTO { id: string; name: string; isHost: boolean; alive: boolean; }
export interface OpponentDTO { id: string; name: string; alive: boolean; spectrum: Spectrum; }
export interface RoomState {
  room: string; status: GameStatus; hostId: string | null;
  players: PlayerDTO[]; seed: number | null;
}

export type ErrorCode =
  | 'ROOM_NAME_INVALID' | 'NAME_INVALID' | 'NAME_TAKEN'
  | 'JOIN_AFTER_START' | 'NOT_HOST' | 'NOT_IN_ROOM' | 'INTERNAL';
export interface ProtocolError { code: ErrorCode; message: string; fatal: boolean; }
export type Ack<T> = { ok: true; data: T } | { ok: false; error: ProtocolError };

export interface JoinPayload { room: string; name: string; }
export interface JoinResult { state: RoomState; youId: string; }   // youId = caller's stable playerId
export interface GameStartPayload { seed: number; startedAt: number; players: PlayerDTO[]; }
export interface LockReport { board: number[][]; pieceIndex: number; linesCleared: number; }
export interface PenaltyApplyPayload { count: number; fromId: string; fromName: string; }
export interface SpectrumReport { spectrum: Spectrum; }
export interface SpectrumUpdatePayload { id: string; name: string; spectrum: Spectrum; }
export interface TopoutReport { atPieceIndex: number; }
export interface PlayerGameOverPayload { playerId: string; name: string; }
export interface GameOverPayload {
  winnerId: string | null; winnerName: string | null;
  reason: 'last-standing' | 'solo-end' | 'everyone-left';
}
export interface HostChangedPayload { hostId: string; reason: 'assigned' | 'migrated'; }

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
  'join': (p: JoinPayload, ack: (r: Ack<JoinResult>) => void) => void;
  'start': (ack: (r: Ack<GameStartPayload>) => void) => void;
  'restart': (ack: (r: Ack<RoomState>) => void) => void;
  'board:locked': (p: LockReport) => void;
  'spectrum:report': (p: SpectrumReport) => void;
  'player:topout': (p: TopoutReport) => void;
  'leave': () => void;
}
export interface InterServerEvents {}
export interface SocketData { room?: string; playerId?: string; name?: string; }
```

### 4.3 Sequence Flows

**Flow A — Join + lobby.**
1. Browser → `http://host:3000/neon/alice`. Express named-splat serves `index.html`+`bundle.js`.
2. `<GameRoute>` `useParams()` → `{room:'neon', player:'alice'}`; validates (throws `JoinError` on bad params); dispatches `lobby/setIdentity`.
3. `socketMiddleware` on `setIdentity` → `socket.connect()` then `socket.emit('join', {room,name}, ack)`.
4. Server validates `room`/`name` (`validateRoom`/`validateName`); `g = registry.getOrCreate('neon')`; if `!g.canJoin(name)` → ack `{ok:false, JOIN_AFTER_START|NAME_TAKEN}`. Else `socket.join('neon')`; `p = g.addPlayer(randomUUID(), socket.id, name)`; first player → host. `session.bind('neon', p.id)`.
5. Ack → `{ok:true, data:{state: g.serializeRoom(), youId: p.id}}`. Client `lobby/joined` stores `youId` as `myId` and the snapshot; host sees **Start**.
6. Bob joins → server broadcasts `room:state` to room; both clients render the 2-player roster. Bob sees "waiting for host".
7. Failures route to landing with a toast (`joinError`).

**Flow B — Start + seed (determinism).**
1. Host clicks Start → `lobby/requestStart` → middleware `socket.emit('start', ack)`.
2. Server: `g.start(session.playerId)` checks host + `status==='lobby'` + host connected + ≥1 connected. Picks `seed=(Math.random()*2**32)>>>0` (the ONLY entropy). Sets `status='playing'`, `resetForRound()` all, `starterIds = connected players` (disconnected ghosts excluded + set `alive=false`), `startedAt=Date.now()`.
3. Ack to host `{ok:true, data:{seed,startedAt,players}}` AND `io.to('neon').emit('game:started', {...})`.
4. Each client `game/startGame({seed})`: `board=createBoard()`, `pieceIndex=0`, `current=spawnPiece(pieceAt(seed,0))`, runs `isTopOut` on piece 0 (gameover if it collides), `next=nextQueue(seed,1,1)`, `status='playing'`, starts `useGameLoop`. Same seed ⇒ identical stream regardless of wall-clock.

**Flow C — Line clear + penalty.**
1. Client locks (gravity or hard drop) → `commitLock` merges, `clearLines` returns `{board, cleared:3}`, advances index, spawns next, sets `s.lockEvent={board, cleared, pieceIndex}`, dispatches `game/lockCommitted`.
2. Middleware on `lockCommitted` reads `lockEvent` (set+consumed exactly once) → `socket.emit('board:locked', {board, pieceIndex, linesCleared:cleared})` and `socket.emit('spectrum:report', {spectrum})`.
3. Server `g.registerLineClear(playerId, 3)` → `penaltyCount = max(0,3-1)=2`, `targets =` other **alive** players. For each target: `io.to(targetSocketId).emit('penalty:apply', {count:2, fromId, fromName})`. (`cleared=1`→0 targets, no emit.)
4. Target client `game/applyPenalty({n:2})`: sets `pendingPenalty += 2`. Penalty is flushed inside the receiver's **next `commitLock`** (before top-out check) AND immediately if the receiver is between pieces (`current===null`): `addPenaltyLines(board, n)`; then re-validate `collides(board, current)` — if overlap, top-out immediately. Recompute + emit `spectrum:report`.

**Flow D — Host migration.**
1. Host disconnects (`disconnect`) → `g.handleDisconnect(hostId)`: `p.detachSocket()`; if `running`, `p.eliminate()`; since host, `g.electHost()` promotes earliest-joined **still-present** player (deterministic by insertion order). 
2. Broadcast `host:changed {hostId, 'migrated'}` + `room:state`. Win check runs; if `alivePlayers===1` → `game:over`. `registry.removeEmpty('neon')`.

**Flow E — Last-man-standing (no draw branch).**
1. Bob's engine: `pieceAt(seed,index)` collides at spawn → emit `player:topout {atPieceIndex}`, stop local loop, freeze board, emit final `spectrum:report`.
2. Server: idempotent guard (running + alive); `bob.alive=false`, `alivePlayers.delete(bob)`; broadcast `player:gameover`. `winner()`: if `starters≥2 && alivePlayers===1` → `game:over {winnerId:survivor,'last-standing'}`, `status='ended'`. (Sequential processing means a true simultaneous death resolves as last-standing for whoever's topout is processed second — **documented and intended; no `draw`**.) If `starters===1 && alivePlayers===0` → `game:over {winnerId:null,'solo-end'}`. If all leave → `'everyone-left'`.

**Flow F — Restart.**
1. Host clicks Restart (only visible when `status==='ended'`) → `restart` ack. Server `g.restart(hostId)`: forces `status='lobby'`, `resetForRound()` all, `seed=null`, joins re-open. Ack + broadcast `room:state`.
2. All clients `game/resetGame` → lobby. Host clicks Start → Flow B with a NEW seed.

---

## 5. Shared Package Spec (`packages/shared`)

Pure, framework-agnostic, `erasableSyntaxOnly`-safe (no enums/namespaces — `as const` unions). y-down coords, origin top-left, `x∈0..9`, `y∈0..19`. Every export is pure: no `this`, no I/O, no `Math.random`/`Date.now`, no input mutation.

### 5.1 `constants.ts`

```ts
import type { Cell, PieceType, Position } from './types';
export const BOARD_WIDTH = 10 as const;
export const BOARD_HEIGHT = 20 as const;
export const SPECTRUM_LENGTH = 10 as const;
export const EMPTY = 0 as const;
export const PENALTY = 8 as const;             // indestructible garbage (authoritative)
export const GHOST = 9 as const;               // RENDER-ONLY; never in authoritative Board
export const GRAVITY_MS = 1000 as const;       // constant gravity (mandatory)
export const SOFT_DROP_FACTOR = 20 as const;
export const SOFT_DROP_MS = 50 as const;       // GRAVITY_MS / SOFT_DROP_FACTOR
export const LOCK_DELAY_FRAMES = 1 as const;   // one-frame grace
export const SPAWN_X = 3 as const;             // exported named (fixes client import)
export const SPAWN_Y = -1 as const;
export const PREVIEW_COUNT = 1 as const;       // mandatory: show 1 next piece
export const SPAWN: Record<PieceType, Position> = {
  I:{x:3,y:-1}, O:{x:3,y:-1}, T:{x:3,y:-1}, S:{x:3,y:-1}, Z:{x:3,y:-1}, J:{x:3,y:-1}, L:{x:3,y:-1},
};
export const COLOR_ID: Record<PieceType, Cell> = { I:1,O:2,T:3,S:4,Z:5,J:6,L:7 };
export const COLOR_HEX: Record<number, string> = {
  0:'transparent',1:'#00FFFF',2:'#FFFF00',3:'#A000F0',4:'#00F000',
  5:'#F00000',6:'#0000F0',7:'#F0A000',8:'#808080',9:'#FFFFFF',
};
```

### 5.2 `types.ts` (authoritative board is `Cell = 0..8`; `9` is render-only)

```ts
export type Cell = 0|1|2|3|4|5|6|7|8;          // 0 empty, 1-7 colors, 8 penalty (NO 9 here)
export type RenderCell = Cell | 9;             // 9 ghost — ONLY in client render overlay
export type FilledColor = 1|2|3|4|5|6|7;
export type Coord = readonly [col: number, row: number];
export interface Position { readonly x: number; readonly y: number; }
export type Board = Cell[][];                   // [row][col], 20×10; engine returns NEW boards
export type Spectrum = number[];
export type PieceType = 'I'|'O'|'T'|'S'|'Z'|'J'|'L';
export type RotationState = 0|1|2|3;
export interface ActivePiece {
  readonly type: PieceType; readonly rotation: RotationState;
  readonly x: number; readonly y: number; readonly grounded?: boolean;
}
// (RoomState/PlayerDTO/OpponentDTO/GameStatus are re-exported from protocol.ts)
```

### 5.3 `tetrominoes.ts` — data + pure accessors (SRS, y-down kick tables)

`SHAPES: Record<PieceType, readonly [Coord,Coord,Coord,Coord][]>` — explicit per-rotation 4-cell sets (I/O in 4×4, JLSTZ in 3×3) exactly as in the Tetromino Authority §1.2. `COLORS: Record<PieceType, Cell> = COLOR_ID`. `KICKS_JLSTZ` / `KICKS_I`: `Record<string, readonly Coord[]>` keyed `'${from}>${to}'`, 5 offsets each, y-down (pre-converted), first offset always `[0,0]`, all 8 CW+CCW keys present.

```ts
export const kickKey = (from: RotationState, to: RotationState): string => `${from}>${to}`;
export const shapeCells = (type: PieceType, rot: RotationState): readonly Coord[] => SHAPES[type][rot]!;
export const kicksFor = (type: PieceType, from: RotationState, to: RotationState): readonly Coord[] => {
  if (type === 'O') return [[0,0]];
  const table = type === 'I' ? KICKS_I : KICKS_JLSTZ;
  return table[kickKey(from,to)] ?? [[0,0]];
};
export const cellsAt = (p: ActivePiece): Coord[] =>
  SHAPES[p.type][p.rotation]!.map(([c,r]) => [p.x+c, p.y+r] as Coord);
export const spawnPiece = (type: PieceType): ActivePiece =>
  ({ type, rotation: 0, x: SPAWN[type]!.x, y: SPAWN[type]!.y });   // imports SPAWN from constants
```

### 5.4 `rng.ts` — determinism guarantee

`pieceAt` is the **SOLE** authoritative piece accessor. **Guard against out-of-range indices** (resolves `undefined`-piece bug):

```ts
export const PIECE_ORDER = ['I','O','T','S','Z','J','L'] as const;
const BAG_SIZE = 7;
const GOLDEN = 0x9e3779b1;

export const makeRng = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
export const shuffleBag = (rng: () => number): PieceType[] => {
  const bag: PieceType[] = [...PIECE_ORDER];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = bag[i]!; bag[i] = bag[j]!; bag[j] = tmp;
  }
  return bag;
};
export const nextBag = (rng: () => number): PieceType[] => shuffleBag(rng);
export const pieceAt = (seed: number, index: number): PieceType => {
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError(`pieceAt: index must be a non-negative integer, got ${index}`);
  }
  const bagIndex = Math.floor(index / BAG_SIZE);
  const inBag = index % BAG_SIZE;
  const bagSeed = (seed + Math.imul(bagIndex, GOLDEN)) >>> 0;
  const piece = shuffleBag(makeRng(bagSeed))[inBag];
  if (piece === undefined) throw new RangeError(`pieceAt: derived undefined at ${index}`);
  return piece;
};
```

**Determinism guarantee:** identical `seed` ⇒ identical `pieceAt(seed,i)` for every conformant JS engine (mulberry32 uses only `Math.imul`+integer ops). "Same positions and coordinates, even at different times" = **per-index spawn coords are constants per type** (§5.1 `SPAWN`); index advancement is intentionally per-player and asynchronous, but the *content* and *spawn coords* at each index are identical for all players. `pieceAt` is stateless/idempotent/order-independent. `makeRng`+`nextBag` exist only for tests/streaming and **must never be mixed** with `pieceAt` for the live sequence.

---

## 6. Server Spec (`packages/server`)

OOP TypeScript; classes own state and call shared pure fns. `Game` is **io-agnostic** (returns data; the socket layer emits) — this makes it directly unit-testable.

### 6.1 `class Piece` (immutable value object)

```ts
class Piece {
  readonly type: PieceType; readonly rotation: RotationState;
  readonly x: number; readonly y: number;
  constructor(type, rotation=0, x=3, y=-1);
  static spawn(type: PieceType): Piece;            // via shared spawnPiece
  static fromActive(a: ActivePiece): Piece;
  toActive(): ActivePiece;
  movedBy(dx,dy): Piece; moveDown(): Piece; withRotation(r): Piece;   // return NEW Piece
  cells(): Array<[number,number]>; colorId(): number;
  collidesOn(board: Board): boolean;               // via shared collides
}
```
Invariants: `readonly` fields; all transforms return fresh instances; O rotation is a strict no-op everywhere (rotation index stays 0).

### 6.2 `class Player`

```ts
class Player {
  readonly id: string;          // stable UUID (survives reconnect; used in hostId/winnerId)
  socketId: string;             // volatile transport id
  readonly name: string;
  isHost: boolean; alive: boolean;
  spectrum: number[];           // length 10, 0..20
  currentPieceIndex: number; lastSeen: number; connected: boolean;
  constructor(id, socketId, name);
  touch(): void;
  setSpectrum(s: number[]): void; setSpectrumFromBoard(b: Board): void;
  eliminate(): void; resetForRound(): void;
  attachSocket(socketId): void; detachSocket(): void;
  toDTO(): PlayerDTO;            // {id,name,isHost,alive}
  toOpponentDTO(): OpponentDTO; // {id,name,alive,spectrum}
}
```
Invariant: exactly one `isHost` while ≥1 connected player.

### 6.3 `class Game` (io-agnostic; returns data)

```ts
class Game {
  readonly room: string;
  private players: Player[];                // insertion-ordered
  seed: number | null; status: GameStatus; hostId: string | null;
  startedAt: number | null;
  private starterIds: Set<string>;
  constructor(room: string);

  // roster
  addPlayer(id, socketId, name): Player;    // reattach if name exists; first = host
  canJoin(name: string): boolean;           // lobby: true; playing/ended: only existing-name reconnect
  removePlayer(playerId): WinResult;        // migrates host; win-check if running
  handleDisconnect(playerId): WinResult;    // detach; if running eliminate; migrate host

  // host
  electHost(): string | null;               // earliest-joined STILL-PRESENT (idempotent)
  isHost(playerId): boolean;

  // lifecycle
  start(byPlayerId): boolean;               // host+lobby+host-connected+>=1 connected; pick seed; starters=connected
  restart(byPlayerId): boolean;             // host; force status='lobby' then start()

  // determinism
  pieceForIndex(index): PieceType;          // throws GameNotStartedError if seed===null
  pieceObjectForIndex(index): Piece;

  // attack
  registerLineClear(playerId, n): PenaltyDistribution;   // {from,linesCleared,penaltyCount:max(0,n-1),targets: alive others}

  // spectrum
  updateSpectrum(playerId, spectrum): OpponentDTO | null;

  // elimination & win (all idempotent; guard already-dead/not-running)
  eliminate(playerId): WinResult;
  winner(): WinResult;                      // last-standing | solo-end | everyone-left | not-decided
  setPieceIndex(playerId, idx): void;

  // serialization & lookups
  serializeRoom(): RoomState;
  opponentDTOs(): OpponentDTO[];
  find(id): Player|undefined; findByName(name): Player|undefined; findBySocket(sid): Player|undefined;
  get size(): number; get isEmpty(): boolean; get connectedCount(): number;
}
```
`WinResult = { decided: boolean; winnerId: string|null; winnerName: string|null; reason: 'last-standing'|'solo-end'|'everyone-left'|'not-decided' }`. `PenaltyDistribution = { from: string; linesCleared: number; penaltyCount: number; targets: string[] }`.

**Key fixes baked in:** `start()` excludes disconnected ghosts from `starterIds` and sets them `alive=false` (no never-ending 2-player games); `start()` rejects if host not connected (host-disconnect-during-start race); `restart()` forces `status='lobby'` first so it works from `playing` or `ended`; `winner()` has **no `draw`**; `eliminate`/`player:topout` guard against not-running/already-dead (idempotent).

### 6.4 `class RoomManager`

```ts
class RoomManager {
  private games: Map<string, Game>;
  getOrCreate(room): Game; find(room): Game|undefined; has(room): boolean;
  removeEmpty(room): boolean;               // delete iff isEmpty (called after every leave/disconnect)
  remove(room): void;
  get roomCount(): number; rooms(): string[];
  findBySocket(socketId): { game: Game; playerId: string } | undefined;
}
```
Invariant: per-game state lives ONLY on the `Game` instance — no module-level mutable globals (cross-room isolation).

### 6.5 `errors.ts`

```ts
export class GameNotStartedError extends Error {
  constructor(room: string) { super(`Game "${room}" not started; seed is null.`); this.name = 'GameNotStartedError'; }
}
```

### 6.6 `validation.ts`

```ts
const RE = /^[A-Za-z0-9_-]{1,16}$/;
export const validateRoom = (s: unknown): string | null =>
  typeof s === 'string' && RE.test(s.trim()) ? s.trim() : null;
export const validateName = validateRoom;   // same rules; uniqueness checked case-insensitively in Game
```

### 6.7 Socket handler map (`socket/index.ts`)

| C→S event | Validation | Game/Registry calls | Emits (S→C) |
|---|---|---|---|
| `join {room,name}` | `validateRoom`/`validateName`; `g.canJoin` | `g=registry.getOrCreate`; `socket.join`; `p=g.addPlayer(uuid,socket.id,name)`; `session.bind` | ack `{state, youId:p.id}` or `{ok:false,error}`; `io.to(room).emit('room:state')`; `host:changed assigned` if first |
| `start` (ack) | `g.isHost(playerId)` | `ok=g.start(playerId)` | if ok: ack `{seed,startedAt,players}` + `io.to(room).emit('game:started')` + `room:state`; else ack `{ok:false,NOT_HOST}` |
| `restart` (ack) | host-only | `g.restart(playerId)` | ack `{state}` + `room:state` |
| `board:locked {board,pieceIndex,linesCleared}` | running + alive | `g.setPieceIndex`; `d=g.registerLineClear(playerId,linesCleared)` | for each `targetId` in `d.targets`: `io.to(targetSocketId).emit('penalty:apply',{count:d.penaltyCount,fromId,fromName})` |
| `spectrum:report {spectrum}` | length-10 ints 0..20 | `o=g.updateSpectrum(playerId,spectrum)` | `socket.to(room).emit('spectrum:update', o)` |
| `player:topout {atPieceIndex}` | running + alive (idempotent) | `res=g.eliminate(playerId)` | `io.to(room).emit('player:gameover',{playerId,name})`; if `res.decided`: `io.to(room).emit('game:over', res)` + `room:state` |
| `leave` / `disconnect` | — | `res=g.handleDisconnect(playerId)`; `registry.removeEmpty(room)` | `room:state`; `host:changed migrated` if host changed; `game:over` if `res.decided` |

`SocketSession` (`{socketId, room?, playerId?}`, `bind(room,playerId)`) keeps handlers stateless. `withGame(registry, session, fn)` resolves room→Game, no-ops if missing, and guards `status==='playing'` + player alive for running-state handlers.

### 6.8 HTTP / static / SPA fallback (`http/createHttpApp.ts`)

```ts
export function buildApp(clientDist: string): express.Application {
  const app = express();
  app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
  app.use(express.static(clientDist));                 // index.html, bundle.js, assets — BEFORE fallback
  app.get('/*splat', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));  // named splat (Express 5)
  return app;
}
```
`index.ts` shares ONE `httpServer` between Express and socket.io: `createServer(app)` → `new Server(httpServer, {cors: isDev?{origin:CLIENT_ORIGIN,methods:['GET','POST']}:{}})` → `registerSocketHandlers(io, new RoomManager())` → `httpServer.listen(PORT)`. `clientDist = path.resolve(__dirname, '../../client/dist')`. socket.io intercepts `/socket.io/` before Express; static wins over the splat fallback so `/bundle.js` returns JS (verified by a negative test).

### 6.9 Lifecycle state machine

```
 lobby ──start(host)──► playing ──last-standing/solo-end/everyone-left──► ended
   ▲                       │ (join new name → rejected; reconnect existing name → reattach)
   │                       │ host leaves → electHost (status unchanged)
   └────restart(host)──────┴──restart(host) from ended──────────────────────┘
 any state, room empties → registry.removeEmpty → Game deleted (not a status)
```
Host-only triggers: `start`, `restart`. Any player: `join` (new name lobby-only), `board:locked`, `spectrum:report`, `player:topout`, `leave`. Server-automatic: host election, win detection, room GC.

---

## 7. Client Spec (`packages/client`)

Zero `this` except `src/errors/join.error.ts`. Engine re-exports canonical shared pure fns (single source of truth) + thin client glue (ghost/overlay). All randomness flows from the server `seed` via `pieceAt`.

### 7.1 Engine pure-function signatures

```ts
// board.ts
export const createBoard = (): Board;                         // fresh 20×10 EMPTY
export const cloneBoard = (b: Board): Board;
export const inBounds = (col: number, row: number): boolean;
// piece.ts
export { spawnPiece } from '@shared/tetrominoes';             // re-export (bit-identical with server)
export const pieceCells = (p: ActivePiece): {col:number;row:number}[];
export const pieceColor = (type: PieceType): Cell;
export const nextQueue = (seed: number, from: number, count: number): PieceType[];  // pieceAt loop
// collision.ts
export const collides = (board: Board, p: ActivePiece): boolean;   // row<0 allowed if col in range
// movement.ts
export const moveLeft  = (board: Board, p: ActivePiece): ActivePiece;   // same piece if blocked
export const moveRight = (board: Board, p: ActivePiece): ActivePiece;
export const moveDown  = (board: Board, p: ActivePiece): ActivePiece;
export const isGrounded = (board: Board, p: ActivePiece): boolean;
// rotation.ts
export const rotate = (board: Board, p: ActivePiece): ActivePiece;      // SRS CW; O is no-op; all kicks fail → unchanged
// drop.ts
export const softDrop  = (board: Board, p: ActivePiece): ActivePiece;
export const hardDrop  = (board: Board, p: ActivePiece): ActivePiece;
export const ghostPiece = (board: Board, p: ActivePiece): ActivePiece;
// lock.ts
export const lockPiece = (board: Board, p: ActivePiece): Board;         // merge into NEW board; row<0 dropped
export interface LockState { piece: ActivePiece; wasGroundedLastFrame: boolean; }
export type LockOutcome =
  | { kind: 'falling'; state: LockState }
  | { kind: 'grounded'; state: LockState }
  | { kind: 'lock' };                                                    // caller runs commitLock
export const lockStep = (board: Board, s: LockState): LockOutcome;       // one-frame grace, pure
// lines.ts
export const clearLines = (board: Board): { board: Board; cleared: number };   // penalty rows never clear
// penalty.ts
export const addPenaltyLines = (board: Board, n: number): { board: Board; toppedOut: boolean };  // overflow → toppedOut
// spectrum.ts
export const computeSpectrum = (board: Board): number[];                // length 10, 0..20
// gameover.ts
export const isGameOver = (board: Board, piece: ActivePiece): boolean;
export const isTopOut = (board: Board, type: PieceType): boolean;
// render.ts
export const overlayForRender = (board: Board, current: ActivePiece|null, ghost: ActivePiece|null): RenderCell[][];
```

**Resolved bugs:** `addPenaltyLines` checks if the top `n` rows being discarded are non-empty and returns `toppedOut:true` if so (no silent block loss); `lockStep` recomputes `isGrounded` at the START of every step so a move/rotate that un-grounds is honored; on penalty application the slice's `applyPenalty`/`commitLock` re-validates `collides(board, current)` and tops out on overlap (no lock-into-occupied). `Cell` authoritative type excludes `9`; `9` appears only in `RenderCell` from `overlayForRender`.

### 7.2 Redux state shape

```ts
interface RootState {
  lobby: {
    room: string|null; myId: string|null;        // myId = server youId (NOT socket.id)
    myName: string|null; hostId: string|null;
    players: PlayerDTO[]; status: GameStatus;
    connection: 'idle'|'connecting'|'connected'|'error'; joinError: string|null;
  };
  game: {
    seed: number|null; board: Board; current: ActivePiece|null;
    pieceIndex: number; next: PieceType[];
    status: 'idle'|'playing'|'gameover';
    wasGroundedLastFrame: boolean; pendingPenalty: number;
    lockEvent: { board: Board; cleared: number; pieceIndex: number } | null;  // consumed by middleware
    softDropActive: boolean; alive: boolean; winnerId: string|null;
  };
  opponents: { byId: Record<string, OpponentDTO>; ids: string[] };
}
```

### 7.3 Slices

- **`lobbySlice`**: `setIdentity({room,name})`, `connecting()`, `joined({state, youId})` (stores `myId=youId` + snapshot), `roomState(RoomState)`, `hostChanged({hostId})`, `joinRejected({reason})`, `requestStart()`/`requestRestart()` (middleware-only triggers), `connectionError()`. Selector `selectIsHost = s => !!s.lobby.myId && s.lobby.myId === s.lobby.hostId`.
- **`gameSlice`**: `startGame({seed})` (builds board, runs `isTopOut` on piece 0), `moveLeft/moveRight/rotateCW/softDrop` (optimistic; clear `wasGroundedLastFrame` if move un-grounds), `hardDrop` (drop+`commitLock`), `setSoftDrop(bool)`, `tick()` (calls `lockStep`; on `lock` → `commitLock`), `applyPenalty({n})` (`pendingPenalty+=n`; flush immediately if `current===null`), `lockCommitted()` (middleware trigger — sets nothing, just a signal carrying `lockEvent`), `topOut()`, `gameOver({winnerId})`, `resetGame()`. Internal pure helper `commitLock(s)`: flush `pendingPenalty` via `addPenaltyLines` (top-out on overflow), `lockPiece`→`clearLines`, advance index, `nextQueue`, re-validate spawn collision → top-out, set `s.lockEvent`, dispatch `lockCommitted`.
- **`opponentsSlice`**: `setOpponents(OpponentDTO[])`, `spectrumUpdate({id,name,spectrum})` (**upsert** — creates entry if missing, fixes the race), `opponentGameOver({id})`, `opponentLeft({id})`, `clearOpponents()`.

### 7.4 Socket middleware mappings

**OUTBOUND** (`socketMiddleware`, keyed by `action.type`, single emit per event):

| Action | Emit | Payload |
|---|---|---|
| `lobby/setIdentity` | `connect()` then `join` (with ack→`joined`/`joinRejected`) | `{room,name}` |
| `lobby/requestStart` | `start` (ack→`startGame` already broadcast) | — |
| `lobby/requestRestart` | `restart` (ack→`resetGame`) | — |
| `game/lockCommitted` | `board:locked` + `spectrum:report` (reads+clears `state.game.lockEvent` exactly ONCE) | `{board,pieceIndex,linesCleared:cleared}`, `{spectrum}` |
| `game/applyPenalty` (post-reduce) | `spectrum:report` | `{spectrum}` |
| `game/topOut` | `player:topout` + final `spectrum:report` | `{atPieceIndex}`, `{spectrum}` |
| route unmount / leave | `leave` + `disconnect()` | — |

`board:locked` is emitted **only** from `lockCommitted` — never from `hardDrop`/`tick` directly — so a line clear is reported **exactly once** (fixes the double-penalty bug).

**INBOUND** (`bindSocketListeners(dispatch)`, registered once in `main.tsx`):

| Socket event | Dispatch |
|---|---|
| `connect` | `lobby/connecting` (re-emit `join` on reconnect) |
| `room:state` | `lobby/roomState` + `opponents/setOpponents` (others, excluding `myId`) |
| `host:changed` | `lobby/hostChanged` |
| `game:started` | `game/startGame({seed})` |
| `penalty:apply` | `game/applyPenalty({n: count})` |
| `spectrum:update` | `opponents/spectrumUpdate` |
| `player:gameover` | `opponents/opponentGameOver` (if other) / `game/topOut` (if me) |
| `game:over` | `game/gameOver({winnerId})` |
| `server:error` | `lobby/joinRejected` / route-to-landing if fatal |
| `disconnect` | `lobby/connectionError` |

### 7.5 Hooks

- **`useGameLoop()`**: fixed-step RAF accumulator; interval `softDropActive ? SOFT_DROP_MS(50) : GRAVITY_MS(1000)`; dispatches `tick()` per elapsed step; only runs when `status==='playing'`; cleans up on unmount/state change. The one-frame grace lives entirely in the `tick`→`lockStep` reducer, keeping the loop a dumb deterministic emitter.
- **`useKeyboard(enabled)`**: `window` keydown → `ArrowLeft`/`Right`→move, `ArrowUp`→`rotateCW`, `ArrowDown`→`setSoftDrop(true)`+`softDrop`, `Space`→`hardDrop`; keyup `ArrowDown`→`setSoftDrop(false)`; `preventDefault` on game keys; guards `document.activeElement?.tagName !== 'INPUT'`; bound only when `enabled = alive && status==='playing'`; removes listeners on cleanup.

### 7.6 Component tree

```
<App> (Provider + global.css)
 └ <AppRouter> (BrowserRouter)
    ├ "/" → <Landing/> (room+name form → navigate)
    └ "/:room/:player" → <ErrorBoundary><GameRoute/></ErrorBoundary>
        ├ status==='lobby' → <Lobby/> → <PlayerList/> + (host? Start : "waiting")
        └ status∈{playing,ended} → <GameView/>
            ├ useGameLoop(); useKeyboard(alive && status==='playing')
            ├ <Board/> (grid 10×20) → <Cell/>×200
            ├ <aside> <NextPiece/> <Controls/> <OpponentsPanel/>→<OpponentSpectrum/>×N
            └ status==='ended' && <GameOverOverlay/> (winner/lost/solo + Restart if host)
```

### 7.7 Styling

CSS Modules only; zero CSS-in-JS, zero `<table>/canvas/svg`, no jQuery. Board: `display:grid; grid-template-columns:repeat(10,var(--cell)); grid-template-rows:repeat(20,var(--cell))`. Cell classes `.c1..c7`, `.penalty` (`#808080`), `.ghost` (`box-shadow: inset 0 0 0 2px rgba(255,255,255,.35)`), `.empty`. `GameView` uses flex. Opponent spectrum: flex column; each is a 10-column grid where bar height = inline `style={{height: \`${spectrum[c]/20*100}%\`}}` (dynamic data, not layout tech). Dead opponents `opacity:.4`. `--cell: clamp(14px,2.2vw,28px)`. Board renders exactly 200 `[data-cell]` divs (RTL-verifiable).

---

## 8. Testing Plan

### 8.1 Per-file test matrix

**shared (node project):**
- `tetrominoes.test.ts`: T1 each (type,rot) has 4 cells; T2 coords in box; T3 O identical across states; T4 golden 7×4 coordinate sets; T5 `COLORS` map; T6 kicks 5 offsets; T7 k0===`[0,0]`; T8 all 8 CW+CCW keys; `kicksFor`: O→`[[0,0]]`, I→KICKS_I, unknown→fallback (branches).
- `rng.test.ts`: R1 two `makeRng(42)` identical 1000-stream; R2 range `[0,1)`; R3 golden first-5 floats; R4 `pieceAt` order-independent; R5 golden `pieceAt(42,0..20)`; R6 every 7-window is a permutation; R8 `shuffleBag(makeRng(1))` golden; R9 different seeds differ; **R11 `pieceAt(seed,-1)` throws RangeError; R12 `pieceAt(seed,7.5)` throws; R13 large index works** (resolves undefined-piece bug).
- `constants.test.ts`: values; `SPAWN` 7 keys; `COLOR_ID` bijection 1..7; `SOFT_DROP_MS===50`.

**client engine (client project, pure):**
- `collision.test.ts` C1–C7 (empty/walls/floor/overlap/boundary/negative-y).
- `movement.test.ts` M1–M6 (move/blocked/frozen-input immutability).
- `rotation.test.ts` K1–K7 (k0 in open space; O no-op `rotation===0`; I wall kick; floor kick; all-fail→unchanged; full CW cycle; T-spin late kick).
- `drop.test.ts` H1–H3 (floor/onto-pile/idempotent at rest).
- `lines.test.ts` L1–L8 (n=0..4; penalty row never clears; mixed; immutability; **combined invariant: board always 20×10**).
- `penalty.test.ts` P1–P8 (n=0 no-op; n=1/2 shift+bottom; full-width `===8`; **P5 overflow→`toppedOut:true`**; survive clearLines; immutability; **active-piece overlap re-validation handled in slice test**).
- `spectrum.test.ts` S1–S7 (empty/bottom/top/hole/jagged/penalty-counts/length-invariant).
- `gameover.test.ts` G1–G2; `lock.test.ts` LD1–LD6 (**LD4/LD5 interleave a move between ticks**; LD6 hard-drop bypass).
- `render.test.ts`: overlay tags ghost as `9`, never writes `9` into authoritative board.

**server (node project, mock-free for models):**
- `Player.test.ts` PL1–PL5. `Piece.test.ts` PC1–PC4.
- `Game.test.ts` GM1–GM17 incl. **GM4 join-after-start rejected; GM6 solo start; GM7 host migration to earliest still-present; GM9 n=3→2 penalties to OTHER alive only; GM10 n=1→0; GM12 last-standing; GM13 solo-end `winnerId:null`; GM15 restart-from-running works; GM16 non-host ignored; ghost-starter excluded; host-disconnect-during-start rejected; eliminate idempotent**.
- `RoomManager.test.ts` RM1–RM6 (create/idempotent/isolation/remove/auto-GC/list).
- `validation.test.ts`: valid names; reject empty/`/`/space/>16/invalid chars.

**server socket (node project; mock-`io` unit tests — first-class, NOT a fallback):**
- `socket/handlers.test.ts`: invoke each handler with a fake `socket`/`io` recording `join`/`to(room).emit`; assert join→`room:state`, non-host start→`NOT_HOST`, host start→`game:started{seed}`, `board:locked` 3 lines→exactly ONE `penalty:apply{count:2}`, topout→`game:over`, disconnect→migration/win.

**socket integration (node project; thin smoke):**
- `socket/integration.test.ts` I1–I10 with real in-process server + `socket.io-client`, ephemeral `listen(0)`, `forceNew`. I4 asserts identical `seed` on two clients; I6 exactly one penalty `count:2`; I7 disconnect→winner; I10 `GET /room/alice`→`index.html` AND `GET /bundle.js`→JS content-type (negative test).

**client React (client project, RTL):**
- `Board.test.tsx` B1–B4 (200 `[data-cell]`; color classes; no canvas/svg/table; grid container).
- `OpponentSpectrum.test.tsx` SP1–SP3. `useKeyboard.test.tsx` KB1–KB4. `Lobby.test.tsx` LB1–LB4. `GameOverOverlay.test.tsx` OV1–OV5.
- `gameSlice.test.ts`: optimistic move/rotate; `commitLock` advances index + spawns next; **penalty-arrives-mid-fall flushed at next lock + top-out re-evaluated; double-emit guard (lockEvent consumed once)**; `startGame` top-out on blocked piece 0.

**build smoke (node project):**
- `build/bundle.test.ts` (runs after `npm run build` in CI phase): `existsSync('packages/client/dist/bundle.js')` AND `dist/index.html` contains exactly one `<script ... src="/bundle.js">`.

### 8.2 Root `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';   // hoisted import (no top-level await — robustness)

export default defineConfig({
  test: {
    projects: [
      { extends: true, test: {
          name: 'node', environment: 'node',
          include: ['packages/server/**/*.{test,spec}.ts', 'packages/shared/**/*.{test,spec}.ts'],
        } },
      { extends: true, plugins: [tsconfigPaths()], test: {
          name: 'client', environment: 'jsdom', globals: true,
          setupFiles: ['./packages/client/vitest.setup.ts'],
          include: ['packages/client/**/*.{test,spec}.{ts,tsx}'],
        } },
    ],
    coverage: {
      provider: 'v8', reporter: ['text', 'html', 'lcov'], all: true,
      include: ['packages/*/src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.{test,spec}.*', '**/dist/**', '**/*.d.ts', '**/index.ts',
        'packages/client/src/main.tsx',
        'packages/client/src/socket/**',
        'packages/server/src/index.ts',
        'packages/server/src/socket/index.ts',     // wiring only (handlers tested via mock + integration)
        'packages/server/src/http/**',
      ],
      thresholds: { statements: 70, functions: 70, lines: 70, branches: 50 },
    },
  },
});
```
`validation.ts`, `SocketSession.ts`, `events.ts` live under `socket/` but are NOT excluded except `socket/index.ts` (the pure ones count toward coverage). `@vitest/coverage-v8` pinned to the exact Vitest version. Pure backbone (~98% of ~60% of statements) absorbs the dilution; deliberate branch cases (clearLines n-variants, kick all-fail, lock LD1–6, host migration, winner solo/multi, penalty overflow) land branches >50%.

---

## 9. Ordered Implementation Phases

### Phase 0 — Scaffolding & guards
**Goal:** Compilable, lint-clean, test-runnable empty monorepo with secrets safe.
**Tasks:**
- [ ] `git checkout -b setup` (never work on `main` per spec hygiene).
- [ ] Create `.gitignore` (`node_modules`, `dist`, `coverage`, `.env`, `.env.*` except `!.env.example`) and value-free `.env.example` (`PORT=3000`, `CLIENT_ORIGIN=http://localhost:5173`, `NODE_ENV=development`) **as the first commit, before any code**.
- [ ] Root `package.json` (workspaces, scripts, all devDeps), `tsconfig.base.json`, `tsconfig.json`, `eslint.config.js`, `.prettierrc.json`, `vitest.config.ts`, `README.md`.
- [ ] Three package `package.json` + `tsconfig.json`; empty `src/index.ts` per package; client `vite.config.ts`, `index.html`, `src/main.tsx` stub, `vitest.setup.ts`.
- [ ] `npm install`.
**Verify:**
- `git ls-files | grep -E '\.env$'` → empty; `cat .gitignore | grep -E '^\.env$'` → present.
- `npm run typecheck` → exit 0. `npm run lint` → 0 errors. `npx vitest run` → "no tests" exit 0.

### Phase 1 — Shared core (determinism backbone)
**Goal:** Pure shared package fully implemented + tested ≥95%.
**Tasks:**
- [ ] `constants.ts`, `types.ts`, `protocol.ts`, `tetrominoes.ts` (golden SHAPES + y-down KICKS), `rng.ts` (with RangeError guards), `index.ts` barrel.
- [ ] All shared tests (§8.1 tetrominoes/rng/constants) incl. golden `pieceAt(42,0..20)` and negative-index throws.
**Verify:**
- `npx vitest run --project node packages/shared` → all pass.
- `npx vitest run --coverage` → shared files ≥95% statements.
- `npm run lint` → no `this`/`Math.random`/`Date.now` in shared.

### Phase 2 — Client engine (pure game logic)
**Goal:** Every engine function pure, immutable, tested ≥95%; resolves penalty/lock/overlay bugs.
**Tasks:**
- [ ] `board/piece/collision/movement/rotation/drop/lock/lines/penalty/spectrum/gameover/render.ts`.
- [ ] All engine tests (§8.1) with deep-`Object.freeze` purity assertions; LD interleave tests; penalty overflow + active-piece overlap; render never emits `9` into authoritative board.
**Verify:**
- `npx vitest run --project client packages/client/src/engine` → all pass.
- Coverage: engine ≥95% statements, branches well above 50%.
- `npm run lint` → zero `this` in client engine.

### Phase 3 — Server models (OOP authority)
**Goal:** `Piece/Player/Game/RoomManager` + errors + validation implemented & tested ≥85%.
**Tasks:**
- [ ] Implement four classes (io-agnostic `Game`), `errors.ts`, `validation.ts`.
- [ ] Server model tests (§8.1) incl. ghost-starter exclusion, host-disconnect-during-start rejection, restart-from-running, no-draw winner, idempotent eliminate.
**Verify:**
- `npx vitest run --project node packages/server/src/models packages/server/src/socket/validation.test.ts` → all pass.
- `grep -rn "class Player\|class Piece\|class Game\|class RoomManager" packages/server/src` → all four present.
- Coverage: models ≥85%.

### Phase 4 — Server socket + HTTP wiring
**Goal:** Live server serves static + SPA fallback and handles all events.
**Tasks:**
- [ ] `socket/events.ts`, `socket/SocketSession.ts`, `socket/index.ts` (handler map §6.7), `http/createHttpApp.ts`, `config.ts`, `index.ts`.
- [ ] `socket/handlers.test.ts` (mock-io) + `socket/integration.test.ts` (I1–I10).
**Verify:**
- `npx vitest run packages/server/src/socket` → all pass (including I4 identical seed, I6 single penalty, I10 fallback + JS MIME).
- `npm run build -w packages/shared && npm run dev -w packages/server` then `curl -s localhost:3000/health` → `{"status":"ok",...}`; `curl -s localhost:3000/anyroom/alice | grep -c '<div id="root"'` → 1.

### Phase 5 — Client store + socket bridge
**Goal:** Redux slices, selectors, middleware (outbound), `bindSocketListeners` (inbound) wired; single-emit lock path.
**Tasks:**
- [ ] `store/index.ts`, `lobbySlice/gameSlice/opponentsSlice/selectors/socketMiddleware`, `socket/socket.ts`.
- [ ] `gameSlice.test.ts` (commitLock, penalty-at-lock, lockEvent consumed once, startGame top-out), slice reducer tests.
**Verify:**
- `npx vitest run packages/client/src/store` → all pass.
- Assert in test: a single 3-line `hardDrop`→`commitLock` produces exactly one `board:locked` emit (mock socket).

### Phase 6 — Client UI + hooks (mandatory game fully functional)
**Goal:** Playable solo + multiplayer end-to-end in the browser.
**Tasks:**
- [ ] `hooks/*`, `routes/*`, `components/*` + CSS Modules; `main.tsx` (Provider+Router+bindSocketListeners); `errors/join.error.ts`; `ErrorBoundary`.
- [ ] React tests (Board/OpponentSpectrum/useKeyboard/Lobby/GameOverOverlay).
**Verify:**
- `npm run dev` (server+client). Browser `http://localhost:5173/solo/alice` → join, Start, play to game over.
- Two browsers `http://localhost:5173/neon/{alice,bob}` → both see roster; host Start; clearing 3 lines on alice adds 2 penalty rows to bob; spectrums update; bob top-out → alice "You win".
- DevTools: board is `<div>` grid, exactly 200 cells, no `<canvas>/<svg>/<table>`; Network shows single `bundle.js` in prod build.
- `npx vitest run packages/client/src/components` → pass.

### Phase 7 — Production build + full gate
**Goal:** Single `bundle.js`, prod static-serve, coverage gate green.
**Tasks:**
- [ ] `npm run build` (shared→client→server); add `build/bundle.test.ts`.
- [ ] `npm start`; verify deep-link refresh.
**Verify:**
- `npm run build` → exit 0; `ls packages/client/dist/bundle.js` → exists; `grep -c 'src="/bundle.js"' packages/client/dist/index.html` → 1.
- `npm start` → `curl -s localhost:3000/ | grep -c bundle.js` → 1; browser hard-refresh on `/neon/alice` → app loads (no 404).
- `npm run coverage` → exit 0 with **statements/functions/lines ≥70, branches ≥50** printed.
- `npm run lint && npm run typecheck` → exit 0.
- Open PR from `setup`/feature branch to `main` (only on explicit user request).

### Phase 8 — Mandatory sign-off
**Goal:** Confirm every spec row before any bonus.
**Verify (run the cross-cutting peer one-liners):**
- No client `this`: `grep -rn "this" packages/client/src --include=*.ts --include=*.tsx | grep -v src/errors` → only Error subclass.
- No banned tech: `grep -rin "canvas\|<svg\|<table\|jquery" packages/client/src` → none.
- Determinism source: `grep -rn "Math.random\|Date.now" packages/shared packages/client/src/engine` → none.
- All 8 mandatory flows (solo, multi, host migration, join-after-start rejected, last-man-standing, restart, concurrent rooms via `/a/x` + `/b/y`, refresh behavior) manually pass.

---

## 10. Bonus Roadmap (gated on Phase 8 complete & functional)

Bonuses are additive, isolated, removable without touching mandatory paths; feature-flagged off by default.
1. **Scoring system** — `scoreSlice` (client) + `score` field behind a `FEATURE_SCORING` flag; never alters win condition.
2. **Persistent scores** — add a DB (e.g. SQLite) ONLY in a `packages/server/src/persistence/` module gated behind `FEATURE_PERSISTENCE`; mandatory build must run with it off and no DB driver loaded.
3. **New game modes** — invisible pieces (render flag), increased gravity (variable `GRAVITY_MS` curve) as a server-broadcast `mode` in `game:started`; both keep determinism (still `pieceAt`).
4. **FRP via flyd** — refactor the client game loop/input streams to flyd streams in a parallel `engine-frp/` without removing the pure engine.

---

## 11. Risk Register (incorporates all review findings)

| # | Risk | Mitigation (baked into this plan) |
|---|---|---|
| R1 | **Three+ incompatible socket vocabularies** | ONE `protocol.ts` is the sole source; `EVENTS` map deleted; no name reused across directions (`start` C→S, `game:started` S→C). §4. |
| R2 | **Client/server authority contradiction; orphan `GravityLoop`** | Authority FROZEN: client-authoritative boards, server routes only; `GravityLoop.ts` deleted; no `game:action`. §1, §6. |
| R3 | **`pieceAt` returns `undefined` on negative/out-of-range index** | `pieceAt` throws `RangeError` for non-integer/negative; asserts derived `!== undefined`. Tests R11–R13. §5.4. |
| R4 | **Double penalty report (hardDrop + tick both emit)** | `board:locked` emitted ONLY from `lockCommitted`, reading+clearing `lockEvent` exactly once. Test in §8.1 gameSlice + integration I6. §7.4. |
| R5 | **Penalty shifts board under active piece → lock into occupied** | On penalty apply, `pendingPenalty` flushes inside next `commitLock` (or immediately if between pieces) then re-validates `collides(board,current)`→top-out. `addPenaltyLines` returns `toppedOut` on overflow. §7.1, Flow C. |
| R6 | **Lock-delay re-arm off-by-one across independent client ticks** | `lockStep` recomputes `isGrounded` at step start; move/rotate reducers clear `wasGroundedLastFrame` when they un-ground. Tests LD4/LD5 interleave moves. §7.1. |
| R7 | **False "server can reconstruct boards"** | Claim deleted: server stores seed + spectrum + alive/host/index only; trusts client reports (no anti-cheat in mandatory). §1, §6.5 decision. |
| R8 | **Host-disconnect-during-start race** | `start()` rejects if host not connected; disconnect handler treats it as normal mid-game elimination. GM test. §6.3. |
| R9 | **Non-firing `draw` branch** | `draw` removed; sequential topout resolves last-standing for second-processed; documented intended. Flow E, §6.3. |
| R10 | **Ghost (disconnected) starter never lets game end** | `start()` excludes non-connected from `starterIds`, sets them `alive=false`. GM test. §6.3. |
| R11 | **playerId mismatch (socket.id vs UUID)** | `playerId` = server UUID everywhere; join ack returns `youId`; client stores it as `myId`. §4, §7.2. |
| R12 | **Refresh-eliminates UX during eval** | Lobby/ended refresh cleanly rejoins; playing refresh = elimination, documented in README + on-screen ("refreshing forfeits the round"). §4 (`canJoin`), README. |
| R13 | **Cell `9` ghost contaminating authoritative board** | `Cell=0..8`; `RenderCell=Cell\|9` only in `overlayForRender`. Test asserts no `9` in authoritative board. §5.2, §7.1. |
| R14 | **`restart()` no-op from running** | `restart()` forces `status='lobby'` then `start()`; works from playing/ended. GM15. §6.3. |
| R15 | **Vitest top-level `await import` config fragility** | `tsconfigPaths` imported at top (no top-level await). §8.2. |
| R16 | **Vite emits hashed chunks, not `bundle.js`** | `entryFileNames:'bundle.js'` + `inlineDynamicImports:true` + `manualChunks:undefined`; `build/bundle.test.ts` asserts dist/bundle.js + single script tag. §2 vite cfg, §8.1, Phase 7. |
| R17 | **Express 5 bare `'*'` throws** | Named splat `/*splat` after `express.static`; negative test that `/bundle.js` returns JS not HTML. §6.8, I10. |
| R18 | **`@vitest/coverage-v8` version drift** | Pinned to exact Vitest `^3.2.0`; deduped in lockfile. §2. |
| R19 | **Secrets committed before `.gitignore`** | `.gitignore` + `.env.example` are the FIRST commit; `git ls-files \| grep '\.env$'` empty check in Phase 0. |
| R20 | **`noUncheckedIndexedAccess` build failures** | Non-null assertions/guards on all array indexing (`SHAPES[t][r]!`, `board[r][c]`, `bag[i]!`); enforced by `tsc -b` in every phase. §5.3, Phase 1+. |
| R21 | **Branches < 50% (tightest gate)** | Deliberate branch suite: clearLines n=0..4+penalty, kick all-fail, lock LD1–6, host migration, winner solo/multi, penalty overflow, validation rejects. §8.1. |
| R22 | **Spectrum stale on dead player / opponent race** | Final `spectrum:report` on top-out; `spectrumUpdate` upserts (creates entry if missing). §7.3, §7.4. |
| R23 | **`npm start` before build → blank page** | README mandates `npm i && npm run build && npm start`; `start` script documents prerequisite; build order shared→client→server. §2, Phase 7. |
