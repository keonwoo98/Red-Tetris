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

Each field is **10 columns × 20 rows**. Pieces fall at a constant speed and become immobile
only on the next frame (last-moment adjustments). Clearing `n` lines sends **`n - 1`
indestructible penalty lines** to every opponent's bottom. Players see opponents' names and a
real-time **spectrum** (each column's highest block). There is **no scoring** — the **last
player standing wins**. Solo and multiplayer are both supported.

Join via URL: `http://<host>:<port>/<room>/<player_name>`. The first player to join a room is
the **host** (controls start/restart); if the host leaves, the role migrates. No new players
may join once a round has started.

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
