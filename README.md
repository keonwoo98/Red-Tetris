# Red Tetris

Networked multiplayer Tetris (42 spec v5.2) — Full-Stack JavaScript/TypeScript.

- **Client**: React 19 + Redux Toolkit + Vite + React Router. Single Page Application,
  functional only (zero `this`, ESLint-enforced), pure-function game engine. Rendered with
  CSS grid/flexbox `<div>`s only (no Canvas / SVG / `<table>` / jQuery).
- **Server**: Node + Express 5 + socket.io v4, OOP TypeScript (`Player`, `Piece`, `Game`,
  `RoomManager`). Serves `index.html` / `bundle.js` / static assets over one HTTP server.
- **Shared**: deterministic piece source — every player in a game derives the *same* piece
  sequence by index from one broadcast seed (`pieceAt(seed, index)`).

## Rules (mandatory part)

Each field is **10 columns × 20 rows**. Pieces fall at a constant speed; once a piece lands it
has a short **lock delay** before it sets, so you can still slide or spin it into place. Clearing
`n` lines sends **`n - 1` indestructible penalty lines** to every opponent's bottom. Players see
opponents' names and a real-time **spectrum** (each column's highest block). The win condition is
**last player standing** (the bonus score does not affect it). Solo and multiplayer are both
supported.

Join via URL: `http://<host>:<port>/<room>/<player_name>` (the path form, per the v5.2 subject).
The legacy hash form `http://<host>:<port>/#<room>[<player_name>]` is also accepted and forwards to
the same game. The first player to join a room is the **host** and starts the game; if the host
leaves, the role migrates. When a round ends the **winner is promoted to host** and controls the
**relaunch** (the eval sheet's "only the top player can relaunch"). New players cannot join mid-round,
but **may join again once the game ends**, before the next round starts.

---

## How to Play

### Joining a game

1. Open `http://<host>:<port>/` and enter a **ROOM** and a **PLAYER** name (letters, numbers,
   `_`, `-`, max 16), then **ENTER ARENA**. You can also jump straight in with either URL form:
   the path `http://<host>:<port>/<room>/<player>` (e.g. `localhost:5173/neon/alice`) or the legacy
   hash `http://<host>:<port>/#<room>[<player>]` (e.g. `localhost:5173/#neon[alice]`).
2. In the **lobby**, the first player to join is the **host** and is the only one who can pick
   the mode and press **START GAME**; everyone else waits. If the host leaves, the role migrates
   to the next player automatically.
3. One player in a room is a **solo** game; two or more is **multiplayer** — they all start
   together from the same seed.

### Controls

| Key | Action |
|---|---|
| **← →** | Move left/right (hold to auto-shift — **DAS** 130 ms, then **ARR** 20 ms repeat) |
| **↑** | Rotate clockwise (SRS with wall kicks) |
| **↓** | Soft drop — fall faster while held (+1 point per cell) |
| **Space** | Hard drop — slam to the bottom and lock instantly (+1 point per cell) |
| **C** (or **Shift**) | Hold — stash/swap the current piece (once per drop) |

### Core mechanics

- **Board**: 10 × 20. **Next queue**: the upcoming **5** pieces. **Hold**: one stash slot,
  re-armed after each lock.
- **Randomizer**: a **7-bag** (each batch is a shuffled permutation of all seven pieces, so no
  long droughts). It is fully deterministic — every client in the room sees the identical
  sequence from the shared seed.
- **Ghost piece**: a preview of where the current piece would land.
- **Rotation**: SRS + wall kicks, so you can rotate against walls, the floor, and overhangs.
- **Lock delay (500 ms)**: a grounded piece waits half a second before it sets. Moving or
  rotating during that window restarts the timer (so you can **tuck** pieces under overhangs and
  spin into gaps), but only up to **15 times** to prevent infinite stalling. A **hard drop locks
  immediately** — use it when you want speed.
- **Top out**: if a freshly spawned piece cannot fit, you are eliminated.

### Multiplayer & garbage

- **Attack**: clearing `n` lines at once drops **`n - 1`** garbage lines onto **every**
  opponent's stack — `1→0`, `2→1`, `3→2`, **`4` (Tetris) `→3`**. Garbage lines are grey and
  **indestructible**; being shoved off the top is a top-out.
- **Spectrum**: the right-hand **RIVALS** panel shows each opponent's stack silhouette in real
  time, pulses when they are hit, and stamps **KO** when they are eliminated.
- **Winning**: the last survivor sees **VICTORY** (`last-standing`); everyone else sees DEFEAT,
  with final survival rankings on the game-over screen.
- **HUD**: the header shows `ALIVE n/N`; a meter shows incoming garbage.

### Scoring (bonus)

| Line clear | Points (× level) | | T-Spin | Points (× level) |
|---|---|---|---|---|
| Single | 100 | | T-spin | 400 |
| Double | 300 | | T-spin Single | 800 |
| Triple | 500 | | T-spin Double | 1200 |
| **Tetris** | 800 | | T-spin Triple | 1600 |

- **Combo**: consecutive line-clearing locks add `50 × (combo − 1) × level`.
- **Back-to-Back**: chaining Tetrises / T-spins keeps the B2B streak going.
- **Perfect Clear (All Clear)**: emptying the board entirely awards `3500 × level`.
- **Drops**: +1 point per cell soft- or hard-dropped.
- **Level**: increases every 10 lines cleared.
- Final scores are reported to a persistent **leaderboard** shown on the game-over screen.

### Game modes (host picks in the lobby)

| Mode | Description |
|---|---|
| **Classic** | Default. Constant 1 s gravity (the mandatory behaviour). |
| **Invisible** | While playing, the settled stack and ghost are **hidden** — only the active piece shows; memorise your board. The full stack is **revealed on game over**. |
| **Rising** | Gravity drops a big step **every level** (10 lines): **800 → 600 → 400 → 200 → 80 ms** at levels 1–5+ — dramatically faster as you clear. |

### Solo objectives (host picks the **SOLO GOAL** in a one-player lobby)

A solo game has no opponents and no garbage, so by default it only ends when you top out. Pick a
goal to give the run a finish line. Objectives apply to **solo only** — once a rival joins, the win
is always last-standing and the goal is ignored.

| Objective | Goal |
|---|---|
| **Endless** | Default. Survive as long as you can; the run ends only on a top-out. |
| **Sprint** | Clear **40 lines** as fast as possible — a live time-attack clock runs, and finishing shows your time. |
| **Marathon** | Clear **150 lines** to finish. |

On completion a **SPRINT CLEAR! / MARATHON CLEAR!** screen shows your time, lines, level, and score
(and your score is logged to the leaderboard). Top out before the goal and you simply see how far
you got (e.g. `27 / 40 lines`).

### On-screen layout

- **Left**: HOLD slot, the solo Sprint/Marathon timer (when a goal is set), plus LINES / LEVEL / SCORE.
- **Centre**: the board with ghost; line-clear popups (`SINGLE`…`TETRIS`, `COMBO ×n`, `B2B`,
  `ALL CLEAR`, `T-SPIN`), a `3-2-1-GO` countdown, and a red danger vignette near the top.
- **Right**: the NEXT queue and the RIVALS spectrum panels.
- **Bottom**: a collapsible `CONTROLS` reference.
- **Game over**: survival standings, a crown + VICTORY + confetti for the winner, **PLAY AGAIN**
  (the **winner** relaunches the next round), and the leaderboard.

### Tips

- **T-Spin**: soft-drop a T into a T-slot, then **rotate it in** and let it lock — the last
  action must be a rotation to count. Worth a big bonus.
- **Tuck**: slide a piece under an overhang within the 500 ms lock-delay window.
- **Pressure opponents**: send three lines at once with a Tetris, and stack Combo / B2B for more.
- Use **hard drop** (Space) for speed and **soft drop** (↓) plus nudges for precise placement.

---

## Getting started

```bash
cp .env.example .env      # adjust PORT / CLIENT_ORIGIN if needed
npm install
npm run dev               # server (:3000) + client dev (:5173) together
```

Then open `http://localhost:5173/<room>/<player>`.

### Production

```bash
npm run build             # shared -> client (bundle.js) -> server
npm start                 # Express serves the built client on PORT
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Run server + client in watch mode |
| `npm run build` | Build all packages in dependency order |
| `npm start` | Serve the production build |
| `npm test` | Run the full Vitest suite |
| `npm run coverage` | Run tests with coverage (gate: ≥70% statements/functions/lines, ≥50% branches) |
| `npm run typecheck` | `tsc -b` across all packages |
| `npm run lint` | ESLint (enforces the no-`this` client rule) |
| `npm run format` | Prettier |

## Layout

```
packages/shared   pure, framework-agnostic: tetrominoes, types, protocol, rng, constants
packages/server   OOP authority: models, socket handlers, HTTP static serving
packages/client   functional SPA: pure engine, Redux store, hooks, components
```

See `docs/IMPLEMENTATION_PLAN.md` for the full design and `docs/DESIGN_NOTES.md` for detail.
