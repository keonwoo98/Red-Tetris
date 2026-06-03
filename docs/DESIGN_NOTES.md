# Red Tetris — Design Notes (planning-workflow appendix)

> Auto-generated supporting detail from the multi-agent planning workflow.
> The authoritative, deduplicated spec is `IMPLEMENTATION_PLAN.md`. Use this file
> for deeper per-subsystem rationale and the raw adversarial-review findings.

## A. Verified Foundations (stack / tetris correctness / spec compliance)

### Red Tetris — npm-workspaces monorepo stack & tooling (2026, concrete configs)
## 0. Confirmed current major versions (verified June 2026)

| Package | Pin (package.json) | Resolves to | Notes / gotcha |
|---|---|---|---|
| Node.js | engines `>=20.19` | 24.6.0 local | Vite 7 requires Node **20.19+ / 22.12+** (drops 18). CI/eval box may be Node 20 — pin engines to 20.19 not 24. |
| npm | `>=10` | 11.5.1 local | npm workspaces native; no Lerna/pnpm needed. |
| TypeScript | `~5.9.0` | 5.9.x | `verbatimModuleSyntax` + `erasableSyntaxOnly` available. Use `moduleResolution: "bundler"`. |
| Vite | `^7.1.0` | 7.x | **Do NOT jump to Vite 8**: it renames `build.rollupOptions` → `build.rolldownOptions`. Our `entryFileNames:'bundle.js'` snippet is for the `rollupOptions` API (Vite 7). |
| @vitejs/plugin-react | `^5.0.0` | 5.x | Vite 7 compatible. |
| Vitest | `^3.2.0` | 3.2.x | `workspace` config field is **deprecated → renamed `projects`** (define inside root `vitest.config.ts` under `test.projects`). v8 coverage now AST-remapped (Istanbul-accurate). |
| @vitest/coverage-v8 | `^3.2.0` | must match Vitest exactly | Version must equal vitest version or it refuses to run. |
| React / react-dom | `^19.1.0` | 19.x | New JSX transform; `react-dom/client` `createRoot`. |
| @types/react / -dom | `^19.1.0` | 19.x | |
| react-router-dom | `^7.16.0` | 7.16.x | Use **Declarative mode** (`<BrowserRouter>`) — spec literally requires BrowserRouter. Do NOT adopt framework/data mode. RR7 ships as a single `react-router` pkg but `react-router-dom` still re-exports `BrowserRouter`, `Routes`, `Route`, `useParams`. |
| @reduxjs/toolkit | `^2.12.0` | 2.12.x | RTK 2 = ESM-first; needs `react-redux` 9. |
| react-redux | `^9.3.0` | 9.3.x | Requires React 18+ (OK with 19). |
| express | `^5.1.0` | 5.x | **Express 5 gotchas:** path-to-regexp v8 — bare `'*'` wildcard is INVALID, must be a *named* splat `'/*splat'` or use a middleware (no path) for SPA fallback; `app.del` removed (use `app.delete`); rejected promises in async handlers now forwarded to error middleware automatically. |
| socket.io | `^4.8.0` | 4.8.x | `new Server(httpServer, opts)`. CORS must be set explicitly in dev. |
| typescript-eslint | `^8.39.0` | 8.x | Flat-config only API (`tseslint.config(...)`). |
| eslint | `^9.30.0` | 9.x | Flat config (`eslint.config.js`) is the default. |
| prettier | `^3.6.0` | 3.x | |
| @testing-library/react | `^16.3.0` | 16.x | RTL 16 supports React 19. |
| @testing-library/jest-dom | `^6.6.0` | 6.x | Import `@testing-library/jest-dom/vitest` in setup. |
| jsdom | `^26.0.0` | 26.x | client test env. |
| vite-tsconfig-paths | `^5.1.0` | 5.x | lets Vite + Vitest read `@shared/*` from tsconfig (single source of truth — avoids drift vs manual resolve.alias). |
| tsx | `^4.20.0` | 4.x | dev runner for the TS server (`tsx watch`). |
| concurrently | `^9.2.0` | 9.x | run server + client dev together. |

---

## 1. Root `package.json` (workspaces + unified scripts)

```json
{
  "name": "red-tetris",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20.19", "npm": ">=10" },
  "workspaces": ["packages/shared", "packages/server", "packages/client"],
  "scripts": {
    "dev": "concurrently -n server,client -c blue,magenta \"npm run dev -w packages/server\" \"npm run dev -w packages/client\"",
    "build": "npm run build -w packages/shared && npm run build -w packages/client && npm run build -w packages/server",
    "start": "node packages/server/dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "coverage": "vitest run --coverage",
    "typecheck": "tsc -b",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.0",
    "@types/express": "^5.0.0",
    "@types/node": "^24.0.0",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^5.0.0",
    "@vitest/coverage-v8": "^3.2.0",
    "concurrently": "^9.2.0",
    "eslint": "^9.30.0",
    "eslint-config-prettier": "^10.1.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.20",
    "jsdom": "^26.0.0",
    "prettier": "^3.6.0",
    "tsx": "^4.20.0",
    "typescript": "~5.9.0",
    "typescript-eslint": "^8.39.0",
    "vite": "^7.1.0",
    "vite-tsconfig-paths": "^5.1.0",
    "vitest": "^3.2.0"
  }
}
```
Notes: `start` runs the compiled server, which serves the prebuilt client `dist`. `build` order matters: shared → client (server static-serves client dist) → server. Test/lint/coverage run **once at root** across all workspaces (Vitest `projects` + ESLint flat config handle the split). The root holds all shared devDeps; each package's `package.json` carries only its runtime deps (server: express, socket.io, @shared; client: react, react-dom, react-router-dom, @reduxjs/toolkit, react-redux, @shared).

`packages/shared/package.json` (consumed by both via the workspace symlink):
```json
{
  "name": "@red-tetris/shared",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } },
  "scripts": { "build": "tsc -b" }
}
```
(The `@shared/*` path alias is for source-level dev/test; the package `exports` is for the built server consuming compiled shared code in production `npm start`.)

`packages/server/package.json`:
```json
{
  "name": "@red-tetris/server",
  "type": "module",
  "scripts": { "dev": "tsx watch src/index.ts", "build": "tsc -b" },
  "dependencies": { "express": "^5.1.0", "socket.io": "^4.8.0", "@red-tetris/shared": "*" }
}
```

`packages/client/package.json`:
```json
{
  "name": "@red-tetris/client",
  "type": "module",
  "scripts": { "dev": "vite", "build": "vite build", "preview": "vite preview" },
  "dependencies": {
    "@reduxjs/toolkit": "^2.12.0", "react": "^19.1.0", "react-dom": "^19.1.0",
    "react-redux": "^9.3.0", "react-router-dom": "^7.16.0", "@red-tetris/shared": "*"
  }
}
```

---

## 2. Client `vite.config.ts` — emits `index.html` + `bundle.js` (no hash)

```ts
// packages/client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // exact spec filename, no content hash
        entryFileNames: 'bundle.js',
        // keep CSS/asset names deterministic too (no hash)
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]',
        // CRITICAL: force everything into ONE bundle so a single <script src="bundle.js"> is emitted
        manualChunks: undefined,
        inlineDynamicImports: true,
      },
    },
  },
  server: {
    port: 5173,
    // dev-only: forward socket.io + REST to the Express server
    proxy: {
      '/socket.io': { target: 'http://localhost:3000', ws: true },
      '/api': { target: 'http://localhost:3000' },
    },
  },
});
```
Gotchas:
- `entryFileNames:'bundle.js'` alone is NOT enough — Vite would still code-split (vendor chunk etc.) producing extra hashed files and multiple `<script>` tags. `inlineDynamicImports:true` + `manualChunks:undefined` collapses everything into one `bundle.js`, satisfying the spec's literal "bundle.js". (If you later need code-splitting for bonus, drop these two lines and accept multiple chunks.)
- `index.html` lives at `packages/client/index.html` (Vite root); `vite build` rewrites its `<script type="module" src="/src/main.tsx">` to `<script type="module" src="/bundle.js">` automatically. Express then serves `dist/index.html` + `dist/bundle.js`.
- Vite 7 keeps `build.rollupOptions`. On Vite 8 this block must move under `build.rolldownOptions` — do not upgrade blindly.

---

## 3. Express 5 + socket.io 4 on one HTTP server (static + SPA fallback)

```ts
// packages/server/src/index.ts
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);
const isDev = process.env.NODE_ENV !== 'production';

const app = express();
const httpServer = createServer(app);          // single HTTP server
const io = new Server(httpServer, {
  cors: isDev ? { origin: 'http://localhost:5173', methods: ['GET', 'POST'] } : {},
});

// --- static client (built output served by Express in prod) ---
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist)); // serves index.html, bundle.js, assets

// --- SPA fallback: deep links /:room/:player must return index.html ---
// Express 5 / path-to-regexp v8: bare '*' is INVALID. Use a NAMED splat.
app.get('/*splat', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// --- socket.io ---
io.on('connection', (socket) => {
  socket.on('disconnect', () => {/* RoomManager.handleLeave(...) */});
});

httpServer.listen(PORT, () => console.log(`Red Tetris on http://localhost:${PORT}`));
export { app, io };
```
Express 5 gotchas (these WILL break a naive copy from Express 4 tutorials):
- **Wildcard syntax changed.** `app.get('*', ...)` throws `TypeError: Missing parameter name` under Express 5 (path-to-regexp v8). Use `app.get('/*splat', ...)` (named) or `app.use((req,res)=>...)` as a no-path catch-all placed AFTER `express.static`. Either resolves `/:room/:player` deep links to `index.html` for BrowserRouter.
- Put `express.static` **before** the fallback so real files (`/bundle.js`) win over the HTML fallback.
- socket.io shares the same `httpServer` — it intercepts the `/socket.io/` upgrade path; no separate port. In dev the client hits Vite (5173) and the `vite.config` proxy forwards `/socket.io` (with `ws:true`) to 3000, so `cors.origin` only matters for non-proxied direct connections — keep it set for safety.
- Don't `app.use(express.json())` globally unless you add REST routes; socket.io carries game traffic.

---

## 4. Vitest — root config with `projects` (node for server/shared, jsdom for client)

Single root `vitest.config.ts` (coverage is workspace-global — it MUST live in the root config, project-level coverage is ignored):

```ts
// vitest.config.ts (repo root)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Vitest 3.2: `projects` replaces the deprecated `workspace` file
    projects: [
      {
        // server + shared: node env, OOP classes
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['packages/{server,shared}/**/*.{test,spec}.ts'],
        },
      },
      {
        // client: jsdom + RTL
        extends: true,
        plugins: [
          // resolve @shared/* in client tests
          (await import('vite-tsconfig-paths')).default(),
        ],
        test: {
          name: 'client',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./packages/client/vitest.setup.ts'],
          include: ['packages/client/**/*.{test,spec}.{ts,tsx}'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['packages/*/src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.{test,spec}.*', '**/dist/**', '**/*.d.ts',
        '**/index.ts',           // barrel files
        'packages/client/src/main.tsx',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        statements: 70,
        branches: 50,
      },
    },
  },
});
```

Client setup file:
```ts
// packages/client/vitest.setup.ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(() => cleanup());
```
Notes:
- `projects` is the **Vitest 3.2 rename** of the old `vitest.workspace.ts` — keeping it inside `test.projects` avoids a second file. Each project sets its own `environment`. `globals:true` only on the client (so RTL's auto-cleanup + `expect` extensions read naturally); server tests can stay explicit-import.
- v8 provider in 3.2 is AST-remapped → coverage numbers match Istanbul, so 70/70/70/50 thresholds are trustworthy.
- Run from root: `vitest run --coverage`. Aggregates across both projects into one report — exactly what the eval's 70%/50% gate needs.
- Put your pure game-engine tests (`packages/client/src/engine/*.test.ts`) under the client project (they're pure TS and run fine in jsdom), or add a third pure-node project if you want them in node.

---

## 5. TypeScript — base + project references + `@shared/*` alias

`tsconfig.base.json` (root):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2023"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "composite": true,
    "baseUrl": ".",
    "paths": { "@shared/*": ["packages/shared/src/*"] }
  }
}
```

Root solution `tsconfig.json` (orchestrates `tsc -b`):
```json
{
  "files": [],
  "references": [
    { "path": "packages/shared" },
    { "path": "packages/server" },
    { "path": "packages/client" }
  ]
}
```

`packages/shared/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src"]
}
```

`packages/server/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "types": ["node"]
  },
  "include": ["src"],
  "references": [{ "path": "../shared" }]
}
```

`packages/client/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["vite/client"],
    "noEmit": true
  },
  "include": ["src", "vite.config.ts", "vitest.setup.ts"],
  "references": [{ "path": "../shared" }]
}
```
Notes:
- `composite:true` + `references` enable incremental `tsc -b` (root `npm run typecheck`). Server/client reference shared so editing shared types propagates.
- Path `@shared/*` is declared once in the base; `vite-tsconfig-paths` makes Vite **and** Vitest honor it without a duplicated `resolve.alias` (single source of truth — the documented anti-drift recommendation). The package-level `@red-tetris/shared` import (via workspace symlink + `exports`) is what the **compiled** server uses at `npm start`; use `@shared/*` for dev/test ergonomics, or standardize on the package name everywhere — pick one to avoid two ways of importing the same code.
- `verbatimModuleSyntax` forces `import type` discipline (good with `isolatedModules` + esbuild/tsx). `erasableSyntaxOnly` (TS 5.8+) blocks enums/namespaces that Node's type-stripping and esbuild can't erase — keeps shared code portable.
- Client is `noEmit` (Vite/esbuild transpiles); only shared+server actually emit JS.

---

## 6. ESLint flat config + Prettier (with `this`-ban in client)

`eslint.config.js` (root, flat config, ESM):
```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

const noThis = {
  selector: 'ThisExpression',
  message:
    'SPEC: client code must be functional — `this` is forbidden (only allowed in custom Error subclasses).',
};

export default tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', '**/*.config.{js,ts}'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // ---------- CLIENT: ban `this`, enforce functional style ----------
  {
    files: ['packages/client/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { window: 'readonly', document: 'readonly' },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'warn',
      // HARD SPEC RULE: no `this` anywhere in the browser code
      'no-restricted-syntax': ['error', noThis],
      // reinforce pure-functional engine: no classes either where pure fns required
      'no-invalid-this': 'error',
    },
  },

  // exception: custom Error subclasses may use `this`
  {
    files: ['packages/client/src/**/errors/**/*.ts', 'packages/client/src/**/*.error.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },

  // ---------- SERVER: OOP allowed (classes / this required) ----------
  {
    files: ['packages/server/src/**/*.ts'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } },
    rules: { 'no-restricted-syntax': 'off' },
  },

  // shared = pure, framework-agnostic, also ban `this`
  {
    files: ['packages/shared/src/**/*.ts'],
    rules: { 'no-restricted-syntax': ['error', noThis] },
  },

  prettier, // turn off stylistic rules; Prettier owns formatting
);
```

`.prettierrc.json`:
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

Notes / gotchas:
- The `ThisExpression` selector on `no-restricted-syntax` is the canonical way to forbid `this`; scoped to `packages/client` and `packages/shared` (the pure-function zones), **off** for `packages/server` (OOP required by spec). The error-subclass exception file glob re-enables `this` for `class FooError extends Error { constructor(){ super(); this.name='FooError'; } }`.
- `no-invalid-this` is a defense-in-depth backstop. (`no-restricted-syntax` already catches *all* `this`; if you ever relax it, `no-invalid-this` still catches misuse.)
- Flat config requires ESLint 9 + typescript-eslint 8; `tseslint.config()` gives type-checked composition. `eslint-config-prettier` must be **last** to disable conflicting stylistic rules.
- Run `eslint .` from root — flat config's `files` globs route the right rules per package automatically (no per-package `.eslintrc`).

---

## 7. Cross-cutting breaking-change gotchas (summary checklist)

1. **Vite 7 ≠ 8.** Keep `build.rollupOptions`; Vite 8 renames it to `rolldownOptions`. Pin `^7`.
2. **Single bundle.js** needs `inlineDynamicImports:true` + `manualChunks:undefined`, not just `entryFileNames`.
3. **Express 5 wildcard:** `'*'` is illegal; use `'/*splat'` or a no-path `app.use` fallback, placed AFTER `express.static`, for BrowserRouter deep links.
4. **Vitest 3.2:** `workspace` → `projects`; coverage config only valid at root, not per-project.
5. **@vitest/coverage-v8 version must exactly match vitest.**
6. **React Router 7:** use Declarative `<BrowserRouter>` (spec mandate); do NOT migrate to data/framework mode.
7. **RTK 2 / react-redux 9** are ESM-first and need React 18+ (fine on 19).
8. **TS `erasableSyntaxOnly`** bans enums/namespaces — keep shared/client code enum-free (use `as const` unions), which also keeps the engine pure.
9. **Node engines pin 20.19**, not 24 — eval machine may run Node 20; Vite 7 minimum is 20.19.


_Decisions:_ Pin Vite to ^7 (not 8): Vite 8 renames build.rollupOptions -> build.rolldownOptions, which would break the bundle.js output config. The entryFileNames:'bundle.js' approach is a rollupOptions API.; Force a single bundle.js via inlineDynamicImports:true + manualChunks:undefined in addition to entryFileNames, because entryFileNames alone still lets Vite emit extra hashed vendor chunks and multiple <script> tags — violating the spec's literal bundle.js requirement.; Use Vitest 3.2 `projects` (inside root vitest.config.ts) instead of the deprecated `vitest.workspace.ts` file; node env for server+shared, jsdom+RTL for client. Coverage lives only at root (project-level coverage is ignored by Vitest).; Coverage thresholds set to lines/functions/statements 70 and branches 50 exactly per spec; rely on v8 provider's 3.2 AST remapping (Istanbul-accurate) so numbers are trustworthy.; Enforce the spec's no-`this` client rule via ESLint flat-config no-restricted-syntax with selector 'ThisExpression', scoped to packages/client and packages/shared, OFF for packages/server (OOP required), with a glob exception re-enabling `this` for custom Error subclasses.; Express 5 SPA fallback uses the named splat route '/*splat' (or no-path app.use) placed after express.static, because bare '*' throws under path-to-regexp v8 in Express 5.; Single source of truth for the @shared/* alias: declared once in tsconfig.base.json and consumed by both Vite and Vitest through vite-tsconfig-paths, avoiding manual resolve.alias drift. TypeScript project references (composite:true) wire shared -> server/client for incremental tsc -b.; Node engines pinned to >=20.19 (not 24) so the 42 eval machine on Node 20 still satisfies Vite 7's minimum; local dev on 24.6.0 is a superset.; React Router 7 used in Declarative mode (<BrowserRouter>) per the explicit spec requirement; framework/data mode deliberately avoided.; All shared devDependencies hoisted to root package.json; each workspace package carries only runtime deps. Single root commands (vitest run, eslint ., tsc -b) operate across all workspaces.
_Risks:_ Vite 8 may be released/installed by a loose ^7 range mistake or a fresh `npm install vite`; if so the rollupOptions block silently stops applying (renamed to rolldownOptions) and bundle.js stops being emitted with the right name. Mitigation: hard-pin ^7.1.0 and add a smoke test asserting dist/bundle.js exists post-build.; Express 5 path-to-regexp v8 throws at startup (not lint time) on a bare '*' route copied from Express 4 tutorials — server won't boot. Mitigation: use '/*splat' or no-path app.use, documented above.; @vitest/coverage-v8 drifting out of lockstep with vitest (e.g. 3.2 vs 3.3) causes Vitest to refuse to run coverage. Mitigation: pin both to the same ^3.2.0 and dedupe in lockfile.; The no-restricted-syntax ThisExpression ban is AST-based and also fires on legitimate `this` inside custom Error subclasses; the error-file glob exception must actually match where error classes live, or developers will be blocked. Mitigation: keep error classes under a predictable path (errors/ or *.error.ts) matching the override glob.; vite-tsconfig-paths must be added to BOTH the Vite build config and the Vitest client project, or @shared imports resolve in the app but fail in tests (or vice versa). Both are wired above; omitting either breaks one surface.; erasableSyntaxOnly will hard-error on any TS enum/namespace in shared or client code; teammates accustomed to enums will hit compile errors. Mitigation: use `as const` union objects for tetromino/cell constants.; RR7 ships type generation for framework mode; staying in declarative mode means no generated route types — useParams() is loosely typed (Record<string,string|undefined>). Mitigation: validate/parse room+player params manually since they come from untrusted URLs.

---

### Red Tetris — Exact Tetromino Mechanics & Determinism Specification (v1.0, spec 5.2 compliant)
# Red Tetris — Tetris Correctness Authority

This document defines exact, unambiguous, test-driven mechanics. All coordinates use a **board coordinate system** where `(x, y)` = `(column, row)`, origin `(0,0)` at **top-left**, `x` increases rightward `0..9`, `y` increases **downward** `0..19`. The board is `WIDTH=10`, `HEIGHT=20`. A "cell" is `null` (empty) or a non-empty value (color id / penalty marker).

All data below is intended to live in `packages/shared/` as pure, framework-agnostic TS so the server (authoritative simulation) and client (rendering + optimistic prediction) share one source of truth.

---

## 0. Decision: SRS (Super Rotation System) — CHOSEN

**Verdict: implement SRS (Super Rotation System), the official Tetris Guideline rotation system.**

Justification vs. simple naive matrix rotation:
| Criterion | Simple matrix rotation | SRS (chosen) |
|---|---|---|
| Spec fidelity ("original Tetrimino shapes and rotation rules") | Partial — shapes ok, but no wall kicks; pieces clip walls/floor unnaturally | Full — SRS *is* the modern canonical "original rotation rules" referenced by the Tetris Guideline and the Wikipedia "Tetris" article the spec cites |
| Determinism | Deterministic | Deterministic (kick tables are fixed lookup data — no randomness) |
| Testability | Easy | Easy — every kick is a table lookup; each `(piece, from→to, kickIndex)` is a pure assertion |
| Rotation center behavior matching the spec's rotation chart (4 states per piece, O does not move) | Approximate | Exact: O has 1 effective state, I/J/L/S/T/Z have 4 |
| Implementation cost | Lower | Moderate (two small constant tables) — fully bounded, no edge ambiguity |

SRS is **more testable**, not less: it replaces ambiguous "what happens when rotation overlaps a wall" with a finite, enumerable list of 5 candidate offsets per rotation, the first valid one winning. That determinism is exactly what unit tests need.

We store each piece as **explicit per-rotation cell coordinate sets** inside a bounding box (I/O in 4×4, JLSTZ in 3×3). Rotation at runtime is a **table lookup** (precomputed states), NOT live matrix math — this removes all rounding/pivot ambiguity and makes every rotation a deterministic constant. SRS wall kicks are applied as a translation `(dx,dy)` to the looked-up rotated shape.

---

## 1. The 7 Tetrominoes — Canonical Colors + All Rotation States

### 1.1 Canonical colors (Tetris Guideline standard, matches the spec's colored chart image)

| Piece | Name | Color name | Hex | Color id (int) |
|---|---|---|---|---|
| I | I-piece | Cyan | `#00FFFF` | 1 |
| O | O-piece | Yellow | `#FFFF00` | 2 |
| T | T-piece | Purple | `#A000F0` | 3 |
| S | S-piece | Green | `#00F000` | 4 |
| Z | Z-piece | Red | `#F00000` | 5 |
| J | J-piece | Blue | `#0000F0` | 6 |
| L | L-piece | Orange | `#F0A000` | 7 |
| (penalty) | indestructible line | Gray | `#808080` | 8 / sentinel `PENALTY` |
| (empty) | — | — | — | `0` / `null` |

Rotation state index: `0 = spawn (R0)`, `1 = R (clockwise / 90° CW)`, `2 = 2 (180°)`, `3 = L (counter-clockwise / 270° CW)`. Up-arrow input = rotate CW = `state → (state+1) mod 4`. (We implement CW only for the mandatory part; CCW is trivial to add.)

### 1.2 Coordinate data — `(x, y)` offsets occupied, within the piece's bounding box

Below, each rotation state lists the 4 occupied cells as `(col, row)` inside the bounding box. The box's top-left is placed on the board at the piece's `(originX, originY)`; an occupied board cell = `(originX + col, originY + row)`.

**I-piece (4×4 box):**
```
state 0 (spawn):  (0,1) (1,1) (2,1) (3,1)        . . . .
                                                  X X X X
                                                  . . . .
                                                  . . . .
state 1 (R):      (2,0) (2,1) (2,2) (2,3)        . . X .
                                                  . . X .
                                                  . . X .
                                                  . . X .
state 2 (180):    (0,2) (1,2) (2,2) (3,2)        . . . .
                                                  . . . .
                                                  X X X X
                                                  . . . .
state 3 (L):      (1,0) (1,1) (1,2) (1,3)        . X . .
                                                  . X . .
                                                  . X . .
                                                  . X . .
```

**O-piece (4×4 box; never rotates effectively — all 4 states identical):**
```
all states:       (1,1) (2,1) (1,2) (2,2)        . . . .
                                                  . X X .
                                                  . X X .
                                                  . . . .
```

**T-piece (3×3 box):**
```
state 0:  (1,0) (0,1) (1,1) (2,1)    . X .      state 1:  (1,0) (1,1) (2,1) (1,2)    . X .
                                      X X X                                            . X X
                                      . . .                                            . X .
state 2:  (0,1) (1,1) (2,1) (1,2)    . . .      state 3:  (1,0) (0,1) (1,1) (1,2)    . X .
                                      X X X                                            X X .
                                      . X .                                            . X .
```

**S-piece (3×3 box):**
```
state 0:  (1,0) (2,0) (0,1) (1,1)    . X X      state 1:  (1,0) (1,1) (2,1) (2,2)    . X .
                                      X X .                                            . X X
                                      . . .                                            . . X
state 2:  (1,1) (2,1) (0,2) (1,2)    . . .      state 3:  (0,0) (0,1) (1,1) (1,2)    X . .
                                      . X X                                            X X .
                                      X X .                                            . X .
```

**Z-piece (3×3 box):**
```
state 0:  (0,0) (1,0) (1,1) (2,1)    X X .      state 1:  (2,0) (1,1) (2,1) (1,2)    . . X
                                      . X X                                            . X X
                                      . . .                                            . X .
state 2:  (0,1) (1,1) (1,2) (2,2)    . . .      state 3:  (1,0) (0,1) (1,1) (0,2)    . X .
                                      X X .                                            X X .
                                      . X X                                            X . .
```

**J-piece (3×3 box):**
```
state 0:  (0,0) (0,1) (1,1) (2,1)    X . .      state 1:  (1,0) (2,0) (1,1) (1,2)    . X X
                                      X X X                                            . X .
                                      . . .                                            . X .
state 2:  (0,1) (1,1) (2,1) (2,2)    . . .      state 3:  (1,0) (1,1) (0,2) (1,2)    . X .
                                      X X X                                            . X .
                                      . . X                                            X X .
```

**L-piece (3×3 box):**
```
state 0:  (2,0) (0,1) (1,1) (2,1)    . . X      state 1:  (1,0) (1,1) (1,2) (2,2)    . X .
                                      X X X                                            . X .
                                      . . .                                            . X X
state 2:  (0,1) (1,1) (2,1) (0,2)    . . .      state 3:  (0,0) (1,0) (1,1) (1,2)    X X .
                                      X X X                                            . X .
                                      X . .                                            . X .
```

### 1.3 Spawn placement (board origin for state 0)
Tetris Guideline spawn: pieces spawn horizontally, centered, occupying columns 3–6 (I) or 3–5 (others), with the visible row at the top.
| Piece | Box | `originX` | `originY` | Resulting occupied board columns (state 0) |
|---|---|---|---|---|
| I | 4×4 | 3 | -1 | cols 3,4,5,6 on board row 0 |
| O | 4×4 | 3 | -1 | cols 4,5 on rows 0,1 |
| T,S,Z,J,L | 3×3 | 3 | -1 | spread across cols 3,4,5 on rows 0/1 |

Using `originY = -1` puts the empty top box-row above the field so the actual blocks appear on board rows `0` (and `1`). If any spawn cell collides immediately → **game over** (§7).

### 1.4 SRS Wall-Kick Tables

Rotation transition notation: `0→R`, `R→2`, `2→L`, `L→0` (CW); offsets are `(dx, dy)` translations **in board coordinates** (`+x` right, `+y` down — note SRS literature uses `+y` up, so signs on the `y` component below are **already converted to y-down**). Try kicks in order; first that yields no collision wins; if all 5 fail, rotation is rejected (piece unchanged).

**JLSTZ wall kicks (T, S, Z, J, L):**
| Transition | k0 | k1 | k2 | k3 | k4 |
|---|---|---|---|---|---|
| 0→R | (0,0) | (-1,0) | (-1,-1) | (0,+2) | (-1,+2) |
| R→0 | (0,0) | (+1,0) | (+1,+1) | (0,-2) | (+1,-2) |
| R→2 | (0,0) | (+1,0) | (+1,+1) | (0,-2) | (+1,-2) |
| 2→R | (0,0) | (-1,0) | (-1,-1) | (0,+2) | (-1,+2) |
| 2→L | (0,0) | (+1,0) | (+1,-1) | (0,+2) | (+1,+2) |
| L→2 | (0,0) | (-1,0) | (-1,+1) | (0,-2) | (-1,-2) |
| L→0 | (0,0) | (-1,0) | (-1,+1) | (0,-2) | (-1,-2) |
| 0→L | (0,0) | (+1,0) | (+1,-1) | (0,+2) | (+1,+2) |

**I wall kicks:**
| Transition | k0 | k1 | k2 | k3 | k4 |
|---|---|---|---|---|---|
| 0→R | (0,0) | (-2,0) | (+1,0) | (-2,+1) | (+1,-2) |
| R→0 | (0,0) | (+2,0) | (-1,0) | (+2,-1) | (-1,+2) |
| R→2 | (0,0) | (-1,0) | (+2,0) | (-1,-2) | (+2,+1) |
| 2→R | (0,0) | (+1,0) | (-2,0) | (+1,+2) | (-2,-1) |
| 2→L | (0,0) | (+2,0) | (-1,0) | (+2,-1) | (-1,+2) |
| L→2 | (0,0) | (-2,0) | (+1,0) | (-2,+1) | (+1,-2) |
| L→0 | (0,0) | (+1,0) | (-2,0) | (+1,+2) | (-2,-1) |
| 0→L | (0,0) | (-1,0) | (+2,0) | (-1,-2) | (+2,+1) |

**O piece:** no kicks; rotation is a no-op (shape identical in all states). Treat `rotate(O)` as returning the same state (state index may still increment but rendering is unchanged — recommend keeping O state = 0 always).

For the mandatory part we only use CW (`0→R→2→L→0`). The CCW rows (`0→L`, `L→2`, `2→R`, `R→0`) are included for completeness/bonus and are the standard inverses.

Pure rotation function signature:
```ts
// returns the new piece state if rotation succeeds (with kick applied), else null
function tryRotateCW(board: Board, piece: ActivePiece): ActivePiece | null
// ActivePiece = { type: PieceType; rotation: 0|1|2|3; x: number; y: number }
// internally: nextRot = (rotation+1)&3; cells = SHAPES[type][nextRot];
//   for kick of KICKS[kickSetOf(type)][`${rotation}>${nextRot}`]:
//     candidate = { ...piece, rotation: nextRot, x: piece.x+kick.dx, y: piece.y+kick.dy }
//     if (!collides(board, candidate)) return candidate
//   return null
```

---

## 2. Deterministic Piece Generation

### 2.1 PRNG: **mulberry32** (CHOSEN)

Recommended over xoshiro128 for this project: single 32-bit state (trivially serializable in a socket message as one number), tiny, fast, well-distributed for shuffle use, and the canonical reference implementation is unambiguous so server and client produce bit-identical output. xoshiro128** is higher quality statistically but needs a 4×32-bit state and SplitMix seeding — unnecessary complexity for piece shuffling.

```ts
// packages/shared/rng.ts — PURE, deterministic, framework-agnostic
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;            // force uint32
  return function next(): number {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;  // [0,1)
  };
}
```
Returns a float in `[0,1)`. Identical seed ⇒ identical infinite stream on any JS engine (uses only `Math.imul`, integer ops, and `>>> 0` — all IEEE-754/ECMAScript-defined, no platform variance).

### 2.2 7-bag shuffle (Tetris Guideline "Random Generator")

Each "bag" is a permutation of the 7 piece types `[I,O,T,S,Z,J,L]`. Bags are produced one after another; within a bag every piece appears exactly once → guarantees fair distribution and bounded droughts (max gap between two of the same piece = 12).

```ts
export const PIECE_ORDER = ['I','O','T','S','Z','J','L'] as const; // canonical base order — MUST be fixed
export function shuffleBag(rand: () => number): PieceType[] {
  const bag = [...PIECE_ORDER];
  for (let i = bag.length - 1; i > 0; i--) {     // Fisher–Yates, exact
    const j = Math.floor(rand() * (i + 1));      // 0..i inclusive
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}
```
The base order `PIECE_ORDER` and the Fisher–Yates direction (`i` from high to low, `j ∈ [0,i]`) are **part of the contract** — changing either changes every sequence. Lock them with a test.

### 2.3 Index-based accessor `pieceAt(seed, index)` (late joiners / replays)

A game's entire piece stream is a pure function of `(seed, index)`. We do NOT store streams per-player; everyone derives identically from the single shared `seed`.

```ts
const BAG_SIZE = 7;
export function pieceAt(seed: number, index: number): PieceType {
  const bagIndex = Math.floor(index / BAG_SIZE);   // which bag
  const inBag    = index % BAG_SIZE;               // position within bag
  // Re-seed deterministically per bag so any bag is computable in O(1) bags,
  // without materializing all prior bags. Seed offset is a pure function of bag #.
  const bagSeed = (seed + Math.imul(bagIndex, 0x9E3779B1)) >>> 0; // golden-ratio constant
  const rand = mulberry32(bagSeed);
  const bag = shuffleBag(rand);
  return bag[inBag];
}
```
Properties:
- `pieceAt(seed, i)` depends only on `seed` and `i` → **stateless, idempotent, order-independent**.
- A client joining mid-replay at piece `k` computes the same `k`th piece any other client computed.
- The server picks ONE random `seed` (e.g. `(Math.random()*2**32)>>>0`) when the room's game starts and broadcasts it in the `game:start` event. From then on, no piece data is ever sent over the wire — only the seed. This satisfies "every player must receive the same pieces in the same positions and coordinates — even if at different times."

Optional convenience for streaming consumers (client keeps a cursor `index` and calls `pieceAt(seed, index++)`).

### 2.4 Determinism proof (sketch)
1. `mulberry32(s)` is a deterministic finite-state automaton over uint32 state using only ECMAScript-specified integer operations ⇒ same `s` ⇒ same stream on every conformant engine. ∎(PRNG)
2. `shuffleBag(rand)` consumes a fixed number (6) of `rand()` calls in a fixed order over a fixed base array ⇒ same `rand` stream ⇒ same permutation. ∎(bag)
3. `pieceAt(seed, i)` computes `bagSeed` as a pure arithmetic function of `(seed, ⌊i/7⌋)` and indexes the resulting bag at `i mod 7` ⇒ no hidden state, no time/ordering dependence. ∎(accessor)
4. Therefore for any two clients A,B sharing `seed`: `∀i, pieceAt_A(seed,i) === pieceAt_B(seed,i)`. The piece *content* is identical; spawn *position/coordinates* (§1.3) are constants per type ⇒ identical placement too. ∎

Unit-test the proof: assert `pieceAt(42, i)` equals a hardcoded golden sequence for `i ∈ [0,20]`; assert each consecutive 7-window is a permutation of the 7 types.

---

## 3. Lock-Delay State Machine ("immobile only on the next frame")

The spec: *"Once a piece touches the pile, it becomes immobile only on the next frame — allowing last-moment adjustments."* This is a **one-frame lock grace**, NOT the modern 500ms infinite lock delay. We implement it exactly and deterministically.

### 3.1 States
- `FALLING`: piece is above empty space; gravity applies.
- `GROUNDED`: piece is resting (moving down by 1 would collide) but has NOT yet locked. The piece spent the **current frame** grounded; on the **next frame's** lock check it will lock unless it became un-grounded.
- `LOCKED`: piece merged into the board (terminal for this piece).

### 3.2 Exact rule (frame-stepped)
Let `grounded(p)` ≡ `collides(board, moveDown(p))`. Each gravity tick / frame step:

```
on each gravity tick:
  if grounded(piece):
     if piece.wasGroundedLastFrame:        // it has now been grounded across a frame boundary
         LOCK(piece)                        // merge → clear lines → spawn next
     else:
         piece.wasGroundedLastFrame = true  // grant the one-frame grace; stay GROUNDED
  else:
     piece.y += 1                            // normal fall
     piece.wasGroundedLastFrame = false
```

Player input (Left/Right/rotate) is processed between ticks and is allowed while `GROUNDED`. **Re-arm rule (explicit):** if a successful move/rotate causes the piece to become **not grounded** (now has space below), `wasGroundedLastFrame` resets to `false` automatically (it gets recomputed next tick) — the piece resumes `FALLING`. If a move/rotate keeps it grounded, the grace flag is **NOT** re-armed merely by moving — it still locks on the next tick. This gives precisely "one frame of last-moment adjustment," matching the spec literally and bounding the game (no infinite stalling). Hard drop (§4) bypasses this and locks immediately.

This is deterministic: locking depends only on `(board, piece, wasGroundedLastFrame)` and tick count — no wall-clock time inside the rule.

---

## 4. Gravity, Soft Drop, Hard Drop, Line Clear

### 4.1 Timing constants (`packages/shared/constants.ts`)
| Constant | Value | Meaning |
|---|---|---|
| `BOARD_WIDTH` | 10 | columns |
| `BOARD_HEIGHT` | 20 | rows |
| `GRAVITY_MS` | 1000 | ms per 1-row fall at level 0 (constant speed, mandatory) |
| `SOFT_DROP_FACTOR` | 20 | soft-drop is 20× faster ⇒ effective 50 ms/row while Down held |
| `LOCK_GRACE_FRAMES` | 1 | the one-frame grace (§3) |
| `SPAWN_X` (JLSTZ) | 3 | spawn originX |
| `SPAWN_X` (I,O) | 3 | spawn originX |
| `SPAWN_Y` | -1 | spawn originY |

Mandatory part = **constant speed** (`GRAVITY_MS = 1000`, no level acceleration). The server is the authority on the gravity clock; it advances each game's tick on a `setInterval`/loop and emits state. (Increased gravity is an explicit BONUS mode.)

### 4.2 Soft drop (Down arrow)
While held, gravity interval shortens to `GRAVITY_MS / SOFT_DROP_FACTOR = 50 ms/row`. Each soft-drop step moves the piece down 1 if not grounded; if grounded it engages the §3 lock machine normally (soft drop does NOT force an instant lock). No scoring (mandatory). Releasing Down restores `GRAVITY_MS`.

### 4.3 Hard drop (Space)
Pure function: drop the piece to its **ghost** position and lock immediately (bypasses lock grace).
```ts
function hardDrop(board: Board, p: ActivePiece): ActivePiece {
  let q = p;
  while (!collides(board, moveDown(q))) q = moveDown(q);
  return q;  // caller then LOCK()s it this same tick
}
```

### 4.4 Line-clear detection + collapse (pure)
A row is "full" iff every cell is non-empty (including penalty cells — penalty cells DO count toward clearing a line for the player who owns the board? See §5 nuance: penalty lines are *indestructible*, so they are excluded). Define:
```ts
// returns indices of FULL rows that are clearable (i.e., not penalty/indestructible rows)
function fullClearableRows(board: Board): number[]
// collapse: remove those rows, shift everything above DOWN by the count, fill top with empty rows
function clearLines(board: Board): { board: Board; cleared: number }
```
Collapse algorithm: build the new board from rows that are NOT cleared, preserving order; prepend `cleared` empty rows at the top. Gravity-correct (rows above a cleared row fall down). `cleared` (the count `n`) drives penalty sending (§5).

---

## 5. Penalty Lines (attack)

Rule: when a player clears `n` lines, **each opponent** receives `n - 1` indestructible penalty lines at the bottom. (`n=1 → 0`, `n=2 → 1`, `n=3 → 2`, `n=4 (tetris) → 3`.)

### 5.1 Exact construction of a penalty line
- A penalty line is a **full-width row of 10 indestructible cells with NO gap** (value `PENALTY`/`8`). (Note: classic Tetris garbage has one random hole; this spec explicitly says full indestructible lines — we follow the **spec**, no hole.)
- Penalty cells are marked indestructible: `fullClearableRows` MUST exclude any row containing a `PENALTY` cell, so the receiver can **never clear** them.

### 5.2 Applying penalty (pure)
```ts
function addPenaltyLines(board: Board, count: number): Board
// 1. Shift the ENTIRE existing stack UP by `count` rows (the top `count` rows fall off the top).
// 2. Append `count` full PENALTY rows at the BOTTOM (rows HEIGHT-count .. HEIGHT-1).
```
- Pushing the stack up can force existing blocks above `y=0` → they are discarded; if this causes the active piece (or the next spawn) to have no room, it triggers **top-out / game over** (§7) for the receiver. Penalty can therefore kill.
- Timing: penalties are applied **when the receiver's current piece locks** (queued and flushed on lock) OR immediately if the receiver is between pieces — pick "apply immediately on receipt, before next spawn" for simplicity and determinism; document it. The active falling piece's `y` is NOT shifted (only the settled board shifts); if shifting makes the active piece overlap the board, treat as game over on its next lock attempt.

### 5.3 Worked example (n=3 cleared by attacker ⇒ opponent gets 2 lines)
Opponent board bottom before: `[. . X . . . . . . .]` (row 19). After `addPenaltyLines(board, 2)`: everything moves up 2 rows; rows 18 and 19 become `[8 8 8 8 8 8 8 8 8 8]` each; the former row-19 content now sits at row 17.

---

## 6. Spectrum (opponent preview)

Definition: `spectrum: number[]` of length `BOARD_WIDTH (10)`. `spectrum[c]` = the **height of column `c`** = number of rows from the highest filled cell in that column down to the floor, i.e. `BOARD_HEIGHT - (rowIndex of topmost non-empty cell in column c)`. Empty column → `0`.

```ts
function computeSpectrum(board: Board): number[] {
  const spec = new Array(BOARD_WIDTH).fill(0);
  for (let c = 0; c < BOARD_WIDTH; c++) {
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      if (board[r][c] !== EMPTY) { spec[c] = BOARD_HEIGHT - r; break; }
    }
  }
  return spec;
}
```
- Range per entry: `0 .. 20`.
- **When recomputed / broadcast:** after every event that changes the settled board height — i.e. **on every piece lock**, **on line clear**, and **on penalty application**. (NOT on every fall/move tick — the spectrum only reflects the *settled pile*, not the falling piece, so it only changes when the pile changes.) The server computes it from the authoritative board and emits `spectrum:update { playerId, spectrum }` to the room. Opponents render only name + spectrum (column-height bars), never the opponent's actual cells.

---

## 7. Game Over (top-out)

A player tops out **iff a newly spawned piece collides immediately** with the settled board at its spawn position/rotation (state 0, origin from §1.3):
```ts
function isTopOut(board: Board, type: PieceType): boolean {
  const spawn = spawnPiece(type);              // state 0 at SPAWN_X/SPAWN_Y
  return collides(board, spawn);
}
```
On top-out: mark player `alive = false`, freeze their board, stop their gravity loop, broadcast `player:gameover { playerId }`. A penalty-induced upward shift that fills the spawn region is detected here at the next spawn (or earlier if the active piece can no longer move/lock validly). Solo mode: top-out ends the game (player is simultaneously last and loser — game over screen, host may restart).

---

## 8. Last-Man-Standing (win condition)

- Multiplayer: the game ends when **exactly one player remains alive** (all others topped out OR disconnected mid-game). That player is the **winner**. No score.
- Server logic: maintain `alivePlayers: Set<playerId>`. On each `player:gameover` or mid-game disconnect, remove from set. When `alivePlayers.size === 1` (and game has ≥2 starters) → emit `game:over { winnerId }`, freeze all, return room to lobby (host may restart).
- **Solo** (1 starter): there is no "last man standing" survivor benchmark; the game ends on that player's own top-out → emit `game:over { winnerId: null }` (or `winnerId = self` per UI taste) and show final state. The spec explicitly allows single-player and "a game can be played with one player."
- Edge case — simultaneous last two die on the same tick: resolve deterministically by tick order on the server (the one whose top-out is processed *second* is the survivor only if still alive; if both die in the same atomic step, declare a draw `winnerId: null`). Make this a tested branch.

---

## 9. Core shared signatures (contract surface for server + client)

```ts
// packages/shared/types.ts
export type PieceType = 'I'|'O'|'T'|'S'|'Z'|'J'|'L';
export type Rotation = 0|1|2|3;
export type Cell = 0|1|2|3|4|5|6|7|8;        // 0 empty, 1-7 colors, 8 penalty
export type Board = Cell[][];                 // [row][col], 20×10
export interface ActivePiece { type: PieceType; rotation: Rotation; x: number; y: number; grounded?: boolean; }

// packages/shared/tetrominoes.ts
export const SHAPES: Record<PieceType, [number,number][][]>;     // [rotation][4 cells]
export const COLORS: Record<PieceType, Cell>;
export const KICKS_JLSTZ: Record<string,[number,number][]>;      // key 'a>b'
export const KICKS_I: Record<string,[number,number][]>;

// pure engine fns (client packages/client/src/engine + reused logically server-side)
export function collides(board: Board, p: ActivePiece): boolean;
export function merge(board: Board, p: ActivePiece): Board;       // returns new board (immutable)
export function clearLines(board: Board): { board: Board; cleared: number };
export function addPenaltyLines(board: Board, count: number): Board;
export function computeSpectrum(board: Board): number[];
export function pieceAt(seed: number, index: number): PieceType;
export function spawnPiece(type: PieceType): ActivePiece;
```

Authority model: the **server** runs the authoritative simulation (its OOP `Game`/`Player`/`Piece` classes call these pure shared fns); the **client** runs the same pure fns for rendering + optimistic input, then reconciles to server state. Because all randomness flows from one shared `seed` and all transforms are pure table lookups, server and client stay bit-identical.


_Decisions:_ Chose SRS (Super Rotation System) over naive matrix rotation: it is the canonical 'original rotation rules' the spec references, fully deterministic (kick tables are constants), and MORE testable since every rotation/kick is an enumerable table lookup with a first-valid-wins rule.; Store each tetromino as explicit precomputed per-rotation coordinate sets (I/O in 4x4, JLSTZ in 3x3) rather than doing live matrix math at runtime — eliminates pivot/rounding ambiguity and makes each rotation a constant that can be unit-tested directly.; Chose mulberry32 PRNG over xoshiro128: single 32-bit state is trivially serializable as one number in the socket game:start event, the reference implementation is unambiguous across JS engines (only Math.imul + integer ops), and statistical quality is more than sufficient for 7-bag shuffling.; Designed pieceAt(seed,index) as a fully stateless pure function: bagSeed = seed + bagIndex*0x9E3779B1, then mulberry32+Fisher-Yates 7-bag. Any client (late joiner / replay) computes the identical piece at any index from only the shared seed — no per-player stream stored or transmitted.; Used 7-bag (Tetris Guideline Random Generator) for fair distribution with bounded droughts, with PIECE_ORDER base array and Fisher-Yates direction locked as part of the contract.; Interpreted 'immobile only on the next frame' literally as a ONE-frame lock grace (not modern 500ms infinite lock delay): grounded this frame -> lock next tick; re-arm only if a move/rotate makes the piece un-grounded. This bounds the game and matches the spec wording exactly.; Followed the spec's explicit penalty rule precisely: n cleared -> n-1 FULL-WIDTH indestructible lines (NO hole, unlike classic garbage), pushing the existing stack up, never clearable by the receiver, can cause top-out.; Defined spectrum as column height = BOARD_HEIGHT - topmost-filled-row-index (0..20), recomputed only when the settled pile changes (lock, line clear, penalty), not on every fall tick.; Chose y-down board coordinates (0,0 top-left) and pre-converted all SRS kick y-signs from the standard y-up literature to y-down to avoid an entire class of sign bugs.; Mandatory gravity is constant 1000 ms/row (level 0), soft drop 20x (50 ms/row), hard drop instant-lock bypassing grace. Increased gravity is left as the documented BONUS mode.
_Risks:_ SRS y-sign conversion: the kick tables were converted from standard y-up SRS literature to this project's y-down coordinate system. If a developer copies a y-up table from elsewhere, kicks will be wrong. Mitigation: lock the tables with golden unit tests (e.g. T-spin kick cases) and a comment stating coordinates are y-down.; pieceAt re-seeds per bag with a golden-ratio offset rather than streaming one continuous PRNG. This is O(1)-per-bag and order-independent, but it means the global sequence is NOT identical to naively running one mulberry32 stream across bag boundaries. That is fine and intended (still fully deterministic), but any code that mixes the two approaches would diverge — pick ONE accessor (pieceAt) everywhere.; The spec says penalty lines have no gap (full indestructible width). This differs from classic Tetris garbage (one hole). A reviewer familiar with standard Tetris might expect a hole; we follow the spec literally. Confirm with the team/eval that full-width is intended.; One-frame lock grace is much stricter than players expect from modern Tetris (500ms). Soft-dropping or DAS movement could feel like pieces lock 'too fast'. This is a faithful reading of the spec; if playtesting feels bad, raise LOCK_GRACE_FRAMES (still deterministic) — but document any deviation from the literal spec.; Client must NOT use `this`, and the game logic must be pure functions — the shared engine fns are pure, but developers must avoid class-based piece objects on the client. The OOP classes (Player/Piece/Game) live ONLY server-side. Mixing them risks a spec violation that fails evaluation.; Server is the timing authority (gravity loop). Client optimistic prediction must reconcile to server state on each lock; if reconciliation is sloppy, client and server boards could visibly diverge despite shared determinism. Needs a clear reconciliation contract in the networking design (out of scope here but flagged).

---

### Red Tetris — Spec Compliance Matrix (v5.2): Constraint → Design Decision → Peer-Review Verification → Risk/Mitigation
## Context

Repo state at audit time: greenfield. Only `/Users/keokim/42/Red-Tetris/Red Tetris.pdf` exists (untracked); no code, no `package.json`. This matrix is therefore a **design contract**: every row binds a spec constraint to a concrete artifact in the AGREED folder structure that MUST exist for compliance, plus the exact observable check a 42 peer-evaluator runs. Spec text fully read (PDF pp.1-12). Library patterns confirmed via Context7 for socket.io v4 (Express + HTTP static + rooms) and Vitest v8 coverage thresholds.

Verified spec quotes load-bearing for the audit:
- p.5: "Client-side code (browser) must be written without using the `this` keyword... The game logic handling the board and pieces must be implemented using pure functions. The only exception... `this` may be used to define custom subclasses of `Error`."
- p.5: "the server-side code must follow an object-oriented approach using prototypes. At minimum, you should define classes for `Player`, `Piece`, and `Game`."
- p.5: "HTML must not use `<TABLE/>` elements. Layouts must use grid or flexbox." Prohibited: DOM libs (jQuery), Canvas, SVG.
- p.5 & p.10: "Unit tests must cover at least 70% of statements, functions, and lines, and at least 50% of branches." (4 metrics: Statements, Functions, Lines, Branches.)
- p.6: "Each field is 10 columns wide and 20 rows tall." "opponents receive `n - 1` indestructible penalty lines at the bottom." Spectrum = height of each column's highest block, real-time.
- p.7: "There is no scoring system; the last remaining player is the winner. ... solo and multiplayer." Highlighted callout: "Each player in the same game must receive the same pieces in the same positions and coordinates—even if at different times."
- p.7-9: HTTP + socket.io; server serves `index.html`, `bundle.js`, static assets; SPA; URL `http://<server>:<port>/<room>/<player_name>`; BrowserRouter/MemoryRouter.
- p.8: first player = host, controls start/restart; host-leave → migration; "Once started, no new players can join until the next round"; "Games end when one player remains"; "A game can be played with one player"; "Multiple concurrent games are supported."
- p.7: "No data persistence is necessary."
- p.10: red callout — secrets/keys/env vars NOT in repo; use gitignored `.env`; "Exposing secrets will result in project failure."
- p.11: red callout — "Bonus features will only be considered if the mandatory requirements are COMPLETED AND FUNCTIONAL."

---

## COMPLIANCE MATRIX

### 1. Client: NO `this` keyword (functional style)
- **Spec**: p.5 — browser code must not use `this` (Error subclass exception only).
- **Design decision**: All client code under `packages/client/src/**` written as arrow/standalone functions + React function components + Hooks; Redux Toolkit slices use plain reducer functions (no class). Zero class components. `this` permitted ONLY in `packages/client/src/errors/*.ts` for `class XError extends Error`.
- **Enforcement mechanism (critical — this is the auditable control)**: ESLint flat config `packages/client/eslint.config.js` with `no-restricted-syntax` rule banning `ThisExpression`, scoped to `src/**` and **excluding** `src/errors/**` (the Error-subclass exception). Example rule: `{ selector: "ThisExpression", message: "client must not use 'this' (spec p.5)" }`. CI runs `npm run lint` and fails on any hit. Add `no-invalid-this` as secondary.
- **Peer verifies**: (a) `grep -rn "this" packages/client/src --include=*.ts --include=*.tsx | grep -v src/errors` returns nothing meaningful; (b) run `npm run lint -w packages/client` → 0 errors; (c) inspect `eslint.config.js` for the `ThisExpression` ban; (d) confirm only file containing `this` is an Error subclass.
- **Risk → Mitigation**: React 19 + RTK have zero need for `this`, BUT a careless `function` declaration as an event handler or a class accidentally introduces it. **Mitigation**: ESLint `no-restricted-syntax` makes it a hard CI gate, not a convention. Also forbid `class` syntax in client via `no-restricted-syntax` `ClassDeclaration` (except errors dir) to pre-empt.

### 2. Game logic (board + pieces) = PURE FUNCTIONS
- **Spec**: p.5 — board/piece logic must be pure functions.
- **Design decision**: All board/piece logic lives in `packages/client/src/engine/*.ts` and `packages/shared/*.ts` (tetrominoes.ts, rng.ts) as pure functions: `(state, input) => newState`. No mutation (use object/array spread or Immer-free copies), no I/O, no Date.now/Math.random inside engine — RNG is a pure seeded generator in `packages/shared/rng.ts` taking seed→sequence. Signatures e.g.: `spawnPiece(board, piece): Board`, `move(board, piece, dir): {board, piece}`, `rotate(piece, board): Piece`, `lockPiece(board, piece): Board`, `clearLines(board): {board, cleared:number}`, `computeSpectrum(board): number[10]`, `addPenaltyLines(board, n): Board`, `isGameOver(board, piece): boolean`.
- **Peer verifies**: (a) open `packages/client/src/engine/` and `packages/shared/` — confirm every export is a function returning a new value, no `let`-mutation of inputs, no side effects; (b) unit tests in `*.test.ts` assert determinism: same input → same output, input object unchanged after call (referential-integrity assertion); (c) no `import` of React/socket/DOM in engine files (`grep` for them → none).
- **Risk → Mitigation**: Accidental in-place array mutation (e.g., `board[y][x]=...`) breaks purity and Redux immutability. **Mitigation**: freeze inputs in tests (`Object.freeze` deep) so any mutation throws; ESLint `no-param-reassign` ({props:true}); keep engine framework-agnostic so it is trivially unit-testable.

### 3. Server: OOP classes Player, Piece, Game (+ RoomManager)
- **Spec**: p.5 — server OOP via prototypes/classes; at minimum Player, Piece, Game.
- **Design decision**: `packages/server/src/models/Player.ts` (`class Player`: id, name, socketId, board state, isHost, isAlive, spectrum), `Piece.ts` (`class Piece`: type, rotation, x, y, matrix; methods rotated()/cells()), `Game.ts` (`class Game`: room, players[], pieceSequence, seed, status; methods start()/restart()/onLineClear()/broadcastSpectrum()/checkWinner()), `RoomManager.ts` (`class RoomManager`: Map<roomName, Game>; create/get/remove/listGames — backs "multiple concurrent games" + host migration). Methods use `this`; full OO.
- **Peer verifies**: (a) `ls packages/server/src/models/` shows the 4 files; (b) `grep -n "class Player\|class Piece\|class Game\|class RoomManager"` confirms class declarations; (c) tests instantiate and exercise each class; (d) confirm server uses `this`/methods (OO), NOT a bag of standalone functions.
- **Risk → Mitigation**: Temptation to share the pure client engine on the server (DRY) would make the server functional, violating the OO mandate. **Mitigation**: server classes *wrap/own* state and may call shared pure helpers internally, but the public model API MUST be class-based. Audit ensures models are genuine classes with methods, not thin wrappers that are functional in disguise.

### 4. NO Canvas, NO SVG, NO `<table>`
- **Spec**: p.5 — Canvas, SVG, `<TABLE/>` prohibited; no DOM-manipulation libs.
- **Design decision**: Board rendered as nested `<div>` grid in `packages/client/src/components/Board.tsx`; cells are `<div>` colored via CSS class per tetromino. Zero `<canvas>`, `<svg>`, `<table>`. No jQuery / no direct `document.querySelector` DOM manipulation — React owns the DOM.
- **Peer verifies**: (a) `grep -rin "canvas\|<svg\|createElement('canvas')\|<table" packages/client/src` → no matches; (b) check `packages/client/package.json` deps — no jquery / no canvas/svg drawing libs; (c) open browser DevTools on running app → board is `<div>` elements only.
- **Risk → Mitigation**: A charting/animation dependency might pull SVG/Canvas transitively. **Mitigation**: keep rendering dependency-free (plain divs + CSS); deny-list jquery/konva/fabric/d3 in review of `package.json`.

### 5. Layout = CSS grid / flexbox only
- **Spec**: p.5 — layouts must use grid or flexbox.
- **Design decision**: Board uses `display: grid; grid-template-columns: repeat(10, 1fr); grid-template-rows: repeat(20, 1fr)`; page/opponent panels use flexbox. CSS in `packages/client/src/components/*.module.css` (or styled). No floats/tables for layout.
- **Peer verifies**: (a) `grep -rn "display: *grid\|display: *flex\|grid-template" packages/client/src` shows grid/flex; (b) DevTools → board container computed style is `display: grid` with 10×20 tracks; (c) confirm 10 cols × 20 rows visually.
- **Risk → Mitigation**: Minor — none significant. **Mitigation**: snapshot/RTL test asserts board renders exactly 200 cell elements (10×20).

### 6. SPA + BrowserRouter, URL `/<room>/<player_name>`
- **Spec**: p.7 SPA; p.8 URL `http://<server>:<port>/<room>/<player_name>`, BrowserRouter/MemoryRouter.
- **Design decision**: React Router v7 `<BrowserRouter>` in `packages/client/src/main.tsx`; route `path="/:room/:player"` in `packages/client/src/routes/`. `useParams()` reads `{room, player}` and dispatches socket `join`. Single mount point; no full-page reloads.
- **Peer verifies**: (a) navigate browser to `http://localhost:<port>/myroom/alice` → app loads and joins room "myroom" as "alice"; (b) `grep -rn "BrowserRouter\|:room/:player\|useParams" packages/client/src`; (c) confirm only `index.html` + `bundle.js` are fetched (Network tab) — no second HTML.
- **Risk → Mitigation**: BrowserRouter deep-links (`/room/player`) 404 on hard refresh unless the server has an HTML5 history fallback. **Mitigation**: server MUST add catch-all `app.get('*', sendFile(index.html))` AFTER static + socket.io route mounting (see row 7); test by hard-refreshing a deep URL.

### 7. socket.io + HTTP static serving of index.html/bundle.js/assets
- **Spec**: p.7-9 — Node.js server, HTTP + socket.io bidirectional; serve `index.html`, `bundle.js`, static assets.
- **Design decision (verified vs socket.io v4 docs)**: `packages/server/src/index.ts`: `const httpServer = createServer(app); const io = new Server(httpServer, {...}); httpServer.listen(PORT)`. Express serves Vite build output: `app.use(express.static(clientDist))` for `index.html` + `bundle.js` + assets, plus SPA fallback `app.get('*', ...)` ordered last. Socket logic in `packages/server/src/socket/` using socket.io **rooms** (`socket.join(room)`) — one Socket.IO room per game room.
- **Peer verifies**: (a) `curl http://localhost:<port>/` returns `index.html`; `curl .../bundle.js` (or hashed asset) returns JS; (b) DevTools shows a working `ws://.../socket.io/` connection; (c) `grep -n "express.static\|new Server(\|httpServer.listen\|socket.join" packages/server/src` confirms wiring; (d) two browsers in same room exchange real-time events.
- **Risk → Mitigation**: Vite emits hashed asset names (`index-[hash].js`), not literally `bundle.js`; a pedantic evaluator may want `bundle.js`. **Mitigation**: configure Vite `build.rollupOptions.output.entryFileNames = 'bundle.js'` (and disable hashing) so the literal `bundle.js` exists, satisfying the spec wording. Also: mount order — static + socket.io BEFORE the `*` fallback, or fallback shadows assets.

### 8. Deterministic identical piece sequence (same pieces, same positions/coords, even at different times)
- **Spec**: p.7 highlighted callout — every player in a game gets the SAME sequence in the SAME positions/coordinates, even if at different times.
- **Design decision**: Server is the single source of truth. `Game` holds one `seed` (e.g. crypto/random at game start) and a **pure seeded RNG** in `packages/shared/rng.ts` (e.g. mulberry32/xorshift) producing a deterministic 7-bag tetromino sequence. The same seed is sent to every client OR the server streams the identical ordered sequence; both clients and server feed the SAME `rng(seed)` into the SAME pure `spawnPiece` (fixed spawn x/y per type). Sequence is index-addressed so a slow client at index k gets the identical piece as a fast client at index k.
- **Peer verifies**: (a) unit test: `pieceSequence(seed)` is deterministic — same seed → identical array across runs; (b) integration: two clients in one room, force different speeds, assert the Nth piece type + spawn coords are identical on both; (c) `grep -n` shared rng imported by both client engine and server `Game`.
- **Risk → Mitigation**: HIGHEST-risk correctness item. If client uses `Math.random()` anywhere in piece logic, determinism breaks. **Mitigation**: ban `Math.random`/`Date.now` in `packages/shared` and `packages/client/src/engine` via ESLint `no-restricted-properties`; single shared `rng.ts` is the ONLY randomness source, seeded by the server; cover with the cross-client determinism test above.

### 9. Line clear → opponents get n-1 INDESTRUCTIBLE penalty lines at bottom
- **Spec**: p.6 — clearing n lines sends `n-1` indestructible penalty lines to opponents' field bottoms.
- **Design decision**: `clearLines(board)` (pure) returns `{board, cleared}`. On `cleared = n`, server `Game.onLineClear(player, n)` broadcasts to OTHER players in the room → each applies pure `addPenaltyLines(board, n-1)` which shifts existing stack up and inserts `n-1` rows of indestructible cells (special cell value, e.g. `9`/`INDESTRUCTIBLE`) at the bottom. `clearLines` must NEVER remove indestructible rows.
- **Peer verifies**: (a) unit test: `clearLines` ignores indestructible rows (full row of penalty cells does not clear); (b) unit test: clearing 3 lines → opponent board gains exactly 2 bottom penalty rows, stack pushed up; clearing 1 line → 0 penalty rows sent (n-1=0); (c) two-client integration confirms penalty appears in real time.
- **Risk → Mitigation**: Off-by-one (sending n instead of n-1) and penalty rows being clearable are the classic bugs. **Mitigation**: dedicated branch tests for n=1 (→0), n=2 (→1), n=4 (→3) and a test that a completed penalty row is NOT cleared.

### 10. Real-time spectrum (per-column highest-block height)
- **Spec**: p.6 — opponents' names + spectrum (height of each column's tallest block), updated real-time.
- **Design decision**: pure `computeSpectrum(board): number[10]` (for each of 10 columns, height = 20 − index of topmost filled cell, 0 if empty). On every board change, client emits compact spectrum (10 ints) to server; `Game` rebroadcasts to room; opponents render mini `<div>` grid/bars from the array. Opponent NAMES shown alongside (from `Player.name`).
- **Peer verifies**: (a) unit test `computeSpectrum` for known boards incl. empty/full/jagged columns; (b) two clients: drop a piece on A, observe B's spectrum + A's name update within one tick; (c) confirm spectrum payload is heights only (not full board), keeping it "spectrum".
- **Risk → Mitigation**: Sending full boards instead of spectrum leaks the opponent's exact field (spec wants only the silhouette) and wastes bandwidth. **Mitigation**: protocol carries `{playerId, name, spectrum:number[10]}` only; review the socket event shape.

### 11. NO scoring system in mandatory part
- **Spec**: p.7 — "There is no scoring system."
- **Design decision**: No score state in Redux store, no score field on `Player`/`Game`, no score UI. Win condition is purely last-player-standing. (Scoring is explicitly deferred to BONUS, row 18.)
- **Peer verifies**: (a) `grep -rin "score" packages/client/src packages/server/src` → no scoring logic in mandatory build (only possibly behind a bonus flag/branch); (b) UI shows no score counter.
- **Risk → Mitigation**: Adding score "for polish" violates the mandatory spec and confuses evaluation. **Mitigation**: keep any scoring strictly in a separate bonus module, gated, only if mandatory complete (row 18).

### 12. Last-man-standing winner
- **Spec**: p.7/p.8 — last remaining player wins; game ends when one player remains.
- **Design decision**: `Player.isAlive`; `Game.checkWinner()` triggered on each topout/leave; when `alivePlayers.length <= 1` (and game was multiplayer) the survivor is broadcast as winner and game status → finished. Topout = `isGameOver(board, nextPiece)` true (new piece cannot enter).
- **Peer verifies**: (a) integration: 2 players, force one to top out → other declared winner, game ends; (b) unit test `checkWinner` returns survivor when one alive; (c) `isGameOver` test: piece overlaps occupied spawn cells.
- **Risk → Mitigation**: Disconnect mid-game must also reduce alive count (else game never ends). **Mitigation**: `disconnect` handler marks player dead/removed and re-runs `checkWinner`; covered by a "opponent disconnects → I win" test.

### 13. Solo AND multiplayer modes
- **Spec**: p.7 solo+multiplayer; p.8 "A game can be played with one player."
- **Design decision**: Same `Game` engine for both. Solo: 1 player; no penalty broadcasts (no opponents); end = that player tops out (no winner declared, or self as survivor → game over). Multiplayer: ≥2 players, last-standing wins. Host can start with 1.
- **Peer verifies**: (a) open `/room/solo` alone → can start and play to game over; (b) multiplayer flow per row 12; (c) confirm solo end-of-game state is handled (restart available).
- **Risk → Mitigation**: Solo edge where `checkWinner` with 1 player must NOT immediately declare game over at start. **Mitigation**: winner check only fires after a death event, and solo game-over is "your game ended" not a multiplayer win; explicit solo test.

### 14. Host election (first player) + start/restart control
- **Spec**: p.8 — first to join becomes host, controls start/restart.
- **Design decision**: `RoomManager.create(room)` sets first joiner `isHost=true`. Start/restart socket events accepted ONLY from the host (`Game` validates `socket === host.socketId`). Non-hosts see a "waiting for host" UI; host sees Start button.
- **Peer verifies**: (a) first browser in a room shows Start control, second does not; (b) server rejects start/restart from non-host (test asserts event ignored/errored); (c) `grep -n "isHost"`.
- **Risk → Mitigation**: Race when two clients connect near-simultaneously. **Mitigation**: host assignment is server-side and atomic (first to be added to `Game.players`), never client-claimed.

### 15. Host migration on host leave
- **Spec**: p.8 — if host leaves, a remaining player takes the role.
- **Design decision**: On `disconnect`/leave of host, `Game.electNewHost()` promotes the next player (e.g. players[0] of remaining) to `isHost=true` and broadcasts updated host. If room empties, `RoomManager.remove(room)`.
- **Peer verifies**: (a) 2 players, host closes tab → remaining player gains Start control (host badge moves); (b) unit test `electNewHost` on host removal; (c) empty room is garbage-collected.
- **Risk → Mitigation**: Migration during an active game vs lobby differ. **Mitigation**: migration preserves game status; new host controls restart after game ends. Test both lobby-leave and in-game-leave.

### 16. No new players after start (until next round)
- **Spec**: p.8 — "Once started, no new players can join until the next round."
- **Design decision**: `Game.status` ∈ {`waiting`,`playing`,`finished`}. Join handler rejects when status==='playing' (emit `joinRejected`/redirect to spectate-or-wait). After game finishes/restart → status `waiting`, joins reopen.
- **Peer verifies**: (a) start a game, then open `/room/bob` → bob is refused entry into the active round; (b) after round ends, bob can join; (c) `grep -n "status\|playing"` in join handler; unit test rejects join while playing.
- **Risk → Mitigation**: A late joiner who is the SAME name reconnecting (refresh) vs a genuinely new player. **Mitigation**: treat reconnect of an existing in-game player as resume (match by name/session), reject only genuinely new names while playing.

### 17. Multiple concurrent games
- **Spec**: p.8 — multiple concurrent games supported.
- **Design decision**: `RoomManager` holds `Map<roomName, Game>`; each room is an isolated `Game` with its own seed/sequence/players, mapped to a socket.io room (`socket.join(room)`). Broadcasts scoped via `io.to(room)` so games never cross-talk.
- **Peer verifies**: (a) open `/roomA/x` and `/roomB/y` simultaneously → independent boards, independent piece sequences, penalties stay within room; (b) `grep -n "io.to(\|socket.join(\|Map" packages/server/src`; (c) unit test: two Games in RoomManager are independent.
- **Risk → Mitigation**: Global mutable state leaking between rooms (e.g. a module-level board). **Mitigation**: all per-game state lives on the `Game` instance, never module globals; scoped `io.to(room)` everywhere; cross-room isolation test.

### 18. No data persistence (mandatory)
- **Spec**: p.7 — "No data persistence is necessary."
- **Design decision**: All state in-memory (`RoomManager` Map, `Game`/`Player` instances). No DB, no file writes, no localStorage for game state. Server restart wipes everything (acceptable).
- **Peer verifies**: (a) no DB driver / ORM in `packages/server/package.json`; (b) `grep -rin "mongo\|sqlite\|prisma\|fs.writeFile\|localStorage" packages/server/src packages/client/src` → none in mandatory; (c) restart server → state gone.
- **Risk → Mitigation**: Bonus "persist scores" would add a DB — must not bleed into mandatory. **Mitigation**: persistence strictly behind bonus gate (row 20).

### 19. Coverage thresholds: 70% statements / 70% functions / 70% lines / 50% branches
- **Spec**: p.5 & p.10 — ≥70% statements, functions, lines; ≥50% branches (4 metrics).
- **Design decision (verified vs Vitest v8 docs)**: Vitest + `@vitest/coverage-v8`. Root/per-package `vitest.config.ts` with:
  ```ts
  coverage: { provider: 'v8', reporter: ['text','lcov'],
    thresholds: { statements: 70, functions: 70, lines: 70, branches: 50 } }
  ```
  Thresholds make `npm test` FAIL below target (CI gate). Engine pure functions + server classes are highly unit-testable, comfortably clearing 70%.
- **Peer verifies**: (a) run `npm test` / `npm run coverage` → coverage table prints Statements/Functions/Lines/Branches all ≥ required; (b) command exits non-zero if below (proves thresholds are enforced, not just reported); (c) open `vitest.config.ts` and confirm the four numbers.
- **Risk → Mitigation**: Branches threshold (50%) is the usual failure point given many game-state conditionals. **Mitigation**: explicitly test edge branches (n=1 penalty, empty/full columns, topout, host migration, join-while-playing); keep untestable glue (socket bootstrap, `index.ts`) excluded via `coverage.exclude` so it doesn't drag ratios — but do NOT exclude engine/models. Set `perFile:false` (default) so aggregate counts.

### 20. Secrets in gitignored `.env`
- **Spec**: p.10 red callout — no credentials/keys/env in repo; gitignored `.env`; exposure = project failure.
- **Design decision**: `.env` (real values) gitignored; committed `.env.example` documents keys (e.g. `PORT`, `CLIENT_ORIGIN`). Server reads via `process.env` (dotenv or Node `--env-file`). `.gitignore` includes `.env`, `.env.*` (except `.env.example`).
- **Peer verifies**: (a) `cat .gitignore` contains `.env`; (b) `git ls-files | grep -E '\.env$'` → empty (no `.env` tracked); (c) `.env.example` present and value-free.
- **Risk → Mitigation**: Accidentally committing `.env` before gitignore is the failure mode (history retains it). **Mitigation**: add `.env` to `.gitignore` in the very first commit; verify with `git ls-files`. (Currently NO `.gitignore` exists — must be created before any commit of code.)

### 21. Bonus gating
- **Spec**: p.11 red callout — bonuses evaluated ONLY if mandatory is COMPLETE and FUNCTIONAL.
- **Design decision**: Bonuses (scoring system, persistent scores, new modes: invisible pieces / increased gravity, FRP via flyd) implemented in clearly separated modules / behind flags, never altering mandatory behavior. Mandatory build must run with bonuses off.
- **Peer verifies**: (a) mandatory part fully functional independent of any bonus code; (b) bonus code is additive/isolated (separate dirs or feature flags); (c) if mandatory has ANY defect, bonus is not scored — so audit prioritizes rows 1-20.
- **Risk → Mitigation**: Spending effort on flyd/FRP or scoring before mandatory is bulletproof wastes the bonus (won't be evaluated). **Mitigation**: freeze bonus work until all 20 mandatory rows pass their verifications; keep bonus removable without touching mandatory paths.

---

## Cross-cutting verification quick-script (peer one-liners)
- No client `this`: `grep -rn "this" packages/client/src --include=\*.ts --include=\*.tsx | grep -v src/errors`
- No banned render tech: `grep -rin "canvas\|<svg\|<table\|jquery" packages/client/src`
- Server classes: `grep -rn "class Player\|class Piece\|class Game\|class RoomManager" packages/server/src`
- Determinism source: `grep -rn "Math.random\|Date.now" packages/shared packages/client/src/engine` (expect NONE)
- Static serving: `curl -s localhost:$PORT/ | grep bundle.js`
- Coverage gate: `npm run coverage` → exit code 0 only if 70/70/70/50 met
- Secrets: `git ls-files | grep -E '\.env$'` (expect empty) and `grep -n env .gitignore`

_Decisions:_ Treated the audit as a forward-looking DESIGN CONTRACT because the repo is greenfield (only the spec PDF exists; no code, no package.json, no .gitignore yet). Each row binds a spec constraint to the specific artifact in the AGREED folder structure that MUST exist, plus the exact evaluator check.; Made the no-`this` constraint enforceable via ESLint `no-restricted-syntax` banning `ThisExpression` scoped to client `src/**` and excluding `src/errors/**` (the Error-subclass exception) — turning a convention into a hard CI gate, which is what a peer can actually verify.; Identified deterministic piece sequence as the single highest-risk correctness item and tied it to one shared seeded RNG (`packages/shared/rng.ts`) consumed by BOTH client engine and server `Game`, with a ban on Math.random/Date.now in shared+engine and a cross-client (different-speed) determinism test as the verification anchor.; Confirmed socket.io v4 Express+HTTP static-serving + rooms pattern via Context7 (createServer(app) → new Server(httpServer) → express.static → SPA fallback last; one socket.io room per game room scoped with io.to(room)) so the static-serving and concurrent-games rows cite a verified API shape.; Confirmed Vitest v8 coverage threshold syntax via Context7 (coverage.thresholds.{statements,functions,lines,branches}, perFile default false) and specified exact values 70/70/70/50 that fail the build, making the coverage row verifiable by exit code, not just a printed report.; Flagged the Vite hashed-asset issue: spec wants literal `bundle.js`, so recommended Vite `output.entryFileNames='bundle.js'` to satisfy the wording, and BrowserRouter deep-link refresh requires a server `app.get('*')` history fallback ordered after static+socket.io.
_Risks:_ Determinism is the project's biggest correctness risk: any stray Math.random/Date.now in client engine or shared RNG desynchronizes piece sequences across players and silently fails the highlighted spec callout. Mitigation: single seeded RNG, ESLint no-restricted-properties ban, cross-client different-speed determinism test.; Client `this` leakage: a single class component or mis-scoped function handler violates a hard spec rule. Without the ESLint ThisExpression ban in CI it is easy to miss in review. Must add the lint gate (and ideally ban `class` in client too, except errors dir).; Server OO mandate vs DRY temptation: reusing the pure client engine on the server could make the server functional in disguise, violating the Player/Piece/Game class requirement. Models must be genuine stateful classes.; Static-serving order + SPA fallback: if `express.static` / socket.io are mounted AFTER the `app.get('*')` catch-all, assets and the websocket route get shadowed (blank page / no realtime). Strict ordering required and must be verified by curl + DevTools.; Coverage branches (50%) is the usual threshold failure given many game conditionals; if untestable glue (index.ts, socket bootstrap) is counted it can also drag statements below 70%. Mitigation: targeted branch tests + coverage.exclude for glue only (never engine/models).; Bonus misallocation: investing in flyd/FRP, scoring, or persistence before mandatory is fully functional yields zero credit (bonus only scored if mandatory COMPLETE AND FUNCTIONAL). Keep bonuses isolated and deferred.; Secrets exposure = automatic failure per spec; with no `.gitignore` yet, a careless `git add .` could commit a `.env` into history. Must establish `.gitignore` before any code commit.

---

## B. Subsystem Designs (raw)

## SUBSYSTEM: protocol

## Red Tetris — socket.io Network Protocol & Client/Server Responsibility Split

This subsystem defines the **complete bidirectional socket.io v4 contract** for Red Tetris. It is the single source of truth for every wire message between the React/Redux client and the OOP Express/socket.io server. All event names, payload shapes, directions, triggers, and ordered flows below are normative — server `socket/` handlers and client `socket/` middleware MUST implement exactly these.

Determinism rests on the verified foundation: the server generates one 32-bit `seed`, broadcasts it in `game:start`, and **no piece data is ever sent again**. Both sides derive every piece from `pieceAt(seed, index)` (mulberry32 + 7-bag, §2 of the Tetromino authority). The network protocol's job is therefore NOT to stream pieces — it is to distribute the seed, route penalties, relay spectrums, and adjudicate room/host/win state.

---

### 1. Authority Model — Who Owns What

The server is the **authority for shared/contested state**; the client is the **authority for its own local simulation** (which is deterministic, so the server can trust derived reports but still arbitrates cross-player effects).

| Concern | Owner | Rationale |
|---|---|---|
| Room registry (`Map<roomName, Game>`), creation/teardown | **SERVER** (`RoomManager`) | Multiple concurrent games; isolation via `io.to(room)`. |
| Player roster per room, join/leave, name uniqueness | **SERVER** (`Game.players`) | Single arbiter prevents races. |
| Host identity + migration | **SERVER** (`Game.hostId`) | First joiner = host; atomic server-side election on leave. |
| Game lifecycle status `waiting`/`playing`/`finished` | **SERVER** (`Game.status`) | Gates joins-after-start, restart authority. |
| The shared **`seed`** + piece-stream contract | **SERVER** generates, broadcasts once | Determinism anchor; clients derive via `pieceAt(seed, index)`. |
| Per-player **board simulation** (gravity, lock, rotate, move, hard/soft drop) | **CLIENT** (pure engine on the client's OWN board) | Spec: client runs pure-function game logic; reduces server CPU; deterministic so trustworthy. |
| Authoritative **gravity clock** | **CLIENT-driven, SERVER-validated** | Each client steps its own gravity (the pure engine is deterministic). Server does NOT tick 1000ms per player; it trusts derived events (`board:line-clear`, `player:topout`). See Risks. |
| **Penalty routing** (n cleared → n−1 to each opponent) | **SERVER** | Cross-player effect; only the server knows the full roster. Client reports `linesCleared`; server fans out `penalty:apply`. |
| **Penalty application to the local board** | **CLIENT** (pure `addPenaltyLines`) | Server tells *how many*; client mutates its own board immutably. |
| **Spectrum relay** | **SERVER** relays | Client computes `computeSpectrum(board)` and reports; server rebroadcasts to opponents only. |
| **Win determination** (last-man-standing) | **SERVER** (`Game.checkWinner()`) | Server owns `alivePlayers` set; only it sees all topouts/disconnects. |
| Rendering, input capture, optimistic prediction, animation | **CLIENT** | DOM/Redux; no `this`; pure engine. |

**Trust boundary note:** because every client derives pieces from the same `seed`, two honest clients are bit-identical. The server does **not** re-simulate boards (no anti-cheat is required by the spec — last-man-standing, no score). It accepts client-reported derived facts (`linesCleared`, `spectrum`, `topout`) and is the sole router/arbiter of their cross-player consequences. This keeps the server authoritative over *shared outcomes* without paying to simulate N boards in real time.

---

### 2. Shared Type Vocabulary (`packages/shared/src/protocol.ts`)

All payloads are `import type`-only (erasable), enum-free (`as const` unions per `erasableSyntaxOnly`). IDs: `playerId` = the socket.io `socket.id` (string); `roomName` = URL segment.

```ts
// packages/shared/src/protocol.ts
import type { Cell } from './types';            // Cell = 0..8
export type Spectrum = number[];                // length 10, each 0..20 (computeSpectrum output)

export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface PlayerView {
  id: string;          // socket.id
  name: string;        // URL <player_name>, unique within room
  isHost: boolean;
  isAlive: boolean;    // meaningful only while status==='playing'
  spectrum: Spectrum;  // last reported; all-zeros before first lock
}

export interface RoomState {
  room: string;
  status: GameStatus;
  hostId: string;            // '' only in the impossible empty-room transient
  players: PlayerView[];     // roster order = join order (index 0 is migration heir)
  seed: number | null;       // null while waiting; set when status flips to 'playing'
}

// ---- Error taxonomy (discriminated union) ----
export type ErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'NAME_TAKEN'
  | 'NAME_INVALID'        // empty / illegal chars / too long
  | 'ROOM_NAME_INVALID'
  | 'JOIN_AFTER_START'    // status === 'playing'
  | 'NOT_HOST'            // non-host tried start/restart
  | 'NOT_IN_ROOM'         // event before a successful join
  | 'ALREADY_STARTED'
  | 'INTERNAL';

export interface ProtocolError {
  code: ErrorCode;
  message: string;        // human-readable, for UI toast
  fatal: boolean;         // true => client should route back to landing
}

// ---- Acknowledgement envelope (socket.io callback ack) ----
export type Ack<T> =
  | { ok: true; data: T }
  | { ok: false; error: ProtocolError };
```

`Ack<T>` is used as socket.io's **callback acknowledgement** on request/response style events (`join`, `start`, `restart`) so the client gets a typed success/failure synchronously instead of racing a separate error event. Fire-and-forget reports (`spectrum:report`, `board:line-clear`) do **not** use acks.

**Typed socket maps** (socket.io generics — both sides import these):

```ts
// Server -> Client events
export interface ServerToClientEvents {
  'room:state':       (s: RoomState) => void;
  'player:joined':    (p: { player: PlayerView }) => void;
  'player:left':      (p: { playerId: string; name: string }) => void;
  'host:changed':     (p: { hostId: string; reason: 'assigned' | 'migrated' }) => void;
  'game:start':       (p: GameStartPayload) => void;
  'game:over':        (p: GameOverPayload) => void;
  'penalty:apply':    (p: PenaltyApplyPayload) => void;
  'spectrum:update':  (p: SpectrumUpdatePayload) => void;
  'player:gameover':  (p: { playerId: string; name: string }) => void;
  'error':            (e: ProtocolError) => void;
}

// Client -> Server events (some carry an Ack callback as last arg)
export interface ClientToServerEvents {
  'join':             (p: JoinPayload, ack: (r: Ack<RoomState>) => void) => void;
  'start':            (ack: (r: Ack<GameStartPayload>) => void) => void;
  'restart':          (ack: (r: Ack<RoomState>) => void) => void;
  'board:line-clear': (p: LineClearReport) => void;        // fire-and-forget
  'spectrum:report':  (p: { spectrum: Spectrum }) => void; // fire-and-forget
  'player:topout':    (p: { atPieceIndex: number }) => void;
  'leave':            () => void;                          // explicit leave (nav away)
}

export interface InterServerEvents { /* none — single node */ }
export interface SocketData { room?: string; name?: string; playerId?: string; }
```

```ts
// ---- concrete payloads referenced above ----
export interface JoinPayload { room: string; name: string; }

export interface GameStartPayload {
  seed: number;          // uint32 — THE determinism anchor (pieceAt(seed,i))
  startedAt: number;     // server Date.now(); informational only (NOT used in piece math)
  players: PlayerView[]; // snapshot of who is in this round (frozen roster)
}

export interface LineClearReport {
  linesCleared: number;  // n in [1..4]; server sends n-1 penalties to opponents
  atPieceIndex: number;  // which piece caused it (debug/ordering, not used for piece math)
}

export interface PenaltyApplyPayload {
  count: number;         // number of indestructible rows to addPenaltyLines() — already (n-1), summed if batched
  fromPlayerId: string;  // attacker, for UI ("Alice sent you 2 lines")
  fromName: string;
}

export interface SpectrumUpdatePayload {
  playerId: string;
  name: string;
  spectrum: Spectrum;    // length 10
}

export interface GameOverPayload {
  winnerId: string | null;   // last player standing; null => solo self-end OR simultaneous draw
  winnerName: string | null;
  reason: 'last-standing' | 'solo-end' | 'draw' | 'everyone-left';
}
```

---

### 3. Full Event Catalog

Legend: **C→S** client-to-server, **S→C** server-to-client (room-scoped via `io.to(room)` unless noted). "Ack" = uses the `Ack<T>` callback.

| # | Event name | Dir | Payload type | Ack | Trigger / semantics |
|---|---|---|---|---|---|
| 1 | `join` | C→S | `JoinPayload` `{room,name}` | `Ack<RoomState>` | Client mounts route `/:room/:player`, reads `useParams`, emits once on connect. Server validates room/name, creates `Game` if absent, adds `Player`, assigns host if first. Ack returns full `RoomState`; on failure ack `{ok:false,error}` with `ROOM_NAME_INVALID`/`NAME_INVALID`/`NAME_TAKEN`/`JOIN_AFTER_START`. |
| 2 | `room:state` | S→C | `RoomState` | — | Broadcast to the room after ANY roster/status/host change (join, leave, start, restart, migration). Idempotent full snapshot — clients replace local store wholesale (avoids drift). |
| 3 | `player:joined` | S→C | `{player: PlayerView}` | — | Sent to OTHERS in room when a new player joins (in addition to the authoritative `room:state`). Drives a lightweight "X joined" toast without diffing rosters. |
| 4 | `player:left` | S→C | `{playerId, name}` | — | Sent to room on explicit `leave` or `disconnect` while `waiting`/`finished`. Paired with a fresh `room:state`. |
| 5 | `host:changed` | S→C | `{hostId, reason}` | — | `reason:'assigned'` on first-player host assignment (also embedded in `room:state`); `reason:'migrated'` when host leaves and heir is promoted. Lets non-host UI flip the Start button without diffing. |
| 6 | `start` | C→S | *(none)* | `Ack<GameStartPayload>` | HOST only. Server checks `socket.id===hostId` && `status==='waiting'` && `players.length>=1`. Generates `seed=(Math.random()*2**32)>>>0`, sets `status='playing'`, freezes roster, returns `GameStartPayload` in ack AND broadcasts `game:start` to room. Non-host → ack `{ok:false, NOT_HOST}`. |
| 7 | `game:start` | S→C | `GameStartPayload` `{seed,startedAt,players}` | — | Broadcast to ALL players in room (incl. host) the instant the round begins. **This is the determinism event.** Each client seeds its engine cursor `index=0`, derives pieces via `pieceAt(seed,index)`, starts its local gravity loop. No further piece data ever transmitted. |
| 8 | `board:line-clear` | C→S | `LineClearReport` `{linesCleared,atPieceIndex}` | — | Client's pure engine cleared `n` rows on lock. Reports `n`. Server computes `penalty=n-1`; if `>0`, emits `penalty:apply{count:penalty}` to every OTHER alive player in the room. `n=1`→no-op (0 penalties). |
| 9 | `penalty:apply` | S→C | `PenaltyApplyPayload` `{count,fromPlayerId,fromName}` | — | Sent to each opponent. Client calls pure `addPenaltyLines(board,count)`, shifting its stack up and appending `count` indestructible rows. May cause its own topout on next spawn (→ `player:topout`). |
| 10 | `spectrum:report` | C→S | `{spectrum: Spectrum}` | — | Client emits after every settled-board change (lock, line clear, penalty applied) — NOT per fall tick. `spectrum`=`computeSpectrum(board)` (len 10). |
| 11 | `spectrum:update` | S→C | `SpectrumUpdatePayload` `{playerId,name,spectrum}` | — | Server relays the reporter's spectrum to OPPONENTS only (`socket.to(room)` excludes sender). Opponents render name + column-height bars. |
| 12 | `player:topout` | C→S | `{atPieceIndex}` | — | Client's engine detected `isTopOut` (spawn collision) on its OWN board. Server marks `Player.isAlive=false`, removes from `alivePlayers`, broadcasts `player:gameover`, runs `checkWinner()`. |
| 13 | `player:gameover` | S→C | `{playerId,name}` | — | Broadcast to room when any player tops out. Opponents grey-out that player's panel. Distinct from `game:over` (whole-game end). |
| 14 | `game:over` | S→C | `GameOverPayload` `{winnerId,winnerName,reason}` | — | Server's `checkWinner()` found `alivePlayers.size<=1` (multi) or the solo player ended. Sets `status='finished'`, freezes round, re-enables host restart. |
| 15 | `restart` | C→S | *(none)* | `Ack<RoomState>` | HOST only, `status==='finished'` (or `waiting`). Server resets each `Player` board state, `status='waiting'`, clears `seed`, re-opens joins, broadcasts `room:state`. Host then presses Start again (new `seed`). Non-host → `NOT_HOST`. |
| 16 | `leave` | C→S | *(none)* | — | Client navigates away (React Router unmount / explicit Leave button). Server removes player, migrates host if needed, GCs empty room, broadcasts `player:left`+`room:state`, runs `checkWinner()` if mid-game. |
| 17 | `error` | S→C | `ProtocolError` `{code,message,fatal}` | — | Out-of-band errors not tied to an ack (e.g. event arrived before join → `NOT_IN_ROOM`; internal failure → `INTERNAL`). `fatal:true` ⇒ client routes to landing. (Validatable join/start/restart failures travel via their **ack**, not here.) |
| 18 | `disconnect` | C→S | *(socket.io built-in)* | — | Transport-level (tab close, network drop). Server's `io.on('connection')→socket.on('disconnect')` handler runs the SAME path as `leave` (remove/migrate/GC/checkWinner) and, if mid-game, removes from `alivePlayers` so the round can still end. |
| 19 | `connect` / `connect_error` | S→C | *(socket.io built-in)* | — | Client lifecycle. On `connect` (incl. auto-reconnect) the client re-emits `join` with the SAME `{room,name}` to resume (best-effort, §5). `connect_error` surfaces a retry UI. |

Naming convention: `domain:verb` (lowercase, colon). Reports from client end in a noun (`line-clear`, `topout`, `report`); server fan-outs use `:apply`/`:update`/`:state`/`:changed`.

---

### 4. Sequence Flows (numbered, exact)

#### Flow A — Room join + lobby formation
1. Browser navigates to `http://host:3000/neon/alice`. Express SPA fallback (`/*splat`) serves `index.html`+`bundle.js`.
2. Client mounts `<Route path="/:room/:player">`; `useParams()` → `{room:'neon', player:'alice'}`. Redux `socketMiddleware` opens the socket (dev: via Vite proxy `/socket.io`).
3. On `connect`, client emits `join {room:'neon', name:'alice'}` with an ack callback.
4. Server: `RoomManager.get('neon')` → absent ⇒ `create('neon')` → `new Game('neon')`. Validates `name` (non-empty, ≤ N chars, unique). First player ⇒ `Player.isHost=true`, `Game.hostId=socket.id`, `socket.join('neon')`, `socket.data={room,name}`.
5. Server ack → `{ok:true, data: RoomState{status:'waiting', hostId:alice.id, players:[alice], seed:null}}`. Client stores it; renders lobby with **Start** button (host).
6. Bob navigates to `/neon/bob` → repeats 2–4. Name unique ⇒ added as non-host.
7. Server broadcasts to room `player:joined {player:bob}` and authoritative `room:state {players:[alice,bob], hostId:alice.id, status:'waiting'}`. Alice's UI lists Bob; Bob's ack gave him the same `RoomState`. Bob sees **"waiting for host"** (no Start).
8. (Failure variants) Duplicate name ⇒ ack `{ok:false,error:{code:'NAME_TAKEN',fatal:true}}` → client routes to landing with toast. Joining `/neon/carol` after Flow B started ⇒ ack `{code:'JOIN_AFTER_START',fatal:true}`.

#### Flow B — Host starts game → deterministic sequence distribution
1. Alice (host) clicks Start → client emits `start` with ack.
2. Server validates `socket.id===Game.hostId` && `status==='waiting'`. Generates `seed=(Math.random()*2**32)>>>0`. Sets `status='playing'`, snapshots/freezes `players` roster, initializes `alivePlayers={alice,bob}`, each `Player.isAlive=true`.
3. Server ack to Alice → `{ok:true, data:{seed, startedAt, players}}` AND `io.to('neon').emit('game:start', {seed, startedAt, players})` (Bob + Alice both receive the broadcast; Alice also has it via ack — idempotent).
4. Each client receives `game:start`: sets engine `index=0`, computes first piece `pieceAt(seed,0)` at spawn origin (§1.3), starts its local gravity loop at `GRAVITY_MS=1000`. **Identical seed ⇒ identical infinite piece stream on both clients** — no piece is ever sent over the wire. A client that receives `game:start` late simply starts later but at `index=0` with the same `seed`, so piece *content/coords* match exactly (the determinism guarantee).
5. Server also broadcasts `room:state {status:'playing', seed, ...}` so any late UI reconciles. Joins are now rejected (`JOIN_AFTER_START`).

#### Flow C — Line clear → penalty fan-out + spectrum updates
1. Alice's pure engine locks a piece and `clearLines` returns `{cleared:3}`.
2. Alice's client emits `board:line-clear {linesCleared:3, atPieceIndex:k}` (fire-and-forget) and, after recomputing, `spectrum:report {spectrum: computeSpectrum(aliceBoard)}`.
3. Server `Game.onLineClear(alice, 3)`: `penalty = 3-1 = 2`. For each OTHER alive player (Bob): `socket.to(bob).emit('penalty:apply', {count:2, fromPlayerId:alice.id, fromName:'alice'})`. (If `n=1`, penalty=0 → no emit.)
4. Bob's client calls pure `addPenaltyLines(bobBoard, 2)` → stack shifts up 2, two indestructible (`Cell 8`) rows appended at bottom. Bob recomputes and emits `spectrum:report {spectrum}`. If the upward shift makes Bob's active piece/next spawn collide, Bob's engine flags topout → Flow E.
5. Server relays spectrums: on Alice's `spectrum:report` → `socket.to('neon').emit('spectrum:update',{playerId:alice.id,name:'alice',spectrum})` (Bob sees Alice's silhouette shrink/grow). On Bob's report → Alice sees Bob's silhouette rise from the penalty. Opponents render only name + 10 column-height bars, never raw cells.
6. (Batching note) If multiple `penalty:apply` would arrive for Bob in one tick window, server MAY sum `count` into one payload; client applies once. Determinism is unaffected (penalty count is the only shared input).

#### Flow D — Host leaves mid-game → migration
1. Alice (host) closes her tab during `status==='playing'`. socket.io fires `disconnect` on Alice's socket.
2. Server disconnect handler: `Game.removePlayer(alice)` → roster now `[bob, carol]`; `alivePlayers` drops alice.
3. Since `alice.isHost`, `Game.electNewHost()` promotes `players[0]` of the remaining roster (Bob) → `bob.isHost=true`, `Game.hostId=bob.id`.
4. Server broadcasts `host:changed {hostId:bob.id, reason:'migrated'}`, `player:left {playerId:alice.id,name:'alice'}`, and authoritative `room:state`. Bob's UI gains restart authority (Start/Restart after round).
5. Server runs `checkWinner()`: `alivePlayers={bob,carol}` size 2 ⇒ game continues. (Had Alice's leave dropped survivors to 1, Flow E's end fires.)
6. If the room becomes empty (all left), `RoomManager.remove('neon')` GCs the `Game` (no persistence). A later `/neon/<name>` join recreates a fresh room.

#### Flow E — A player tops out; others continue to last-man-standing
1. Bob's engine: a new piece `pieceAt(seed,index)` collides at spawn (`isTopOut`) — possibly from accumulated penalties. Bob's client emits `player:topout {atPieceIndex:index}` and stops its gravity loop (freezes its own board).
2. Server: `bob.isAlive=false`, `alivePlayers.delete(bob)`, broadcasts `player:gameover {playerId:bob.id,name:'bob'}`. Opponents grey out Bob's panel.
3. Server `checkWinner()`: `alivePlayers={carol}` size 1 && round had ≥2 starters ⇒ winner. Sets `status='finished'`, broadcasts `game:over {winnerId:carol.id, winnerName:'carol', reason:'last-standing'}`.
4. Carol's client shows "You win"; Bob shows "Game over". Host (current `hostId`) sees **Restart**.
5. (Solo variant) If only Carol started (1 player), her own `player:topout` ⇒ `checkWinner()` with 0 alive ⇒ `game:over {winnerId:null, reason:'solo-end'}`.
6. (Draw variant) If the last two topout in the same server tick (both `player:topout` processed before either `checkWinner` sees size 1), and `alivePlayers.size===0`, emit `game:over {winnerId:null, reason:'draw'}`.

#### Flow F — Restart by host
1. After `status==='finished'`, current host (e.g. Bob) clicks Restart → emits `restart` with ack.
2. Server validates `socket.id===hostId`. Resets every `Player`: `board=emptyBoard()`, `isAlive=true`, `spectrum=zeros(10)`. Sets `status='waiting'`, `seed=null`, clears `alivePlayers`. Joins re-open.
3. Server ack → `{ok:true, data: RoomState{status:'waiting', seed:null, players}}` AND broadcasts `room:state`. All clients reset their Redux board state and return to lobby (host sees Start).
4. Host clicks Start → Flow B with a **new** `seed` (fresh deterministic stream). Players who joined the lobby during `waiting` are included in the next frozen roster.

---

### 5. Reconnection / Resume Strategy (no persistence)

Because the mandatory part forbids persistence and uses `socket.id` as `playerId`, a reconnect yields a **new** `socket.id` — the old identity cannot be revived from storage. Strategy is **best-effort, identity-by-(room,name)**:

1. **Client transport reconnect** (socket.io default `reconnection:true`): on `connect_error`, show a non-fatal "reconnecting…" banner; socket.io retries with backoff automatically.
2. **On reconnect `connect`**, the client re-emits `join {room, name}` (same params held in Redux/URL — the URL `/:room/:player` is the durable source).
3. **Server resume policy by room status:**
   - `status==='waiting'`: treat as a normal (re)join. If the same `name` is free (the prior socket already `disconnect`-removed it), the player rejoins cleanly. If a stale entry with that name still lingers (disconnect not yet processed), server reclaims it (replace old `socket.id` with new) rather than `NAME_TAKEN`.
   - `status==='playing'`: a brief disconnect during play **cannot** restore the lost board (no persistence, server doesn't simulate boards). Two documented options — we choose **(a)** for the mandatory part:
     - **(a) Treat disconnect as elimination (chosen):** disconnect during play marks the player dead (`alivePlayers.delete`), so the round still resolves to last-man-standing. A reconnecting socket with the same name during `playing` is rejected with `JOIN_AFTER_START` (they may watch via a fresh `room:state` spectator view or wait for restart). This is deterministic and matches "once started, no new players can join until the next round."
     - **(b) Best-effort resume (bonus-tier, not implemented in mandatory):** would require the server to retain the dead player's `Player` object for a grace window and let a same-name socket re-bind to it — but the board is unrecoverable without server-side simulation, so resumed players would restart from an empty board, which is worse than (a). Documented and rejected for mandatory.
   - `status==='finished'`: rejoin as in `waiting` (lobby); they participate in the next round after restart.
4. **Host reconnect:** if the disconnected player was host, migration (Flow D) already promoted an heir; the reconnecting player rejoins as a **non-host** (no host reclaim) to keep election atomic and race-free.
5. **No game-state persistence anywhere:** server keeps everything in `RoomManager` memory only; a server restart wipes all rooms (acceptable per spec). Client keeps only in-memory Redux + URL params; no `localStorage` for game state.

---

**Decisions / Risks / Open questions**

- **Decisions:** (1) Server is authority for *shared* state (seed, roster, host, penalty routing, win), client is authority for its *own* deterministic board sim — server does NOT re-simulate boards. (2) Determinism rides on a single broadcast `seed` in `game:start`; zero piece data on the wire thereafter; both sides use `pieceAt(seed,index)`. (3) `playerId = socket.id`. (4) Request/response events (`join`/`start`/`restart`) use socket.io **ack callbacks** with `Ack<T>`; reports/relays are fire-and-forget. (5) `room:state` is always an idempotent full snapshot (clients replace wholesale) — granular events (`player:joined`, `host:changed`) are additive UX sugar. (6) Penalty = client reports `linesCleared=n`; server fans out `count=n-1` to other alive players. (7) Reconnect during `playing` = elimination (option a); resume is best-effort only in lobby states. (8) Event naming `domain:verb`.
- **Risks:** (1) **Trusting client reports** (`linesCleared`, `topout`, `spectrum`) — a tampered client could lie. Acceptable for this spec (no score, no anti-cheat mandate), but the server is the *only* router of consequences, so a lie can't desync *others'* piece streams (those depend solely on `seed`). (2) **Gravity authority drift** — if a client's local clock stalls, its board lags but stays deterministic; cross-player fairness is unaffected because pieces are index-addressed, not time-addressed. (3) **Penalty/topout ordering** — `penalty:apply` arriving as a piece is mid-air: client must apply penalty to the *settled* board and recheck spawn collision on next lock (handled by the engine's lock path), else a topout could be missed. (4) **Simultaneous topout draw** must be a tested branch (Flow E.6). (5) **Reconnect `NAME_TAKEN` race** — stale disconnect not yet processed; mitigated by reclaim-on-rejoin in `waiting`.
- **Open questions:** (1) Should mid-game disconnect have a short **grace window** before elimination (smoother UX) vs. instant elimination (simpler/deterministic)? Chose instant for mandatory; flag for playtest. (2) Should the server run a lightweight **authoritative gravity/lock re-simulation** for anti-cheat/robustness (bonus), or stay trust-the-client (mandatory)? (3) Spectator view for late/eliminated players — explicitly out of mandatory scope; confirm with eval whether a read-only `room:state`+spectrum view is desired. (4) Penalty **batching window** size (per-tick coalescing) — needs a concrete ms value during integration if penalty storms cause flicker.

=====

## SUBSYSTEM: shared

## packages/shared — Pure, Framework-Agnostic Core (tetrominoes, types, rng, constants)

This package is the single source of truth imported by **both** server (`@red-tetris/shared` via package `exports`) and client (`@shared/*` via `vite-tsconfig-paths`). Every export is **pure** (no I/O, no `Date.now`, no `Math.random`, no mutation of inputs, no `this`). It must be `erasableSyntaxOnly`-safe: **no enums, no namespaces** — all closed sets are `as const` union objects. Coordinates are **y-down**, origin `(0,0)` top-left, `x ∈ 0..9` (column), `y ∈ 0..19` (row).

File map:
| File | Exports (summary) | Purity |
|---|---|---|
| `constants.ts` | board dims, gravity/lock timing, spawn table, color map, cell sentinels | pure constants |
| `types.ts` | all shared types + every socket event payload type | type-only (erased) |
| `tetrominoes.ts` | `SHAPES`, `COLORS`, `KICKS_JLSTZ`, `KICKS_I`, `kickKey`, `shapeCells`, `kicksFor`, `cellsAt` | pure data + pure fns |
| `rng.ts` | `makeRng`, `nextBag`, `shuffleBag`, `pieceAt`, `PIECE_ORDER` | pure fns |
| `index.ts` | barrel re-export (excluded from coverage) | — |

---

### 1. `constants.ts` — exact values

```ts
// packages/shared/src/constants.ts
import type { Cell, PieceType, Position, RotationState } from './types';

// ---- Board geometry ----
export const BOARD_WIDTH = 10 as const;
export const BOARD_HEIGHT = 20 as const;
export const SPECTRUM_LENGTH = BOARD_WIDTH; // 10

// ---- Cell sentinels (single source; mirrored as Cell union in types.ts) ----
export const EMPTY = 0 as const;        // empty cell
export const PENALTY = 8 as const;      // indestructible garbage line
export const GHOST = 9 as const;        // render-only hint (NEVER part of authoritative board)

// ---- Timing (mandatory part = constant gravity, no level acceleration) ----
export const GRAVITY_MS = 1000 as const;       // ms per 1-row fall at level 0
export const SOFT_DROP_FACTOR = 20 as const;   // soft drop is 20x faster -> 50 ms/row
export const SOFT_DROP_MS = GRAVITY_MS / SOFT_DROP_FACTOR; // 50
export const LOCK_DELAY_FRAMES = 1 as const;   // one-frame grace ("immobile only on next frame")
export const TICK_MS = GRAVITY_MS;             // server gravity loop base interval (level 0)

// ---- Spawn origin per piece (box top-left placed on board), y-down ----
// All pieces spawn with originX so blocks land on columns 3..6 (I) / 3..5 (others),
// originY = -1 so the empty top box-row sits above the field.
export const SPAWN_Y = -1 as const;
export const SPAWN: Record<PieceType, Position> = {
  I: { x: 3, y: SPAWN_Y },
  O: { x: 3, y: SPAWN_Y },
  T: { x: 3, y: SPAWN_Y },
  S: { x: 3, y: SPAWN_Y },
  Z: { x: 3, y: SPAWN_Y },
  J: { x: 3, y: SPAWN_Y },
  L: { x: 3, y: SPAWN_Y },
};
export const SPAWN_ROTATION: RotationState = 0;

// ---- Canonical color id per piece (1..7); 8 = penalty, 0 = empty, 9 = ghost ----
export const COLOR_ID: Record<PieceType, Cell> = {
  I: 1, O: 2, T: 3, S: 4, Z: 5, J: 6, L: 7,
};

// ---- Hex map for rendering (client CSS) — pure data, no DOM ----
export const COLOR_HEX: Record<Cell, string> = {
  0: 'transparent', // EMPTY
  1: '#00FFFF',     // I cyan
  2: '#FFFF00',     // O yellow
  3: '#A000F0',     // T purple
  4: '#00F000',     // S green
  5: '#F00000',     // Z red
  6: '#0000F0',     // J blue
  7: '#F0A000',     // L orange
  8: '#808080',     // penalty gray
  9: '#FFFFFF',     // ghost (rendered as outline/low-opacity by CSS class)
};
```

Constant correctness asserted by tests: `BOARD_WIDTH===10`, `BOARD_HEIGHT===20`, `SOFT_DROP_MS===50`, `Object.keys(SPAWN).length===7`, `COLOR_ID` is a bijection onto `1..7`, `COLOR_HEX` has a key for every `Cell` value `0..9`.

---

### 2. `types.ts` — all shared types (type-only, fully erased)

```ts
// packages/shared/src/types.ts

// ---------- Cell encoding ----------
// 0 empty | 1..7 filled-with-color (I..L) | 8 indestructible penalty | 9 ghost (render-only)
export type Cell = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type FilledColor = 1 | 2 | 3 | 4 | 5 | 6 | 7;

// ---------- Geometry ----------
export type Coord = readonly [col: number, row: number]; // tuple used inside shape tables
export interface Position { readonly x: number; readonly y: number; } // board-space origin of a piece
export type Board = Cell[][];           // [row 0..19][col 0..9], 20 x 10 (mutable type; engine returns NEW boards)
export type Spectrum = number[];        // length 10, each 0..20 (height of column's highest block)

// ---------- Pieces ----------
export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export type RotationState = 0 | 1 | 2 | 3; // 0 spawn, 1 CW(R), 2 180, 3 CCW(L)
export interface ActivePiece {
  readonly type: PieceType;
  readonly rotation: RotationState;
  readonly x: number;                   // board col of box top-left
  readonly y: number;                   // board row of box top-left
  readonly grounded?: boolean;          // lock-delay grace flag (wasGroundedLastFrame)
}

// ---------- Lobby / game lifecycle ----------
export type GameStatus = 'waiting' | 'playing' | 'finished';

// Player as seen by clients (no socketId leaked). isHost/alive drive UI.
export interface PlayerDTO {
  readonly id: string;        // server-assigned player id (socket id internally; opaque to client)
  readonly name: string;      // from URL <player_name>
  readonly isHost: boolean;
  readonly alive: boolean;
}

// Opponent view = name + spectrum only (NEVER the real board).
export interface OpponentView {
  readonly id: string;
  readonly name: string;
  readonly alive: boolean;
  readonly spectrum: Spectrum; // length 10
}

// Full room snapshot pushed on join / lobby change.
export interface RoomState {
  readonly room: string;
  readonly status: GameStatus;
  readonly hostId: string;
  readonly players: readonly PlayerDTO[];
  readonly seed: number | null;        // null until game:start; uint32 afterwards
}

// ---------- Inputs (client -> server) ----------
export type GameAction =
  | 'left'
  | 'right'
  | 'rotateCW'
  | 'softDrop'   // single soft-drop step / or "down held" toggle (see protocol note)
  | 'hardDrop';
```

#### 2.1 Socket event channel names (`as const`, shared so client & server can't drift)

```ts
// packages/shared/src/types.ts (continued)
export const EVENTS = {
  // client -> server
  JOIN: 'room:join',
  LEAVE: 'room:leave',
  START: 'game:start',         // host only
  RESTART: 'game:restart',     // host only
  ACTION: 'game:action',       // movement/rotation/drops
  // server -> client
  ROOM_STATE: 'room:state',
  JOIN_REJECTED: 'room:joinRejected',
  GAME_STARTED: 'game:started',
  BOARD_UPDATE: 'board:update',
  SPECTRUM_UPDATE: 'spectrum:update',
  PENALTY: 'game:penalty',
  PLAYER_GAMEOVER: 'player:gameover',
  GAME_OVER: 'game:over',
  HOST_CHANGED: 'room:hostChanged',
  ERROR: 'server:error',
} as const;
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
```

#### 2.2 Exact payload type per event (one interface per channel)

```ts
// ===== client -> server =====
export interface JoinPayload   { readonly room: string; readonly name: string; }
export interface LeavePayload  { readonly room: string; }
export interface StartPayload  { readonly room: string; }            // sender must be host (server validates)
export interface RestartPayload{ readonly room: string; }
export interface ActionPayload { readonly room: string; readonly action: GameAction; }

// ===== server -> client =====
export interface RoomStatePayload extends RoomState {}              // full lobby snapshot

export interface JoinRejectedPayload {
  readonly room: string;
  readonly reason: 'game_in_progress' | 'name_taken' | 'invalid_name' | 'invalid_room';
}

export interface GameStartedPayload {
  readonly room: string;
  readonly seed: number;          // uint32; both sides derive pieces via pieceAt(seed, i)
  readonly players: readonly PlayerDTO[];
  readonly startIndex: number;    // piece index the round begins at (normally 0)
}

// Authoritative board for THE RECEIVING player only (their own field).
export interface BoardUpdatePayload {
  readonly room: string;
  readonly playerId: string;
  readonly board: Board;          // 20x10 authoritative cells
  readonly active: ActivePiece | null;
  readonly next: PieceType;       // preview (next piece type)
  readonly pieceIndex: number;    // current cursor in the shared sequence
}

// Opponent silhouette broadcast to the room (one per other player).
export interface SpectrumUpdatePayload {
  readonly room: string;
  readonly playerId: string;
  readonly name: string;
  readonly spectrum: Spectrum;    // length 10
}

// Sent to a victim when an attacker clears n lines (lines = n-1, already decremented server-side).
export interface PenaltyPayload {
  readonly room: string;
  readonly fromPlayerId: string;
  readonly lines: number;         // count of indestructible lines to add (>=1; n-1 of attacker's clear)
}

export interface PlayerGameOverPayload {
  readonly room: string;
  readonly playerId: string;
}

// winnerId: a player id (multiplayer survivor), or null for solo end / draw.
export interface GameOverPayload {
  readonly room: string;
  readonly winnerId: string | null;
}

export interface HostChangedPayload {
  readonly room: string;
  readonly hostId: string;
}

export interface ServerErrorPayload {
  readonly code: 'not_host' | 'not_in_room' | 'bad_action' | 'internal';
  readonly message: string;
}
```

#### 2.3 Typed event maps for `socket.io` generics (server + client share these)

```ts
// Maps event name -> handler signature, for new Server<...>() and io(socket) typing.
export interface ClientToServerEvents {
  [EVENTS.JOIN]: (p: JoinPayload) => void;
  [EVENTS.LEAVE]: (p: LeavePayload) => void;
  [EVENTS.START]: (p: StartPayload) => void;
  [EVENTS.RESTART]: (p: RestartPayload) => void;
  [EVENTS.ACTION]: (p: ActionPayload) => void;
}
export interface ServerToClientEvents {
  [EVENTS.ROOM_STATE]: (p: RoomStatePayload) => void;
  [EVENTS.JOIN_REJECTED]: (p: JoinRejectedPayload) => void;
  [EVENTS.GAME_STARTED]: (p: GameStartedPayload) => void;
  [EVENTS.BOARD_UPDATE]: (p: BoardUpdatePayload) => void;
  [EVENTS.SPECTRUM_UPDATE]: (p: SpectrumUpdatePayload) => void;
  [EVENTS.PENALTY]: (p: PenaltyPayload) => void;
  [EVENTS.PLAYER_GAMEOVER]: (p: PlayerGameOverPayload) => void;
  [EVENTS.GAME_OVER]: (p: GameOverPayload) => void;
  [EVENTS.HOST_CHANGED]: (p: HostChangedPayload) => void;
  [EVENTS.ERROR]: (p: ServerErrorPayload) => void;
}
export interface InterServerEvents { /* none (single node) */ }
export interface SocketData { readonly playerId: string; readonly room: string; readonly name: string; }
```

> Note: `index.ts` re-types nothing — it's a pure barrel (`export * from './types'; export * from './constants'; export * from './tetrominoes'; export * from './rng';`). `EVENTS`, `SPAWN`, `COLOR_ID`, etc. are runtime values; everything else here is erased at build.

---

### 3. `tetrominoes.ts` — shape/kick data + pure accessors (SRS)

```ts
// packages/shared/src/tetrominoes.ts
import type { Cell, Coord, PieceType, Position, RotationState, ActivePiece } from './types';

// SHAPES[type][rotation] = 4 occupied (col,row) cells inside the bounding box.
// I/O use a 4x4 box; J/L/S/T/Z use a 3x3 box. Data is the y-down table from the spec.
export const SHAPES: Record<PieceType, readonly [Coord, Coord, Coord, Coord][]> = {
  I: [
    [[0,1],[1,1],[2,1],[3,1]], // 0 spawn
    [[2,0],[2,1],[2,2],[2,3]], // 1 R
    [[0,2],[1,2],[2,2],[3,2]], // 2
    [[1,0],[1,1],[1,2],[1,3]], // 3 L
  ],
  O: [
    [[1,1],[2,1],[1,2],[2,2]],
    [[1,1],[2,1],[1,2],[2,2]],
    [[1,1],[2,1],[1,2],[2,2]],
    [[1,1],[2,1],[1,2],[2,2]],
  ],
  T: [
    [[1,0],[0,1],[1,1],[2,1]],
    [[1,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[2,1],[1,2]],
    [[1,0],[0,1],[1,1],[1,2]],
  ],
  S: [
    [[1,0],[2,0],[0,1],[1,1]],
    [[1,0],[1,1],[2,1],[2,2]],
    [[1,1],[2,1],[0,2],[1,2]],
    [[0,0],[0,1],[1,1],[1,2]],
  ],
  Z: [
    [[0,0],[1,0],[1,1],[2,1]],
    [[2,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[1,2],[2,2]],
    [[1,0],[0,1],[1,1],[0,2]],
  ],
  J: [
    [[0,0],[0,1],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[1,2]],
    [[0,1],[1,1],[2,1],[2,2]],
    [[1,0],[1,1],[0,2],[1,2]],
  ],
  L: [
    [[2,0],[0,1],[1,1],[2,1]],
    [[1,0],[1,1],[1,2],[2,2]],
    [[0,1],[1,1],[2,1],[0,2]],
    [[0,0],[1,0],[1,1],[1,2]],
  ],
};

// Color id per piece (re-exported from constants to keep one source).
export const COLORS: Record<PieceType, Cell> = {
  I: 1, O: 2, T: 3, S: 4, Z: 5, J: 6, L: 7,
};

// ---- SRS wall-kick tables, y-down (pre-converted from y-up literature) ----
// Key form: `${from}>${to}` e.g. '0>1'. Value: 5 candidate (dx,dy) offsets, first valid wins.
export const KICKS_JLSTZ: Record<string, readonly Coord[]> = {
  '0>1': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '1>0': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '1>2': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '2>1': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '2>3': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '3>2': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '3>0': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '0>3': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
};
export const KICKS_I: Record<string, readonly Coord[]> = {
  '0>1': [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
  '1>0': [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
  '1>2': [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
  '2>1': [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
  '2>3': [[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
  '3>2': [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
  '3>0': [[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
  '0>3': [[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
};

// ---- pure accessors ----

/** Wall-kick lookup key for a rotation transition, e.g. (0,1) -> '0>1'. PURE. */
export const kickKey = (from: RotationState, to: RotationState): string => `${from}>${to}`;

/** The 4 box-local cells for a piece in a rotation state. PURE (returns table ref; treat as readonly). */
export const shapeCells = (
  type: PieceType,
  rotation: RotationState,
): readonly Coord[] => SHAPES[type][rotation];

/** Correct kick table for a piece type (O has no kicks -> empty/no-op). PURE. */
export const kicksFor = (
  type: PieceType,
  from: RotationState,
  to: RotationState,
): readonly Coord[] => {
  if (type === 'O') return [[0, 0]];
  const table = type === 'I' ? KICKS_I : KICKS_JLSTZ;
  return table[kickKey(from, to)] ?? [[0, 0]];
};

/** Absolute board cells occupied by a piece at a given origin/rotation. PURE, allocates new array. */
export const cellsAt = (piece: ActivePiece): Coord[] =>
  SHAPES[piece.type][piece.rotation].map(
    ([c, r]) => [piece.x + c, piece.y + r] as Coord,
  );

/** Build a spawned piece (state 0 at SPAWN origin). PURE; needs SPAWN from constants. */
export const spawnPiece = (type: PieceType): ActivePiece => ({
  type,
  rotation: 0,
  x: SPAWN[type].x,
  y: SPAWN[type].y,
});
// (SPAWN imported from './constants' — shown here for completeness)
```

> The actual `collides` / `tryRotateCW` / `merge` / `clearLines` / `addPenaltyLines` / `computeSpectrum` engine functions live in `packages/client/src/engine` (and are called server-side from the OOP `Game`). `tetrominoes.ts` provides only the **data tables + zero-branch accessors** they consume, keeping the shared layer maximally testable.

---

### 4. `rng.ts` — deterministic PRNG + 7-bag (mulberry32)

```ts
// packages/shared/src/rng.ts
import type { PieceType } from './types';

// Canonical base order — LOCKED (part of the determinism contract).
export const PIECE_ORDER = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'] as const;

const BAG_SIZE = 7;
const GOLDEN = 0x9e3779b1; // per-bag seed offset constant (golden ratio, uint32)

/** Create a stateful PRNG returning floats in [0,1). Closure state (NO `this`). PURE factory. */
export const makeRng = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Fisher–Yates shuffle of the 7 base pieces using a given rng. PURE (consumes 6 rng() calls). */
export const shuffleBag = (rng: () => number): PieceType[] => {
  const bag: PieceType[] = [...PIECE_ORDER];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)); // 0..i inclusive
    const tmp = bag[i]!;
    bag[i] = bag[j]!;
    bag[j] = tmp;
  }
  return bag;
};

/** Produce the next 7-piece bag from a live rng. Thin alias over shuffleBag for the streaming API. PURE. */
export const nextBag = (rng: () => number): PieceType[] => shuffleBag(rng);

/**
 * Index-addressed piece accessor: the i-th piece of the game with this seed.
 * Stateless / idempotent / order-independent — any client computes the same piece
 * at any index from only the shared seed. PURE.
 */
export const pieceAt = (seed: number, index: number): PieceType => {
  const bagIndex = Math.floor(index / BAG_SIZE);
  const inBag = index % BAG_SIZE;
  const bagSeed = (seed + Math.imul(bagIndex, GOLDEN)) >>> 0;
  const bag = shuffleBag(makeRng(bagSeed));
  return bag[inBag]!;
};
```

**Two derivation modes — pick `pieceAt` everywhere (documented divergence):**
- `makeRng` + repeated `nextBag` = one continuous stream across bag boundaries (stateful cursor; convenient for a client that just wants "next, next, next").
- `pieceAt(seed, i)` = per-bag re-seed with `GOLDEN` offset; O(1) per arbitrary index, order-independent — required for late joiners/replays.
- **These two produce different global sequences.** Contract: the authoritative sequence is `pieceAt`. The server may keep a cursor and call `pieceAt(seed, cursor++)`; clients do the same. `nextBag/makeRng` are exposed for tests and any same-seed continuous-stream need, but MUST NOT be mixed with `pieceAt` for the live sequence.

---

### 5. Purity & unit-test plan (per module)

| Function / data | Pure? | How it's unit-tested (Vitest, node project) |
|---|---|---|
| `BOARD_WIDTH/HEIGHT`, `SOFT_DROP_MS`, `SPAWN`, `COLOR_ID`, `COLOR_HEX` | const | assert literal values; `SPAWN` has 7 keys; `COLOR_ID` bijection 1..7; `COLOR_HEX` keyed for 0..9 |
| `SHAPES` | data | each `SHAPES[type][rot]` has exactly 4 cells; all coords in box bounds (I/O 0..3, others 0..2); O identical across 4 states; per-type cell-count is always 4 |
| `KICKS_JLSTZ` / `KICKS_I` | data | each transition has exactly 5 offsets; first offset is `[0,0]`; all 8 CW+CCW keys present; golden snapshot of full tables (locks y-down conversion) |
| `kickKey` | pure | `kickKey(0,1)==='0>1'`; total over all 16 ordered pairs |
| `shapeCells` | pure | returns the SHAPES ref; length 4 for every (type,rot) |
| `kicksFor` | pure | `O` → `[[0,0]]`; `I` uses `KICKS_I`; others use `KICKS_JLSTZ`; unknown key → `[[0,0]]` fallback (branch) |
| `cellsAt` | pure | spawn `I` at SPAWN → board cols 3,4,5,6 on row 0; allocates new array (input `ActivePiece` unchanged — frozen-input test) |
| `spawnPiece` | pure | rotation 0, x/y === SPAWN[type]; returns fresh object |
| `makeRng` | pure factory | same seed → identical first-N stream; different seed → differs; all outputs in `[0,1)`; cross-"engine" stability via golden array for `makeRng(42)` first 10 |
| `shuffleBag` / `nextBag` | pure | output is a permutation of `PIECE_ORDER` (set-equal, length 7); deterministic for fixed seed; consumes exactly 6 rng calls (spy count) |
| `pieceAt` | pure | golden sequence for `pieceAt(42, 0..20)`; every consecutive 7-window is a permutation of the 7 types (7-bag invariant); `pieceAt` idempotent & order-independent (compute indices out of order, compare); two seeds differ |
| socket payload types | type-only | compile-time only; a `*.test-d.ts` (optional) asserts `ServerToClientEvents` keys === `EVENTS` server values |

Test mechanics: inputs deep-`Object.freeze`d before calling `cellsAt`/`spawnPiece`/`shuffleBag` so any accidental mutation throws → enforces purity. Determinism anchored by **golden arrays** (hardcoded expected outputs) for `makeRng(42)` and `pieceAt(42, i)`. These files live under the **node** Vitest project (`packages/shared/**/*.test.ts`), counted toward the 70/70/70/50 coverage gate; `index.ts` barrel excluded.

---

**Decisions / Risks / Open questions**

- **Decisions:** (1) Cell encoding fixed at `0` empty / `1..7` color / `8` penalty / `9` ghost — ghost is render-only and never enters the authoritative `Board`. (2) All closed sets are `as const` unions (no enums) to satisfy `erasableSyntaxOnly`. (3) `EVENTS` is a runtime `as const` map + typed `ClientToServerEvents`/`ServerToClientEvents` so client and server share exact channel names and payloads (no string drift). (4) `PenaltyPayload.lines` carries the already-decremented `n-1` (server does the math; shared layer stays policy-free). (5) `pieceAt` is the single authoritative sequence accessor; `makeRng`/`nextBag` exist for tests/streaming but must not be mixed into the live sequence. (6) Shared layer ships **data tables + zero-branch accessors only**; the stateful engine (`collides`, `tryRotateCW`, `clearLines`, `addPenaltyLines`, `computeSpectrum`, `hardDrop`) lives in `client/src/engine` and is invoked server-side — kept out of shared to avoid duplicating logic and to keep shared trivially pure-testable.
- **Risks:** (1) SRS kick tables are y-down-converted — copying a y-up table elsewhere breaks kicks; mitigated by golden snapshot tests. (2) `Board` is typed mutable (`Cell[][]`) for ergonomic engine returns; purity is a discipline enforced by frozen-input tests, not the type system. (3) `pieceAt` vs `makeRng` divergence is intentional but a footgun if mixed — locked by contract + tests. (4) `COLOR_HEX[9]` ('white') is a placeholder; real ghost styling is a CSS concern, not a fill color.
- **Open questions:** (1) Does the protocol want a separate `next` queue (multiple upcoming pieces) in `BoardUpdatePayload`, or just the single `next` type shown? (2) Should `softDrop` be a per-step action or a held-state toggle (`down:on/off`) — affects whether `GameAction` needs `softDropStart`/`softDropEnd`; current design models it as a discrete step. (3) Is `GHOST`/`COLOR_HEX[9]` needed in shared at all, or purely client-side? (4) Should `RoomState.seed` be withheld from non-host pre-start (it's harmless, but currently included as `null` until start).

=====

## SUBSYSTEM: server

## Server Subsystem (`packages/server`) — OOP Design Contract

The server is the **single source of truth** for game lifecycle, host election, piece-stream determinism, penalty routing, and win detection. It is written in OOP TypeScript (`this`, classes, prototypes — explicitly allowed server-side per spec p.5). The core data model is four classes — `Piece`, `Player`, `Game`, `GameRegistry` — plus a thin socket-handler layer and an Express 5 HTTP layer that shares one HTTP server with socket.io. The classes **own state** and call the **pure shared engine** (`@red-tetris/shared`) internally; the public API is genuinely class-based (not functional-in-disguise), satisfying the OO mandate.

### 0. Module map

```
packages/server/src/
  models/
    Piece.ts           class Piece          (value object: type+rotation+pos, immutable transforms)
    Player.ts          class Player         (per-connection game-participant state)
    Game.ts            class Game           (one room: players, seed, status, host, lifecycle)
    GameRegistry.ts    class GameRegistry   (Map<room, Game>; multi-game; getOrCreate/removeEmpty/find)
  socket/
    index.ts           registerSocketHandlers(io, registry)   (wires io.on('connection'))
    events.ts          SOCKET event-name constants + payload types (shared contract)
    SocketSession.ts   class SocketSession  (per-socket adapter: holds {socketId, room?, playerId?})
  http/
    createHttpApp.ts   buildApp(clientDist) -> express.Application (static + SPA fallback + /health)
  loop/
    GravityLoop.ts     class GravityLoop    (per-Game setInterval tick driver; mandatory constant 1000ms)
  index.ts             bootstrap: dotenv -> express app -> http.createServer -> new Server(io) -> registry -> listen
  config.ts            PORT, CLIENT_ORIGIN, GRAVITY_MS from process.env (with defaults)
```

Imports from `@red-tetris/shared` (pure, deterministic): `pieceAt`, `spawnPiece`, `collides`, `merge`, `clearLines`, `addPenaltyLines`, `computeSpectrum`, `SHAPES`, `COLORS`, `BOARD_WIDTH`, `BOARD_HEIGHT`, plus types `PieceType`, `Rotation`, `Board`, `ActivePiece`.

---

### 1. Class contracts

#### 1.1 `class Piece` — immutable value object (server-side mirror of `ActivePiece`)

A thin OOP wrapper over the shared `ActivePiece` shape. Server authority needs a `Piece` *type* for top-out / penalty bookkeeping; the heavy simulation stays in shared pure fns. All transforms return **new** `Piece` instances (the class is conceptually immutable — fields are `readonly`).

```ts
import type { PieceType, Rotation, ActivePiece, Board } from '@red-tetris/shared';
import { SHAPES, COLORS, spawnPiece, collides } from '@red-tetris/shared';

export class Piece {
  readonly type: PieceType;
  readonly rotation: Rotation;
  readonly x: number;            // board originX of the bounding box
  readonly y: number;            // board originY (spawn = -1)

  constructor(type: PieceType, rotation: Rotation = 0, x: number = 3, y: number = -1) {
    this.type = type;
    this.rotation = rotation;
    this.x = x;
    this.y = y;
  }

  /** Build the canonical spawn piece (state 0, SPAWN_X/SPAWN_Y) from a type. */
  static spawn(type: PieceType): Piece {
    const a = spawnPiece(type);              // pure shared fn = source of truth for spawn coords
    return new Piece(a.type, a.rotation, a.x, a.y);
  }

  /** Adapter to the shared pure-engine shape (engine fns take ActivePiece). */
  toActive(): ActivePiece {
    return { type: this.type, rotation: this.rotation, x: this.x, y: this.y };
  }
  static fromActive(a: ActivePiece): Piece {
    return new Piece(a.type, a.rotation, a.x, a.y);
  }

  /** Pure transforms — return NEW Piece (do not mutate this). */
  movedBy(dx: number, dy: number): Piece {
    return new Piece(this.type, this.rotation, this.x + dx, this.y + dy);
  }
  moveDown(): Piece { return this.movedBy(0, 1); }
  withRotation(r: Rotation): Piece { return new Piece(this.type, r, this.x, this.y); }

  /** Occupied board cells (col,row) for this piece's current state. */
  cells(): Array<[number, number]> {
    return SHAPES[this.type][this.rotation].map(([cx, cy]) => [this.x + cx, this.y + cy]);
  }
  colorId(): number { return COLORS[this.type]; }

  /** Convenience: does this piece collide on the given board? */
  collidesOn(board: Board): boolean { return collides(board, this.toActive()); }
}
```

**Invariants**
- `rotation ∈ {0,1,2,3}`; for `O`, rotation is rendered identically (engine treats O kicks as no-op).
- All mutators return fresh instances; existing instances are never mutated (`readonly` fields enforce at compile time).
- `cells()` are absolute board coordinates; may be `< 0` in `y` at spawn (`SPAWN_Y = -1`) — that is legal pre-lock.
- `Piece` performs **no** randomness and **no** wall-kick logic itself; SRS rotation (`tryRotateCW`) lives in shared and is invoked by `Game`, not `Piece`.

> Design note: rotation-with-kick is intentionally **not** a `Piece` method because it requires the `board` to test kicks. Keeping `Piece` board-agnostic preserves it as a pure value object; `Game` owns the board and calls the shared `tryRotateCW(board, piece.toActive())`.

#### 1.2 `class Player` — per-participant authoritative state

```ts
import { computeSpectrum, BOARD_WIDTH } from '@red-tetris/shared';
import type { Board } from '@red-tetris/shared';

export interface LobbyPlayerView {     // what serializeLobby exposes per player
  id: string;
  name: string;
  isHost: boolean;
  alive: boolean;
}
export interface PlayerPublicState {   // broadcast to opponents (NO full board)
  id: string;
  name: string;
  alive: boolean;
  spectrum: number[];                  // length 10, heights 0..20
}

export class Player {
  readonly id: string;                 // stable participant id (uuid) — survives reconnect
  socketId: string;                    // current transport id (changes on reconnect)
  readonly name: string;               // from URL /:room/:player; validated
  isHost: boolean;                     // server-assigned, never client-claimed
  alive: boolean;                      // false after top-out / mid-game disconnect
  spectrum: number[];                  // last reported column heights (length 10)
  currentPieceIndex: number;           // cursor into the deterministic stream (pieceAt index)
  lastSeen: number;                    // Date.now() of last activity (reconnect grace / GC)
  connected: boolean;                  // transport currently attached?

  constructor(id: string, socketId: string, name: string) {
    this.id = id;
    this.socketId = socketId;
    this.name = name;
    this.isHost = false;
    this.alive = true;
    this.spectrum = new Array(BOARD_WIDTH).fill(0);
    this.currentPieceIndex = 0;
    this.lastSeen = Date.now();
    this.connected = true;
  }

  touch(): void { this.lastSeen = Date.now(); }

  /** Update spectrum from a client-reported board OR a precomputed array. */
  setSpectrumFromBoard(board: Board): void { this.spectrum = computeSpectrum(board); }
  setSpectrum(spectrum: number[]): void { this.spectrum = spectrum; }

  /** Lifecycle helpers. */
  eliminate(): void { this.alive = false; }
  resetForRound(): void {
    this.alive = true;
    this.spectrum = new Array(BOARD_WIDTH).fill(0);
    this.currentPieceIndex = 0;
  }
  attachSocket(socketId: string): void { this.socketId = socketId; this.connected = true; this.touch(); }
  detachSocket(): void { this.connected = false; this.touch(); }

  toLobbyView(): LobbyPlayerView {
    return { id: this.id, name: this.name, isHost: this.isHost, alive: this.alive };
  }
  toPublicState(): PlayerPublicState {
    return { id: this.id, name: this.name, alive: this.alive, spectrum: this.spectrum };
  }
}
```

**Invariants**
- `spectrum.length === 10`, every entry `∈ [0,20]`.
- Exactly **one** player per `Game` has `isHost === true` while the game has ≥1 connected player (enforced by `Game.electHost`).
- `id` is identity for reconnect/host-migration; `socketId` is volatile. Match reconnects by `name` (in-room) → reattach to existing `Player.id`.
- `currentPieceIndex` only increases during `running`; reset to 0 by `resetForRound`. The server does **not** store the pieces — only the index (the seed reproduces them).

#### 1.3 `class Game` — one room, lifecycle authority

```ts
import { pieceAt, addPenaltyLines } from '@red-tetris/shared';
import { Player } from './Player.js';
import { Piece } from './Piece.js';

export type GameStatus = 'lobby' | 'running' | 'ended';

export interface PenaltyDistribution {
  from: string;                        // attacker playerId
  linesCleared: number;                // n
  penaltyCount: number;                // n-1
  targets: string[];                   // opponent playerIds who must apply addPenaltyLines(board, n-1)
}
export interface LobbyState {          // serializeLobby() — sent to the room on every roster change
  room: string;
  status: GameStatus;
  hostId: string | null;
  seed: number | null;                 // null until running
  players: import('./Player.js').LobbyPlayerView[];
}
export interface WinResult {
  decided: boolean;
  winnerId: string | null;             // null = draw OR solo self-end
  reason: 'last-standing' | 'solo-end' | 'draw' | 'not-decided';
}

export class Game {
  readonly room: string;
  private players: Player[];           // INSERTION-ORDERED (host election + determinism rely on order)
  seed: number | null;                 // numeric PRNG seed; chosen at start(), broadcast in game:start
  status: GameStatus;
  hostId: string | null;
  startedAt: number | null;
  private starterIds: Set<string>;     // players who were present at start() (for solo-vs-multi win logic)

  constructor(room: string) {
    this.room = room;
    this.players = [];
    this.seed = null;
    this.status = 'lobby';
    this.hostId = null;
    this.startedAt = null;
    this.starterIds = new Set();
  }

  // ---- roster ----------------------------------------------------------
  /** Add (or reattach) a player. Returns the Player. Rejects new joins while running (see canJoin). */
  addPlayer(id: string, socketId: string, name: string): Player {
    const existing = this.findByName(name);
    if (existing) { existing.attachSocket(socketId); return existing; }   // reconnect/resume
    const p = new Player(id, socketId, name);
    this.players.push(p);
    if (this.players.length === 1) { p.isHost = true; this.hostId = p.id; } // first = host
    return p;
  }
  /** True iff a *new* name may join right now (lobby only; running rejects new names). */
  canJoin(name: string): boolean {
    if (this.status !== 'running') return true;
    return this.findByName(name) !== undefined;   // reconnect of an in-game player allowed
  }
  removePlayer(playerId: string): void {
    const wasHost = this.hostId === playerId;
    this.players = this.players.filter((p) => p.id !== playerId);
    if (wasHost) this.electHost();
    if (this.status === 'running') this.checkWinAfterChange();
  }
  /** Soft disconnect (keep slot for reconnect grace); mid-game disconnect also eliminates. */
  handleDisconnect(playerId: string): void {
    const p = this.find(playerId);
    if (!p) return;
    p.detachSocket();
    if (this.status === 'running') { p.eliminate(); this.checkWinAfterChange(); }
    if (this.hostId === playerId) this.electHost();
  }

  // ---- host election ---------------------------------------------------
  /** Promote the first still-present player to host. Idempotent. */
  electHost(): string | null {
    const next = this.players.find((p) => p.connected) ?? this.players[0];
    this.players.forEach((p) => (p.isHost = false));
    if (next) { next.isHost = true; this.hostId = next.id; } else { this.hostId = null; }
    return this.hostId;
  }
  isHost(playerId: string): boolean { return this.hostId === playerId; }

  // ---- lifecycle -------------------------------------------------------
  /** HOST-ONLY. lobby|ended -> running. Picks seed, resets players, snapshots starters. */
  start(byPlayerId: string): boolean {
    if (!this.isHost(byPlayerId)) return false;
    if (this.status === 'running') return false;
    if (this.players.length === 0) return false;
    this.seed = (Math.random() * 0x1_0000_0000) >>> 0;   // ONE random call — the only entropy in the whole game
    this.players.forEach((p) => p.resetForRound());
    this.starterIds = new Set(this.players.map((p) => p.id));
    this.status = 'running';
    this.startedAt = Date.now();
    return true;
  }
  /** HOST-ONLY. ended|running -> running with a fresh seed. */
  restart(byPlayerId: string): boolean {
    if (!this.isHost(byPlayerId)) return false;
    return this.start(byPlayerId);   // start() re-seeds + resets; status forced to running
  }

  // ---- determinism -----------------------------------------------------
  /** The piece TYPE at a given stream index (pure function of seed,index). Throws if not started. */
  pieceForIndex(index: number): PieceType {
    if (this.seed === null) throw new GameNotStartedError(this.room);
    return pieceAt(this.seed, index);
  }
  /** Convenience: spawn-positioned Piece object at an index. */
  pieceObjectForIndex(index: number): Piece {
    return Piece.spawn(this.pieceForIndex(index));
  }

  // ---- attack (penalty routing) ----------------------------------------
  /**
   * A player cleared n lines. Returns the penalty distribution (n-1 to every OTHER alive player).
   * Pure routing: returns data; the socket layer broadcasts it. n<=1 => empty targets.
   */
  registerLineClear(playerId: string, n: number): PenaltyDistribution {
    const penaltyCount = Math.max(0, n - 1);
    const targets =
      penaltyCount === 0
        ? []
        : this.players
            .filter((p) => p.id !== playerId && p.alive)
            .map((p) => p.id);
    return { from: playerId, linesCleared: n, penaltyCount, targets };
  }

  // ---- spectrum --------------------------------------------------------
  /** Record a player's reported spectrum; returns the public state to rebroadcast. */
  updateSpectrum(playerId: string, spectrum: number[]): PlayerPublicState | null {
    const p = this.find(playerId);
    if (!p) return null;
    p.setSpectrum(spectrum);
    p.touch();
    return p.toPublicState();
  }

  // ---- elimination & win ----------------------------------------------
  /** Mark a player topped-out. Returns the win result (caller broadcasts if decided). */
  eliminate(playerId: string): WinResult {
    const p = this.find(playerId);
    if (p) p.eliminate();
    return this.checkWinAfterChange();
  }
  private alivePlayers(): Player[] { return this.players.filter((p) => p.alive); }

  /** Evaluate win condition; flips status to 'ended' when decided. */
  winner(): WinResult {
    const starters = this.starterIds.size;
    const alive = this.alivePlayers();
    if (this.status !== 'running') return { decided: false, winnerId: null, reason: 'not-decided' };
    if (starters >= 2) {
      if (alive.length === 1) return { decided: true, winnerId: alive[0].id, reason: 'last-standing' };
      if (alive.length === 0) return { decided: true, winnerId: null, reason: 'draw' };          // simultaneous death
      return { decided: false, winnerId: null, reason: 'not-decided' };
    }
    // solo (starters === 1): ends when that one player dies
    if (alive.length === 0) return { decided: true, winnerId: null, reason: 'solo-end' };
    return { decided: false, winnerId: null, reason: 'not-decided' };
  }
  private checkWinAfterChange(): WinResult {
    const res = this.winner();
    if (res.decided) { this.status = 'ended'; }
    return res;
  }

  // ---- serialization ---------------------------------------------------
  serializeLobby(): LobbyState {
    return {
      room: this.room,
      status: this.status,
      hostId: this.hostId,
      seed: this.status === 'running' ? this.seed : null,
      players: this.players.map((p) => p.toLobbyView()),
    };
  }
  publicStates(): PlayerPublicState[] { return this.players.map((p) => p.toPublicState()); }

  // ---- lookups ---------------------------------------------------------
  find(playerId: string): Player | undefined { return this.players.find((p) => p.id === playerId); }
  findByName(name: string): Player | undefined { return this.players.find((p) => p.name === name); }
  findBySocket(socketId: string): Player | undefined { return this.players.find((p) => p.socketId === socketId); }
  get size(): number { return this.players.length; }
  get isEmpty(): boolean { return this.players.length === 0; }
  get connectedCount(): number { return this.players.filter((p) => p.connected).length; }
  listPlayers(): readonly Player[] { return this.players; }
}
```

**Invariants**
- `status` transitions only via the state machine (§4); only `start`/`restart` (host-gated) enter `running`; only `checkWinAfterChange` enters `ended`.
- `seed !== null` ⇔ a round has started; `pieceForIndex` throws (`GameNotStartedError`) otherwise.
- `players` array order is **stable insertion order** — host election picks the earliest still-present player; never reordered.
- `registerLineClear` always returns `penaltyCount = max(0, n-1)`; `n=1 → 0 targets` (no self-penalty, ever).
- The **only** source of randomness in the entire game is `start()`'s single `Math.random()` seed pick; everything downstream is a pure function of that seed.

#### 1.4 `class GameRegistry` — multiple concurrent games

```ts
import { Game } from './Game.js';

export class GameRegistry {
  private games: Map<string, Game>;
  constructor() { this.games = new Map(); }

  /** Find or create the Game for a room (idempotent; first caller creates). */
  getOrCreate(room: string): Game {
    let g = this.games.get(room);
    if (!g) { g = new Game(room); this.games.set(room, g); }
    return g;
  }
  find(room: string): Game | undefined { return this.games.get(room); }
  has(room: string): boolean { return this.games.has(room); }

  /** Drop a room iff it has no players (called after every leave/disconnect). */
  removeEmpty(room: string): boolean {
    const g = this.games.get(room);
    if (g && g.isEmpty) { this.games.delete(room); return true; }
    return false;
  }
  remove(room: string): void { this.games.delete(room); }

  get roomCount(): number { return this.games.size; }
  rooms(): string[] { return [...this.games.keys()]; }
  /** Reverse lookup for disconnect: which game holds this socket? */
  findBySocket(socketId: string): { game: Game; playerId: string } | undefined {
    for (const g of this.games.values()) {
      const p = g.findBySocket(socketId);
      if (p) return { game: g, playerId: p.id };
    }
    return undefined;
  }
}
```

**Invariants**
- One `Game` per room name; `Map` keys are room names. Per-game state lives **only** on the `Game` instance — **no module-level mutable globals** (cross-room isolation; spec row 17).
- `removeEmpty` is called after every `removePlayer`/`handleDisconnect` so abandoned rooms are GC'd; an active round's room is never auto-removed while ≥1 player remains.

#### 1.5 Custom error (the one place `this` is *also* fine — and required even on server)

```ts
export class GameNotStartedError extends Error {
  constructor(room: string) {
    super(`Game for room "${room}" has not started; seed is null.`);
    this.name = 'GameNotStartedError';   // 'this' is the canonical Error-subclass exception
  }
}
```

---

### 2. Socket handler module structure

One **socket.io room per game room** (`socket.join(room)`); all broadcasts scoped with `io.to(room)`. Handlers are thin: they validate, call a `Game`/`Player`/`GameRegistry` method, then emit. No game logic in handlers.

#### 2.1 Event constants & payloads (`socket/events.ts`)

```ts
export const C2S = {
  JOIN: 'game:join',                 // { room, name }
  START: 'game:start',               // {}            (host-only; server validates)
  RESTART: 'game:restart',           // {}
  LINE_CLEAR: 'player:lineclear',    // { n }         (client reports n cleared; server routes penalty)
  SPECTRUM: 'player:spectrum',       // { spectrum:number[10] }
  GAME_OVER: 'player:topout',        // {}            (client reports its own top-out)
  LEAVE: 'game:leave',               // {}
} as const;

export const S2C = {
  LOBBY: 'lobby:update',             // LobbyState                       (roster/host/status changed)
  START: 'game:start',               // { seed:number, startedAt:number, players: LobbyPlayerView[] }
  PENALTY: 'player:penalty',         // { from, penaltyCount }           (targeted: io.to(socketId))
  SPECTRUM: 'spectrum:update',       // PlayerPublicState  { id,name,alive,spectrum }
  PLAYER_OUT: 'player:gameover',     // { playerId }
  GAME_OVER: 'game:over',            // { winnerId, reason }
  HOST: 'host:update',               // { hostId }
  JOIN_REJECTED: 'game:join_rejected', // { reason }
  ERROR: 'game:error',               // { code, message }
} as const;
```

#### 2.2 Handler → method map

| C2S event | Validation | Game/Player/Registry calls | Emits (S2C) |
|---|---|---|---|
| `game:join` `{room,name}` | parse/validate `room`,`name` (non-empty, length, charset); `game.canJoin(name)` | `g = registry.getOrCreate(room)`; if `!g.canJoin` → reject; else `socket.join(room)`; `p = g.addPlayer(uuid(), socket.id, name)`; bind `session={room,playerId:p.id}` | on reject: `JOIN_REJECTED` to socket. on success: `io.to(room).emit(LOBBY, g.serializeLobby())`; `HOST` if host set |
| `game:start` `{}` | `g.isHost(session.playerId)` | `ok = g.start(session.playerId)` | if ok: `io.to(room).emit(START, { seed:g.seed, startedAt:g.startedAt, players })` + `LOBBY`; start `GravityLoop` (server-auth tick). else `ERROR` |
| `game:restart` `{}` | host-only | `g.restart(playerId)` | same as start (new seed) |
| `player:lineclear` `{n}` | player alive & game running | `dist = g.registerLineClear(playerId, n)` | for each `targetId` in `dist.targets`: `io.to(targetSocketId).emit(PENALTY, { from, penaltyCount:dist.penaltyCount })` |
| `player:spectrum` `{spectrum}` | length-10, ints 0..20 | `pub = g.updateSpectrum(playerId, spectrum)` | `io.to(room).emit(SPECTRUM, pub)` (opponents render bars; **never** full board) |
| `player:topout` `{}` | game running | `res = g.eliminate(playerId)` | `io.to(room).emit(PLAYER_OUT,{playerId})`; if `res.decided`: `io.to(room).emit(GAME_OVER,{winnerId,reason})` + stop loops + `LOBBY` |
| `game:leave` `{}` | — | `g.removePlayer(playerId)`; `registry.removeEmpty(room)` | `io.to(room).emit(LOBBY,...)`; `HOST` if migrated; `GAME_OVER` if leave decided the win |
| `disconnect` (builtin) | — | `hit = registry.findBySocket(socket.id)`; `hit.game.handleDisconnect(hit.playerId)`; `registry.removeEmpty(room)` | `LOBBY`; `HOST` if migrated; `PLAYER_OUT`+`GAME_OVER` if mid-game disconnect decided it |

#### 2.3 `registerSocketHandlers(io, registry)` skeleton

```ts
export function registerSocketHandlers(io: Server, registry: GameRegistry): void {
  io.on('connection', (socket) => {
    const session = new SocketSession(socket.id);   // { socketId, room?, playerId? }

    socket.on(C2S.JOIN, ({ room, name }) => {
      const safeRoom = validateRoom(room), safeName = validateName(name);
      const g = registry.getOrCreate(safeRoom);
      if (!g.canJoin(safeName)) { socket.emit(S2C.JOIN_REJECTED, { reason: 'in-progress' }); return; }
      socket.join(safeRoom);
      const p = g.addPlayer(randomUUID(), socket.id, safeName);
      session.bind(safeRoom, p.id);
      io.to(safeRoom).emit(S2C.LOBBY, g.serializeLobby());
    });

    socket.on(C2S.START, () => withGame(registry, session, (g) => {
      if (!g.start(session.playerId!)) return socket.emit(S2C.ERROR, { code: 'NOT_HOST', message: '...' });
      io.to(session.room!).emit(S2C.START, { seed: g.seed, startedAt: g.startedAt,
        players: g.serializeLobby().players });
      io.to(session.room!).emit(S2C.LOBBY, g.serializeLobby());
      gravityLoops.start(g, io);   // server-authoritative gravity (mandatory: 1000ms tick)
    }));

    socket.on(C2S.LINE_CLEAR, ({ n }) => withGame(registry, session, (g) => {
      const d = g.registerLineClear(session.playerId!, n);
      for (const targetId of d.targets) {
        const t = g.find(targetId);
        if (t) io.to(t.socketId).emit(S2C.PENALTY, { from: d.from, penaltyCount: d.penaltyCount });
      }
    }));

    socket.on(C2S.SPECTRUM, ({ spectrum }) => withGame(registry, session, (g) => {
      const pub = g.updateSpectrum(session.playerId!, spectrum);
      if (pub) io.to(session.room!).emit(S2C.SPECTRUM, pub);
    }));

    socket.on(C2S.GAME_OVER, () => withGame(registry, session, (g) => {
      const res = g.eliminate(session.playerId!);
      io.to(session.room!).emit(S2C.PLAYER_OUT, { playerId: session.playerId });
      if (res.decided) { gravityLoops.stop(g); io.to(session.room!).emit(S2C.GAME_OVER, res); }
    }));

    const onLeaveOrDisconnect = () => {
      if (!session.room || !session.playerId) return;
      const g = registry.find(session.room);
      if (!g) return;
      g.handleDisconnect(session.playerId);
      io.to(session.room).emit(S2C.LOBBY, g.serializeLobby());
      io.to(session.room).emit(S2C.HOST, { hostId: g.hostId });
      const res = g.winner();
      if (res.decided) { gravityLoops.stop(g); io.to(session.room).emit(S2C.GAME_OVER, res); }
      registry.removeEmpty(session.room);
    };
    socket.on(C2S.LEAVE, onLeaveOrDisconnect);
    socket.on('disconnect', onLeaveOrDisconnect);
  });
}
```

`SocketSession` is a tiny per-socket adapter (`bind(room,playerId)`, fields `socketId/room/playerId`) so handlers stay stateless w.r.t. the socket. `withGame(registry, session, fn)` resolves `session.room → Game` and no-ops if missing (guards every running-state handler).

---

### 3. HTTP layer (Express 5 + shared HTTP server)

```ts
// http/createHttpApp.ts
import express from 'express';
import path from 'node:path';

export function buildApp(clientDist: string): express.Application {
  const app = express();
  app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
  app.use(express.static(clientDist));        // serves index.html, bundle.js, assets — BEFORE fallback
  // Express 5 / path-to-regexp v8: bare '*' THROWS. Use a named splat for SPA deep links.
  app.get('/*splat', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  return app;
}
```

```ts
// index.ts (bootstrap) — one HTTP server shared by Express + socket.io
import 'dotenv/config';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildApp } from './http/createHttpApp.js';
import { GameRegistry } from './models/GameRegistry.js';
import { registerSocketHandlers } from './socket/index.js';
import { PORT, CLIENT_ORIGIN, isDev } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

const app = buildApp(clientDist);
const httpServer = createServer(app);                 // SINGLE server
const io = new Server(httpServer, {
  cors: isDev ? { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] } : {},
});
const registry = new GameRegistry();
registerSocketHandlers(io, registry);

httpServer.listen(PORT, () => console.log(`Red Tetris on http://localhost:${PORT}`));
export { app, io, httpServer, registry };
```

**HTTP layer rules / gotchas**
- `express.static(clientDist)` is mounted **before** the SPA fallback so real files (`/bundle.js`) win; the named-splat `'/*splat'` returns `index.html` for BrowserRouter deep links like `/myroom/alice`. Bare `'*'` is **illegal** in Express 5 (path-to-regexp v8 → `TypeError: Missing parameter name`).
- `/health` returns `{status:'ok'}` for liveness checks; placed first so it is never shadowed by static/fallback.
- socket.io shares `httpServer` — it intercepts the `/socket.io/` upgrade path; **no second port**. In dev, the Vite proxy forwards `/socket.io` (ws:true) to `:3000`, so `cors.origin` only matters for direct non-proxied connections (kept set for safety).
- No global `express.json()` unless REST routes are added — game traffic rides socket.io.
- `clientDist` resolves to `packages/client/dist` (built by `npm run build` order: shared → client → server).

---

### 4. Game lifecycle state machine

```
            host start()              one player remains / all die / solo-death
   ┌──────┐ ───────────────► ┌─────────┐ ───────────────────────────────► ┌───────┐
   │lobby │                  │ running │                                   │ ended │
   └──────┘ ◄─────────────── └─────────┘ ◄──────── host restart() ──────── └───────┘
       ▲   (room empties: Game removed by registry, not a status)  │
       │                                                            │
       └──────────────── host restart() also from ended ───────────┘
```

| From | To | Trigger (who) | Method | Side effects |
|---|---|---|---|---|
| `lobby` | `running` | **host** clicks Start | `Game.start(hostId)` | pick `seed` (only entropy), `resetForRound()` all, snapshot `starterIds`, `startedAt=now`; emit `START`+`LOBBY`; spin up `GravityLoop` |
| `running` | `running` | any player joins via deep link | rejected | `canJoin` false → `JOIN_REJECTED` (no new names mid-round; reconnect of existing name allowed) |
| `running` | `ended` | last-man-standing / all-dead / solo top-out | `eliminate`/`handleDisconnect` → `checkWinAfterChange` | status→`ended`; stop `GravityLoop`; emit `GAME_OVER {winnerId,reason}` |
| `running` | `running` | host migration mid-game | `electHost` | new `hostId`; emit `HOST`; status unchanged |
| `ended` | `running` | **host** clicks Restart | `Game.restart(hostId)` | new `seed`, `resetForRound()` all, new `starterIds`; emit `START` |
| any | (removed) | room empties | `registry.removeEmpty(room)` | `Game` instance deleted (not a status); next join `getOrCreate`s a fresh one |

**Who triggers what**
- **Host only**: `start`, `restart` (server enforces via `isHost`).
- **Any player**: `join` (lobby only for new names), `lineclear`, `spectrum`, `topout`, `leave`.
- **Server (automatic)**: host election on host-leave, win detection on every elimination/disconnect, room GC on empty, gravity tick while `running`.
- **Win reasons**: `last-standing` (≥2 starters, 1 alive), `draw` (≥2 starters, 0 alive — simultaneous death, deterministic by processing order), `solo-end` (1 starter dies → `winnerId:null`), `not-decided` (still running).

---

### 5. Decision: server tracks **seed + per-player spectrum + alive/host/index**, NOT full boards

**What the server stores per game:** `seed:number`, `status`, `hostId`, `starterIds`; per player: `id, socketId, name, isHost, alive, spectrum:number[10], currentPieceIndex, lastSeen, connected`. **It does not store the 10×20 board of any player.**

**Why this is sufficient — and correct:**

| Requirement | How it's satisfied without server-side boards |
|---|---|
| **Determinism** (same pieces, same coords, even at different times) | The single numeric `seed` + pure `pieceAt(seed,index)` reproduces the *entire* stream on every client identically. The server only broadcasts `seed` once (`game:start`); no piece data ever crosses the wire again. A board would be redundant — it's derivable from `seed` + inputs, which the client already has. |
| **Penalty routing** (n cleared → n−1 to opponents) | `registerLineClear(playerId,n)` needs only the roster + `alive` flags to compute `targets` + `penaltyCount`. The *receiver* applies `addPenaltyLines(board,n−1)` to its **own** client-side board. The server routes the number, not the board. |
| **Win detection** (last man standing) | Driven by `alive` booleans + `starterIds.size`, flipped by `player:topout`/disconnect events. Top-out is decided by the client running the *same deterministic engine* (`isTopOut`) and reporting it; the survivor count is pure roster arithmetic. |
| **Spectrum / opponent preview** | Only the 10-int `spectrum[]` is needed for opponents' bars — that is precisely what the server stores and rebroadcasts. The full opponent board must **not** be shown (spec wants only the silhouette), so storing it would be useless and a privacy leak. |

**Trade-off acknowledged (semi-authoritative model):** the client is trusted to report `lineclear`/`topout`/`spectrum`. Because every client runs the *same* deterministic pure engine off the *same* seed+inputs, a correct client's reports are reproducible and verifiable in principle. This keeps the server lightweight (one seed + small per-player metadata per room → trivial memory, supports many concurrent games) while still owning the **authoritative** facts that decide the game: roster, host, alive-set, seed, status. **If full anti-cheat authority were required**, the server would re-simulate each board from `seed`+input log using the same shared pure fns (the data model already carries `currentPieceIndex` to support this) and override client reports — but the mandatory spec ("no scoring", "last remaining player wins", trusted classroom peers) does not require it, and the determinism guarantee means the server *can* reconstruct any board on demand from data it already holds. Storing live boards buys nothing the seed doesn't already guarantee.

---

**Decisions / Risks / Open questions**

- **Decision:** Server is authoritative for roster/host/alive/seed/status only; boards are derived client-side from the broadcast `seed` via shared pure fns. One socket.io room per game; all broadcasts `io.to(room)`-scoped for concurrent-game isolation.
- **Decision:** `Piece` is an immutable value object (`readonly` fields, transforms return new instances); SRS rotation-with-kick stays in shared and is invoked by `Game` (needs board), keeping `Piece` board-agnostic. `Player`/`Game`/`GameRegistry` are genuinely stateful classes (OO mandate satisfied — not functional-in-disguise).
- **Decision:** Single entropy source = `Math.random()` in `Game.start()` choosing the numeric seed; everything else pure. `pieceForIndex` throws `GameNotStartedError` (the one server `this`-in-Error case) when `seed===null`.
- **Decision:** Penalty = `max(0,n−1)` targeted only at *alive* opponents via `io.to(socketId)` (not room-wide), so attackers never penalize themselves and dead players are skipped.
- **Decision:** Reconnect/host-migration keyed on stable `Player.id` (match by `name` within room); `disconnect` mid-`running` eliminates the player (so games can't hang) and re-elects host if needed.
- **Risk:** Semi-authoritative trust — a malicious client could spoof `lineclear`/`topout`. Mitigation path already designed in (server can re-simulate from `seed`+`currentPieceIndex` using shared pure fns); deferred since spec doesn't mandate anti-cheat.
- **Risk:** `GravityLoop` (per-`Game` `setInterval`) must be stopped on `ended`/empty-room or it leaks timers; every win/leave path calls `gravityLoops.stop`. Whether gravity is truly server-driven or the client owns its own clock and only *reports* events is an open contract point with the client/networking designer.
- **Open question:** Is the line-clear/top-out authority client-reported (lightweight, chosen here) or server-simulated (heavier, fully authoritative)? Current design is client-reported with a documented upgrade path.
- **Open question:** Reconnect-grace window length (`lastSeen`-based) before a disconnected slot is GC'd — needs a concrete timeout (e.g. 0ms = immediate eliminate, chosen for win-liveness) coordinated with the client's resume UX.
- **Open question:** Should `game:start` also stream the starting `players` roster snapshot for late-render ordering, or rely on the prior `LOBBY`? Currently sends both for safety; could dedupe.

=====

## SUBSYSTEM: client

## Client Subsystem — Functional React + Pure Engine (`packages/client`)

This is the complete design for `packages/client`. **Hard invariant:** zero `this` anywhere except `src/errors/*.error.ts` (custom `Error` subclasses), banned by ESLint `no-restricted-syntax: ThisExpression`. All engine logic is pure (no mutation of inputs, no I/O, no `Math.random`/`Date.now`). The OOP classes live ONLY server-side; the client reuses the *same pure shared functions* for optimistic rendering and reconciles to authoritative server state on every lock/clear/penalty.

Directory layout:

```
packages/client/
  index.html
  vite.config.ts
  vitest.setup.ts
  src/
    main.tsx                     # createRoot + <Provider> + <BrowserRouter> (no this)
    engine/                      # PURE functions (re-export shared + client-only glue)
      board.ts  piece.ts  collision.ts  movement.ts  rotation.ts
      drop.ts   lock.ts  lines.ts  penalty.ts  spectrum.ts  gameover.ts
      index.ts                   # barrel
    store/
      index.ts                   # configureStore + RootState/AppDispatch types
      lobbySlice.ts  gameSlice.ts  opponentsSlice.ts
      socketMiddleware.ts        # socket.io <-> redux bridge
      selectors.ts
    socket/
      socket.ts                  # io() singleton, event-name constants
    hooks/
      useGameLoop.ts  useKeyboard.ts  useAppDispatch.ts  useAppSelector.ts
    components/
      App.tsx  AppRouter.tsx
      Board.tsx  Cell.tsx  NextPiece.tsx
      OpponentsPanel.tsx  OpponentSpectrum.tsx
      Lobby.tsx  Controls.tsx  GameOverOverlay.tsx
      *.module.css
    routes/
      GameRoute.tsx              # reads useParams -> dispatch join; renders Lobby or Game
    errors/
      JoinError.error.ts         # the ONLY place `this` is allowed
    types.ts                     # client-local view types
```

All engine functions import shared types/data from `@shared/*` (`Board`, `Cell`, `ActivePiece`, `PieceType`, `Rotation`, `SHAPES`, `KICKS_*`, `COLORS`, `pieceAt`, constants). The client `engine/` re-exports the canonical shared pure functions and adds only thin client glue; **the shared implementations are authoritative** so client and server stay bit-identical.

---

### 1. `engine/` — Pure Functions (signatures + exact semantics)

Conventions: `Board = Cell[][]` indexed `[row][col]`, `row ∈ 0..19` (y, top→bottom), `col ∈ 0..9` (x, left→right). `Cell = 0` empty, `1..7` color ids, `8` penalty. `ActivePiece = { type, rotation, x, y }` where `(x,y)` is the bounding-box top-left in board coords. **Every function returns a NEW value; inputs are never mutated** (verified in tests via deep `Object.freeze`).

```ts
// engine/board.ts
import { BOARD_WIDTH, BOARD_HEIGHT, EMPTY } from '@shared/constants';
import type { Board } from '@shared/types';

/** A fresh 20×10 board filled with EMPTY (0). New array every call. */
export const createBoard = (): Board =>
  Array.from({ length: BOARD_HEIGHT }, () => Array<Cell>(BOARD_WIDTH).fill(EMPTY));

/** Deep clone (used internally by mutating-looking ops to keep purity). */
export const cloneBoard = (board: Board): Board => board.map((row) => [...row]);

/** True iff (col,row) is inside the 10×20 field. */
export const inBounds = (col: number, row: number): boolean =>
  col >= 0 && col < BOARD_WIDTH && row >= 0 && row < BOARD_HEIGHT;
```

```ts
// engine/piece.ts
import { SHAPES, COLORS, SPAWN_X, SPAWN_Y } from '@shared/tetrominoes';
import type { ActivePiece, PieceType, Rotation } from '@shared/types';

/** Spawn piece at canonical origin (state 0). originX=3, originY=-1 for all types. */
export const spawnPiece = (type: PieceType): ActivePiece => ({
  type,
  rotation: 0 as Rotation,
  x: SPAWN_X,            // 3
  y: SPAWN_Y,            // -1 (top box-row sits above the field)
});

/** Absolute board cells occupied by a piece: [{col,row}, ...] (length 4). */
export const pieceCells = (p: ActivePiece): { col: number; row: number }[] =>
  SHAPES[p.type][p.rotation].map(([dx, dy]) => ({ col: p.x + dx, row: p.y + dy }));

/** Color id (1..7) for rendering this piece's filled cells. */
export const pieceColor = (type: PieceType): Cell => COLORS[type];
```

```ts
// engine/collision.ts
import type { Board, ActivePiece } from '@shared/types';
import { pieceCells } from './piece';
import { EMPTY, BOARD_WIDTH, BOARD_HEIGHT } from '@shared/constants';

/**
 * True if piece overlaps a wall, the floor, or any non-empty cell.
 * Cells with row < 0 (above the field) are ALLOWED (spawn buffer) as long as
 * col is in range — they only collide once they enter row >= 0 onto a filled cell.
 */
export const collides = (board: Board, p: ActivePiece): boolean =>
  pieceCells(p).some(({ col, row }) => {
    if (col < 0 || col >= BOARD_WIDTH) return true;      // side walls
    if (row >= BOARD_HEIGHT) return true;                // floor
    if (row < 0) return false;                           // above field = free
    return board[row][col] !== EMPTY;                    // landed-on cell
  });
```

```ts
// engine/movement.ts  — translate then validate; return SAME piece if blocked
import type { Board, ActivePiece } from '@shared/types';
import { collides } from './collision';

const tryShift = (board: Board, p: ActivePiece, dx: number, dy: number): ActivePiece => {
  const moved = { ...p, x: p.x + dx, y: p.y + dy };
  return collides(board, moved) ? p : moved;
};

export const moveLeft  = (board: Board, p: ActivePiece): ActivePiece => tryShift(board, p, -1, 0);
export const moveRight = (board: Board, p: ActivePiece): ActivePiece => tryShift(board, p,  1, 0);
/** One-row gravity step. Returns SAME piece if it cannot descend (i.e. grounded). */
export const moveDown  = (board: Board, p: ActivePiece): ActivePiece => tryShift(board, p,  0, 1);

/** Convenience predicate for the lock machine: would moving down collide? */
export const isGrounded = (board: Board, p: ActivePiece): boolean =>
  collides(board, { ...p, y: p.y + 1 });
```

```ts
// engine/rotation.ts  — SRS, delegates kick tables to @shared
import type { Board, ActivePiece, Rotation } from '@shared/types';
import { SHAPES, KICKS_I, KICKS_JLSTZ } from '@shared/tetrominoes';
import { collides } from './collision';

const kickSet = (type: ActivePiece['type']) =>
  type === 'I' ? KICKS_I : KICKS_JLSTZ; // 'O' → handled below (no-op)

/**
 * Clockwise SRS rotation with wall kicks.
 * Returns the rotated+kicked piece if any of the 5 candidate offsets is valid;
 * returns the ORIGINAL piece (unchanged) if all kicks collide. O-piece: identity.
 */
export const rotate = (board: Board, p: ActivePiece): ActivePiece => {
  if (p.type === 'O') return p;                          // O never effectively rotates
  const next = ((p.rotation + 1) & 3) as Rotation;
  const kicks = kickSet(p.type)[`${p.rotation}>${next}`]; // [[dx,dy] x5], y already y-down
  for (const [dx, dy] of kicks) {
    const cand = { ...p, rotation: next, x: p.x + dx, y: p.y + dy };
    if (!collides(board, cand)) return cand;             // first valid wins
  }
  return p;                                              // rejected → unchanged
};
```

```ts
// engine/drop.ts
import type { Board, ActivePiece } from '@shared/types';
import { collides } from './collision';
import { isGrounded } from './movement';

/** Soft drop: identical to one gravity step (caller schedules it 20× faster). */
export const softDrop = (board: Board, p: ActivePiece): ActivePiece =>
  isGrounded(board, p) ? p : { ...p, y: p.y + 1 };

/** Hard drop: returns the LANDED piece (lowest valid y). Caller LOCKs it same tick. */
export const hardDrop = (board: Board, p: ActivePiece): ActivePiece => {
  let q = p;
  while (!collides(board, { ...q, y: q.y + 1 })) q = { ...q, y: q.y + 1 };
  return q;                                              // immobile next; bypasses grace
};

/** Ghost piece position (for rendering a drop preview); same math as hardDrop. */
export const ghostPiece = (board: Board, p: ActivePiece): ActivePiece => hardDrop(board, p);
```

```ts
// engine/lock.ts
import type { Board, ActivePiece } from '@shared/types';
import { pieceCells, pieceColor } from './piece';
import { cloneBoard } from './board';
import { BOARD_HEIGHT, BOARD_WIDTH } from '@shared/constants';

/**
 * Merge piece into a NEW board. Cells with row<0 are dropped (off-top → contributes
 * to top-out detection elsewhere, not written). Returns the new immutable board.
 */
export const lockPiece = (board: Board, p: ActivePiece): Board => {
  const next = cloneBoard(board);
  const color = pieceColor(p.type);
  for (const { col, row } of pieceCells(p)) {
    if (row >= 0 && row < BOARD_HEIGHT && col >= 0 && col < BOARD_WIDTH) {
      next[row][col] = color;
    }
  }
  return next;
};
```

```ts
// engine/lines.ts
import type { Board, Cell } from '@shared/types';
import { EMPTY, PENALTY, BOARD_WIDTH, BOARD_HEIGHT } from '@shared/constants';

const isFullClearable = (row: Cell[]): boolean =>
  row.every((c) => c !== EMPTY) && !row.includes(PENALTY); // penalty rows NEVER clear

/**
 * Remove all full, non-penalty rows; collapse the stack down; prepend empty rows.
 * Returns { board, cleared } where cleared ∈ 0..4 drives penalty sending (n-1).
 */
export const clearLines = (board: Board): { board: Board; cleared: number } => {
  const kept = board.filter((row) => !isFullClearable(row));
  const cleared = BOARD_HEIGHT - kept.length;
  const empty = Array.from({ length: cleared }, () => Array<Cell>(BOARD_WIDTH).fill(EMPTY));
  return { board: [...empty, ...kept], cleared };
};
```

```ts
// engine/penalty.ts
import type { Board, Cell } from '@shared/types';
import { PENALTY, BOARD_WIDTH, BOARD_HEIGHT } from '@shared/constants';

/**
 * Add `n` indestructible full-width penalty rows at the BOTTOM; shift stack UP by n
 * (top n rows fall off the top and are discarded). n<=0 → board returned unchanged
 * (new ref still fine). Penalty cells = 8, full width, NO hole (spec).
 */
export const addPenaltyLines = (board: Board, n: number): Board => {
  if (n <= 0) return board.map((r) => [...r]);
  const survivors = board.slice(n);                       // drop top n rows
  const penaltyRow = (): Cell[] => Array<Cell>(BOARD_WIDTH).fill(PENALTY);
  const penalties = Array.from({ length: n }, penaltyRow);
  return [...survivors, ...penalties].slice(-BOARD_HEIGHT); // keep exactly 20 rows
};
```

```ts
// engine/spectrum.ts
import type { Board } from '@shared/types';
import { EMPTY, BOARD_WIDTH, BOARD_HEIGHT } from '@shared/constants';

/**
 * spectrum[c] = height of column c = BOARD_HEIGHT - (row of topmost non-empty cell),
 * 0 if the column is empty. Length always 10, each value 0..20. Reflects the SETTLED
 * pile only — caller passes the locked board, NOT one with the active piece merged.
 */
export const computeSpectrum = (board: Board): number[] => {
  const spec = new Array<number>(BOARD_WIDTH).fill(0);
  for (let c = 0; c < BOARD_WIDTH; c++) {
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      if (board[r][c] !== EMPTY) { spec[c] = BOARD_HEIGHT - r; break; }
    }
  }
  return spec;
};
```

```ts
// engine/gameover.ts
import type { Board, ActivePiece, PieceType } from '@shared/types';
import { collides } from './collision';
import { spawnPiece } from './piece';

/** True if the given (already-spawned) piece collides at its current pose. */
export const isGameOver = (board: Board, piece: ActivePiece): boolean => collides(board, piece);

/** Convenience: would a freshly spawned piece of `type` top out? */
export const isTopOut = (board: Board, type: PieceType): boolean =>
  collides(board, spawnPiece(type));
```

**Engine purity test contract** (every fn): deep-`Object.freeze` all inputs → call → assert (a) no throw (no mutation attempt), (b) returned value `!==` input ref where a change occurs, (c) deterministic (same in → same out). Golden tables for `rotate` (each piece, each `0>R>2>L>0`, plus wall-kick cases against a crafted board), `clearLines` (n=0,1,2,3,4 and a full PENALTY row that must NOT clear), `addPenaltyLines` (n=0,1,2,3, overflow-off-top), `computeSpectrum` (empty/full/jagged), `isGameOver` (clear spawn vs blocked spawn).

---

### 2. `store/` — Redux Toolkit (state shape, slices, actions, selectors)

#### 2.1 Root state shape

```ts
// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import lobbyReducer from './lobbySlice';
import gameReducer from './gameSlice';
import opponentsReducer from './opponentsSlice';
import { socketMiddleware } from './socketMiddleware';

export const store = configureStore({
  reducer: { lobby: lobbyReducer, game: gameReducer, opponents: opponentsReducer },
  middleware: (getDefault) => getDefault().concat(socketMiddleware),
});
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

```ts
// Full RootState (conceptual)
interface RootState {
  lobby: {
    room: string | null;
    myId: string | null;            // socket.id assigned on connect
    myName: string | null;          // from URL :player
    hostId: string | null;          // current host's id
    players: { id: string; name: string }[]; // everyone in room (incl. me)
    started: boolean;               // game in progress for this room
    connection: 'idle' | 'connecting' | 'connected' | 'error';
    joinError: string | null;       // e.g. "room already in play"
  };
  game: {
    seed: number | null;            // shared RNG seed from server (game:start)
    board: Board;                   // 20×10, MY settled pile (no active piece)
    current: ActivePiece | null;    // my falling piece (null between pieces / pre-start)
    pieceIndex: number;             // cursor into pieceAt(seed, index)
    next: PieceType[];              // preview queue, derived: pieceAt(seed, index+1..+N)
    status: 'idle' | 'playing' | 'paused' | 'gameover';
    wasGroundedLastFrame: boolean;  // §3 one-frame lock-grace flag
    linesCleared: number;           // cumulative (debug/bonus only; NOT shown as score)
    alive: boolean;                 // false after my top-out
    winnerId: string | null;        // set on game:over; null = solo end / draw
  };
  opponents: {
    // normalized by id
    byId: Record<string, { id: string; name: string; spectrum: number[]; alive: boolean }>;
    ids: string[];
  };
}
```

#### 2.2 `lobbySlice`

```ts
// store/lobbySlice.ts — createSlice
const lobbySlice = createSlice({
  name: 'lobby',
  initialState,
  reducers: {
    // --- local intent (URL parse) ---
    setIdentity: (s, a: PayloadAction<{ room: string; name: string }>) => {
      s.room = a.payload.room; s.myName = a.payload.name;
    },
    connecting: (s) => { s.connection = 'connecting'; },
    // --- mirrors of server events (dispatched by middleware) ---
    connected:  (s, a: PayloadAction<{ myId: string }>) => { s.myId = a.payload.myId; s.connection = 'connected'; },
    roomState:  (s, a: PayloadAction<{ hostId: string; players: {id:string;name:string}[]; started: boolean }>) => {
      s.hostId = a.payload.hostId; s.players = a.payload.players; s.started = a.payload.started;
    },
    hostChanged:(s, a: PayloadAction<{ hostId: string }>) => { s.hostId = a.payload.hostId; },
    joinRejected:(s, a: PayloadAction<{ reason: string }>) => { s.joinError = a.payload.reason; },
    gameStarted:(s) => { s.started = true; s.joinError = null; },
    gameEnded:  (s) => { s.started = false; },
    connectionError: (s) => { s.connection = 'error'; },
  },
});
// selectors
export const selectIsHost = (s: RootState) => !!s.lobby.myId && s.lobby.myId === s.lobby.hostId;
export const selectPlayers = (s: RootState) => s.lobby.players;
```

#### 2.3 `gameSlice`

```ts
// store/gameSlice.ts
const gameSlice = createSlice({
  name: 'game',
  initialState, // board: createBoard(), current:null, status:'idle', alive:true, wasGroundedLastFrame:false ...
  reducers: {
    // server authoritative start: seed + first piece
    startGame: (s, a: PayloadAction<{ seed: number }>) => {
      s.seed = a.payload.seed; s.board = createBoard(); s.pieceIndex = 0;
      s.current = spawnPiece(pieceAt(a.payload.seed, 0));
      s.next = nextQueue(a.payload.seed, 1, PREVIEW_COUNT);
      s.status = 'playing'; s.alive = true; s.linesCleared = 0;
      s.wasGroundedLastFrame = false; s.winnerId = null;
    },
    // --- input reducers (optimistic; pure engine fns) ---
    moveLeft:  (s) => { if (playable(s)) s.current = engineMoveLeft(s.board, s.current!); },
    moveRight: (s) => { if (playable(s)) s.current = engineMoveRight(s.board, s.current!); },
    rotateCW:  (s) => { if (playable(s)) s.current = engineRotate(s.board, s.current!); },
    softDrop:  (s) => { if (playable(s)) s.current = engineSoftDrop(s.board, s.current!); },
    hardDrop:  (s) => { if (playable(s)) { s.current = engineHardDrop(s.board, s.current!); commitLock(s); } },
    // --- gravity tick: implements §3 lock machine ---
    tick: (s) => {
      if (!playable(s)) return;
      if (isGrounded(s.board, s.current!)) {
        if (s.wasGroundedLastFrame) commitLock(s);       // lock on the NEXT frame
        else s.wasGroundedLastFrame = true;              // grant one-frame grace
      } else {
        s.current = engineMoveDown(s.board, s.current!);
        s.wasGroundedLastFrame = false;
      }
    },
    // --- reconciliation from server (authoritative board after lock/clear/penalty) ---
    reconcile: (s, a: PayloadAction<{ board: Board; pieceIndex: number; linesCleared: number }>) => {
      s.board = a.payload.board; s.pieceIndex = a.payload.pieceIndex; s.linesCleared = a.payload.linesCleared;
    },
    applyPenalty: (s, a: PayloadAction<{ n: number }>) => { s.board = engineAddPenalty(s.board, a.payload.n); },
    topOut: (s) => { s.status = 'gameover'; s.alive = false; s.current = null; },
    gameOver: (s, a: PayloadAction<{ winnerId: string | null }>) => { s.status = 'gameover'; s.winnerId = a.payload.winnerId; },
    resetGame: () => initialState,
  },
});

// internal helper (module-scope pure fns, NOT methods → no `this`)
const playable = (s: GameState) => s.status === 'playing' && s.alive && s.current !== null;
// commitLock: merge active piece → clear lines → advance index → spawn next → top-out check
const commitLock = (s: GameState): void => {
  const merged = engineLockPiece(s.board, s.current!);
  const { board, cleared } = engineClearLines(merged);
  s.board = board; s.linesCleared += cleared;
  // NOTE: the count `cleared` is emitted to server via middleware listening for hardDrop/tick→lock,
  //       which broadcasts n-1 penalties to opponents. (Server is authoritative on attack.)
  const idx = s.pieceIndex + 1;
  s.pieceIndex = idx;
  const nextPiece = spawnPiece(pieceAt(s.seed!, idx));
  s.next = nextQueue(s.seed!, idx + 1, PREVIEW_COUNT);
  s.wasGroundedLastFrame = false;
  if (engineIsGameOver(board, nextPiece)) { s.status = 'gameover'; s.alive = false; s.current = null; }
  else s.current = nextPiece;
};
```

> Immer note: RTK uses Immer, so `s.x = ...` reads as mutation but produces immutable updates. The engine fns themselves remain pure (return new boards); slices assign their results. `nextQueue(seed, from, count)` = `Array.from({length:count}, (_,i)=>pieceAt(seed, from+i))`.

**Selectors (`store/selectors.ts`):**

```ts
export const selectBoard         = (s: RootState) => s.game.board;
export const selectCurrent       = (s: RootState) => s.game.current;
export const selectGhost         = (s: RootState) =>
  s.game.current ? ghostPiece(s.game.board, s.game.current) : null;
/** Board + active piece + ghost merged for RENDERING ONLY (never stored). Memoized. */
export const selectRenderBoard   = createSelector(
  [selectBoard, selectCurrent, selectGhost],
  (board, current, ghost) => overlayForRender(board, current, ghost), // returns Cell+ghost-tagged grid
);
export const selectNextQueue     = (s: RootState) => s.game.next;
export const selectStatus        = (s: RootState) => s.game.status;
export const selectWinnerId      = (s: RootState) => s.game.winnerId;
export const selectOpponents     = (s: RootState) => s.opponents.ids.map((id) => s.opponents.byId[id]);
export const selectAmAlive       = (s: RootState) => s.game.alive;
```

#### 2.4 `opponentsSlice`

```ts
// store/opponentsSlice.ts
const opponentsSlice = createSlice({
  name: 'opponents', initialState: { byId: {}, ids: [] },
  reducers: {
    setOpponents: (s, a: PayloadAction<{ id:string; name:string }[]>) => {
      s.byId = {}; s.ids = [];
      for (const o of a.payload) { s.byId[o.id] = { ...o, spectrum: Array(10).fill(0), alive: true }; s.ids.push(o.id); }
    },
    spectrumUpdate: (s, a: PayloadAction<{ id:string; spectrum:number[] }>) => {
      const o = s.byId[a.payload.id]; if (o) o.spectrum = a.payload.spectrum;
    },
    opponentGameOver: (s, a: PayloadAction<{ id:string }>) => { const o=s.byId[a.payload.id]; if (o) o.alive=false; },
    opponentLeft: (s, a: PayloadAction<{ id:string }>) => {
      delete s.byId[a.payload.id]; s.ids = s.ids.filter((x) => x !== a.payload.id);
    },
    clearOpponents: () => ({ byId: {}, ids: [] }),
  },
});
```

#### 2.5 `socketMiddleware` — event ⇄ action mapping (THE bridge)

A single Redux middleware owns the `socket.io` client. **Outbound** (redux action → socket emit) and **inbound** (socket event → redux dispatch). No component touches the socket directly.

**Outbound (action.type → emit):**

| Redux action | socket emit event | payload |
|---|---|---|
| `lobby/setIdentity` | `socket.connect()` then `join` | `{ room, name }` |
| `game/hardDrop` (when lock yields `cleared>0`) | `lines:cleared` | `{ cleared }` (server fans out `n-1` penalties) |
| `game/tick`→lock with `cleared>0` (middleware reads `commitLock` result) | `lines:cleared` | `{ cleared }` |
| `game/commitLock` (any lock) | `board:locked` | `{ board, pieceIndex }` (server validates + recomputes spectrum) |
| `lobby/requestStart` (host Start button) | `game:start:request` | `{}` |
| `lobby/requestRestart` (host) | `game:restart:request` | `{}` |
| component unmount / leave | `leave` / `socket.disconnect()` | — |

**Inbound (socket event → dispatch):**

| socket event | dispatched action | notes |
|---|---|---|
| `connect` | `lobby/connected({ myId: socket.id })` | also re-emit `join` if reconnecting |
| `room:state` | `lobby/roomState(...)` + `opponents/setOpponents(others)` | host, players, started |
| `host:changed` | `lobby/hostChanged({ hostId })` | host migration |
| `join:rejected` | `lobby/joinRejected({ reason })` | "already started" etc. |
| `game:start` | `game/startGame({ seed })` + `lobby/gameStarted()` | the ONE seed broadcast |
| `penalty` | `game/applyPenalty({ n })` | n = attacker's cleared−1 |
| `spectrum:update` | `opponents/spectrumUpdate({ id, spectrum })` | per opponent |
| `player:gameover` | `opponents/opponentGameOver({ id })` *(if other)* / `game/topOut()` *(if me)* | |
| `game:over` | `game/gameOver({ winnerId })` + `lobby/gameEnded()` | last-man-standing |
| `player:left` | `opponents/opponentLeft({ id })` | mid-game disconnect |
| `state:reconcile` | `game/reconcile({ board, pieceIndex, linesCleared })` | authoritative correction |
| `disconnect` | `lobby/connectionError()` | socket dropped |

```ts
// store/socketMiddleware.ts (shape, no `this`)
import type { Middleware } from '@reduxjs/toolkit';
import { getSocket } from '../socket/socket';
export const socketMiddleware: Middleware = (storeApi) => (next) => (action) => {
  const socket = getSocket();
  // OUTBOUND side-effects keyed by action.type
  switch (action.type) {
    case 'lobby/setIdentity': {
      socket.connect();
      socket.emit('join', action.payload);
      break;
    }
    case 'lobby/requestStart':   socket.emit('game:start:request'); break;
    case 'lobby/requestRestart': socket.emit('game:restart:request'); break;
    // lock/clear emits handled after reducer runs (see below)
  }
  const result = next(action);
  // POST-reduce: if a lock just cleared lines, tell the server (server owns attacks)
  if (action.type === 'game/hardDrop' || action.type === 'game/tick') {
    const st = storeApi.getState().game;
    // middleware compares pre/post via a captured snapshot or a dedicated "justLocked" flag
    // (impl detail: gameSlice can set s._lockEvent={board,cleared} which middleware reads+clears)
  }
  return result;
};
// Inbound listeners are registered ONCE in a bindSocketListeners(store.dispatch) call from main.tsx.
```

> Inbound wiring lives in `socket/socket.ts` `bindSocketListeners(dispatch)` (registered once after store creation) so the middleware stays focused on outbound emits + lock-event forwarding. The `_lockEvent` ephemeral field on game state is the clean way to surface "a lock just happened, here's the cleared count" to the middleware without the middleware re-running engine logic.

---

### 3. `hooks/`

```ts
// hooks/useAppDispatch.ts / useAppSelector.ts — typed wrappers (no this)
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

```ts
// hooks/useGameLoop.ts
// Drives constant gravity. Server is the authority, but the client runs a local loop
// for smooth optimistic play and reconciles on server events.
import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from './';
import { tick } from '../store/gameSlice';
import { GRAVITY_MS, SOFT_DROP_FACTOR } from '@shared/constants';

export const useGameLoop = (): void => {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.game.status);
  const soft = useAppSelector((s) => s.game.softDropActive); // set by useKeyboard on Down hold
  const accRef = useRef(0);
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    if (status !== 'playing') return;                  // no loop when idle/gameover
    let raf = 0;
    const interval = soft ? GRAVITY_MS / SOFT_DROP_FACTOR : GRAVITY_MS; // 1000ms or 50ms
    const frame = (t: number): void => {
      if (lastRef.current == null) lastRef.current = t;
      accRef.current += t - lastRef.current;
      lastRef.current = t;
      while (accRef.current >= interval) {             // fixed-step: deterministic ticks
        dispatch(tick());                              // tick() runs §3 lock machine
        accRef.current -= interval;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); lastRef.current = null; accRef.current = 0; };
  }, [status, soft, dispatch]);                        // re-arm loop when speed/state changes
};
```

The **one-frame lock delay** is honored entirely inside the `tick` reducer (§2.3): the loop just emits `tick` at a fixed cadence; grounded-this-frame → `wasGroundedLastFrame=true`; grounded-again-next-tick → lock. A horizontal move/rotate that un-grounds the piece resets the flag automatically because `tick` recomputes `isGrounded`. RAF + a fixed-step accumulator keeps ticks deterministic regardless of frame rate (no `setInterval` drift).

```ts
// hooks/useKeyboard.ts
import { useEffect } from 'react';
import { useAppDispatch } from './';
import { moveLeft, moveRight, rotateCW, softDrop, hardDrop, setSoftDrop } from '../store/gameSlice';

export const useKeyboard = (enabled: boolean): void => {
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!enabled) return;
    const onDown = (e: KeyboardEvent): void => {
      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); dispatch(moveLeft());  break;
        case 'ArrowRight': e.preventDefault(); dispatch(moveRight()); break;
        case 'ArrowUp':    e.preventDefault(); dispatch(rotateCW());  break;
        case 'ArrowDown':  e.preventDefault(); dispatch(setSoftDrop(true)); dispatch(softDrop()); break;
        case ' ':          e.preventDefault(); dispatch(hardDrop());  break;
      }
    };
    const onUp = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowDown') dispatch(setSoftDrop(false));        // restore 1000ms gravity
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {                                                    // cleanup — no leaks
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [enabled, dispatch]);
};
```

`setSoftDrop(active)` toggles `game.softDropActive`, which `useGameLoop` reads to switch the gravity interval to `50ms`. Listeners are bound to `window`, `preventDefault` stops page scroll on arrows/space, and the effect cleanup removes both listeners. No `this`, no class.

---

### 4. Component tree

```
<App>                                  // top: <Provider store>, global CSS reset
 └─ <AppRouter>                         // <BrowserRouter><Routes>
     ├─ Route "/"                 → <Landing/>  (optional prompt for room+name)
     └─ Route "/:room/:player"   → <GameRoute/>
         └─ <GameRoute>                 // useParams → dispatch setIdentity (join); selects status
             ├─ if !started  → <Lobby/>          // pre-game room view
             │                   ├─ <PlayerList/>      // names + host badge
             │                   ├─ host?  <button onClick={start}>Start</button>
             │                   └─ !host? <p>Waiting for host…</p>
             └─ if  started  → <GameView/>
                 ├─ useGameLoop()  useKeyboard(enabled = alive && status==='playing')
                 ├─ <Board/>                        // CSS grid 10×20, MY field (render board)
                 │    └─ <Cell/> ×200               // div per cell, color/ghost/penalty class
                 ├─ <aside class=sidebar>
                 │    ├─ <NextPiece/>               // mini 4×4 grid of next queue[0]
                 │    ├─ <Controls/>                // key help (←→ move, ↑ rotate, ↓ soft, ␣ hard)
                 │    └─ <OpponentsPanel/>          // flex column of opponents
                 │         └─ <OpponentSpectrum/> × N // name + 10 column-height bars
                 └─ {status==='gameover' && <GameOverOverlay/>}  // Winner / "You lost" + Restart(host)
```

**Component responsibilities + key props:**

| Component | Responsibility | Selectors / props |
|---|---|---|
| `App` | Mount `<Provider store>` + `<AppRouter>`; import global reset CSS. | — |
| `AppRouter` | `<BrowserRouter><Routes>`; routes `/` and `/:room/:player`. | — |
| `GameRoute` | `useParams<{room;player}>()` → validate (throw `JoinError` if bad) → `dispatch(setIdentity)`. Branch Lobby vs GameView on `selectStarted`. | `useAppSelector(s=>s.lobby.started)` |
| `Lobby` | Show `players` + host badge; host sees Start, others "waiting". | `selectPlayers`, `selectIsHost`, dispatch `requestStart` |
| `GameView` | Runs `useGameLoop()`, `useKeyboard(alive&&playing)`; lays out board+sidebar via flex. | `selectStatus`, `selectAmAlive` |
| `Board` | `display:grid; grid-template:repeat(20,1fr)/repeat(10,1fr)`; render 200 `<Cell>` from `selectRenderBoard` (board+piece+ghost overlay). | `selectRenderBoard` |
| `Cell` | One `<div>`; class from cell value: `empty`/`c1..c7`/`penalty`/`ghost`. Memoized (`React.memo`). | `value: RenderCell` |
| `NextPiece` | Mini 4×4 grid preview of `next[0]` (and optionally more). | `selectNextQueue` |
| `OpponentsPanel` | Flex column; map opponents → `<OpponentSpectrum>`. | `selectOpponents` |
| `OpponentSpectrum` | Name + 10 vertical bars (`<div>` heights from `spectrum[c]/20`); dim if `!alive`. CSS grid of 10 columns. | `{ name, spectrum, alive }` |
| `Controls` | Static key-legend (`<div>` list, flex). | — |
| `GameOverOverlay` | Absolutely-positioned flex overlay; "Winner: X" / "You lost" / solo "Game Over"; host sees Restart → `requestRestart`. | `selectWinnerId`, `selectIsHost`, `selectMyId` |

`useParams()` is loosely typed (`Record<string,string|undefined>`) in RR7 declarative mode → `GameRoute` validates `room`/`player` are non-empty strings (untrusted URL) and throws `JoinError` (the lone `this` site) caught by an error boundary that renders a friendly message.

---

### 5. Styling approach (within spec constraints)

- **Tech:** CSS Modules (`*.module.css`) co-located with components. Zero CSS-in-JS runtime, zero `<table>`, zero Canvas/SVG, no jQuery/DOM libs. All layout is **CSS grid or flexbox only**.
- **Board grid (the core constraint check):**
  ```css
  /* Board.module.css */
  .board {
    display: grid;
    grid-template-columns: repeat(10, var(--cell, 24px));
    grid-template-rows: repeat(20, var(--cell, 24px));
    gap: 1px;
    background: #111;                 /* gap shows as grid lines */
  }
  .cell { width: var(--cell); height: var(--cell); border-radius: 2px; }
  .empty   { background: #1b1b1b; }
  .c1 { background:#00FFFF } .c2 { background:#FFFF00 } .c3 { background:#A000F0 }
  .c4 { background:#00F000 } .c5 { background:#F00000 } .c6 { background:#0000F0 }
  .c7 { background:#F0A000 } .penalty { background:#808080 }
  .ghost { background: transparent; box-shadow: inset 0 0 0 2px rgba(255,255,255,.35); }
  ```
- **Depth without forbidden tech:** subtle bevel via `box-shadow: inset` + `border-radius` on cells; a faint outer `box-shadow` on the board; optional 3D tilt via `transform: perspective() rotateX(2deg)` on the board wrapper (pure CSS, allowed). No images required.
- **Opponents panel & spectrum:** flexbox column for the list; each spectrum is a small CSS grid of 10 columns where bar height = `calc(spectrum[c] / 20 * 100%)` set via inline `style={{height}}` (height is dynamic data, not layout tech — still divs). Dead opponents get `opacity:.4` + grayscale.
- **Layout:** `GameView` uses `display:flex; gap:24px` (board left, sidebar right); responsive via `flex-wrap` and `--cell` clamping (`clamp(14px,2.2vw,28px)`).
- **Testability:** `Board` renders exactly 200 `.cell` divs (RTL `getAllByTestId('cell').length === 200`); board container computed `display:grid`. No layout uses float/table.

---

**Decisions / Risks / Open questions**

- **Decision:** Client `engine/` re-exports the canonical `@shared` pure functions and adds only thin glue (ghost/overlay); the shared impls are the single source of truth so client optimistic state and server authoritative state stay bit-identical. All randomness flows from the one server `seed` via `pieceAt(seed,index)` — no `Math.random`/`Date.now` in client.
- **Decision:** One-frame lock delay lives entirely in the `tick` reducer (`wasGroundedLastFrame`), not in the timer; `useGameLoop` is a dumb fixed-step RAF emitter, keeping ticks deterministic and the lock rule unit-testable on the reducer alone.
- **Decision:** Socket is owned solely by `socketMiddleware` (outbound emits + `_lockEvent` forwarding) + a one-time `bindSocketListeners(dispatch)` for inbound; components never touch the socket — clean, mockable, and keeps `this`-free.
- **Decision:** Server is authoritative for attacks/penalties and final board; the client emits `lines:cleared`/`board:locked` and applies `penalty`/`state:reconcile` corrections, so optimistic prediction never diverges visibly.
- **Risk:** Optimistic `commitLock` on the client vs server reconciliation could briefly disagree if latency is high; mitigation = server `state:reconcile` always wins and overwrites `board`/`pieceIndex`. Need a crisp reconciliation contract with the server designer (event names `board:locked` ⇄ `state:reconcile` must match).
- **Risk:** The `_lockEvent` ephemeral-field pattern (slice → middleware) is slightly unidiomatic; alternative is a dedicated `lockCommitted` action the middleware listens for. Pick one with the store designer to avoid double-emitting `lines:cleared`.
- **Risk:** RAF pauses in background tabs (throttled to ~1fps) — fine for solo, but multiplayer fairness relies on the **server** gravity clock; the client loop is cosmetic/optimistic only. Confirm server emits authoritative ticks or trust client+reconcile.
- **Open question:** Preview depth `PREVIEW_COUNT` (1 vs typical 3–5) — spec only mandates "next"; default to 1 for mandatory, expand for bonus.
- **Open question:** Do we render a ghost piece in the mandatory part? It aids play but isn't required; gated behind a flag, off by default to stay minimal.
- **Open question:** Exact socket event names must be frozen jointly with the server designer (this doc uses `join`, `room:state`, `game:start`, `lines:cleared`, `penalty`, `spectrum:update`, `player:gameover`, `game:over`, `state:reconcile`); any mismatch breaks the bridge.

=====

## SUBSYSTEM: testing

## Test Strategy & Coverage Plan (Red Tetris — Vitest 3.2 / v8)

This is the authoritative test-design contract for the monorepo. It guarantees the 42 gate (`statements/functions/lines ≥ 70`, `branches ≥ 50`) by concentrating tests on the **pure, deterministic backbone** (where coverage is cheap and bulletproof) and isolating untestable I/O glue out of the threshold denominator. Every case below references a real signature from the shared/engine/model contracts.

---

### 1. Coverage Strategy — where the weight lives

Coverage is "free" on pure functions (no mocks, no async, no environment). The strategy is: **drive ≥95% on the pure backbone**, do real-but-bounded tests on server classes, and **exclude** I/O bootstrap so it never dilutes the ratio.

#### 1.1 High-density backbone (MUST be near-100% covered)

| Layer | Files (coverage-weighted) | Why high density | Target |
|---|---|---|---|
| shared pure | `packages/shared/src/tetrominoes.ts` (`SHAPES`,`COLORS`,`KICKS_*`) | constant tables + lookups; 100% trivially | ≥95% |
| shared pure | `packages/shared/src/rng.ts` (`mulberry32`,`shuffleBag`,`pieceAt`,`PIECE_ORDER`) | tiny pure fns, golden-value tests | 100% |
| shared pure | `packages/shared/src/constants.ts` | constants; covered by import | n/a (data) |
| engine pure | `packages/client/src/engine/board.ts` (`collides`,`merge`,`clearLines`,`addPenaltyLines`,`computeSpectrum`,`isTopOut`) | the correctness heart; many branches | ≥95% |
| engine pure | `packages/client/src/engine/piece.ts` (`spawnPiece`,`moveLeft/Right/Down`,`tryRotateCW`,`hardDrop`) | pure transforms, enumerable | ≥95% |
| engine pure | `packages/client/src/engine/lock.ts` (lock-delay state machine `step`) | small branch set, fully drivable | ≥90% |
| server OOP | `packages/server/src/models/Game.ts` | core class; many branches | ≥85% |
| server OOP | `packages/server/src/models/Player.ts` | state holder | ≥90% |
| server OOP | `packages/server/src/models/Piece.ts` | thin OO wrapper over shared | ≥90% |
| server OOP | `packages/server/src/models/RoomManager.ts` | Map orchestration | ≥90% |
| client state | `packages/client/src/store/*.slice.ts` (reducers) | pure reducers, RTK | ≥80% |
| client view | `packages/client/src/components/Board.tsx`, `Spectrum.tsx`, `Lobby.tsx`, `GameOverlay.tsx` | RTL render/event | ≥70% |

**Rule of thumb:** shared + engine alone are ~50–60% of total statements and will sit at ~98%. That single block almost satisfies the gate before server/client are counted — the rest is insurance and correctness proof.

#### 1.2 Excluded from thresholds (I/O glue — tested by socket integration, NOT counted)

```
packages/server/src/index.ts            // httpServer bootstrap, listen()
packages/server/src/socket/**           // socket.io event wiring (covered by integration, not unit %)
packages/server/src/http/**             // express static + SPA fallback
packages/client/src/main.tsx            // React root mount
packages/client/src/socket/**           // socket.io-client singleton wiring
**/*.d.ts, **/index.ts (barrels), **/dist/**, **/*.{test,spec}.*
```
Rationale: these are thin, environment-bound, and integration-verified. Counting them would drag `branches`/`statements` down for zero correctness gain. Engine/models are **never** excluded.

---

### 2. Per-Module Test Matrix (pure shared + engine)

#### 2.1 `tetrominoes.test.ts` — shape & table integrity
| # | Case | Assertion |
|---|---|---|
| T1 | Each piece, each rotation has exactly 4 cells | `∀type ∀rot SHAPES[type][rot].length === 4` |
| T2 | All cell coords within bounding box | I/O in `0..3`; JLSTZ in `0..2` |
| T3 | O is identical across all 4 states | `SHAPES.O[0..3]` deep-equal |
| T4 | Golden coordinates per (piece,rotation) | hardcode all 7×4 cell-sets from spec §1.2 and deep-equal (locks the contract) |
| T5 | `COLORS` maps each type → its id | `COLORS.I===1 … COLORS.L===7` |
| T6 | Kick tables have 5 offsets per transition | `∀ KICKS_JLSTZ[k].length===5`, same for `KICKS_I` |
| T7 | Kick `k0` is always `(0,0)` | first offset identity for every transition |
| T8 | CW transition keys present | keys `'0>1','1>2','2>3','3>0'` exist for both tables |

#### 2.2 `rng.test.ts` — determinism & fairness (HIGHEST-RISK item)
| # | Case | Assertion |
|---|---|---|
| R1 | Two `mulberry32(42)` instances identical 1000-length stream | `seqA===seqB` element-wise |
| R2 | `mulberry32` output range | every value `∈ [0,1)` |
| R3 | Golden first-N values for seed 42 | `mulberry32(42)()` first 5 == hardcoded floats (lock impl) |
| R4 | `pieceAt(seed,i)` stable across calls/order | call i=0..20 forward, then random order → identical map |
| R5 | `pieceAt` golden sequence | `pieceAt(42,0..20)` == hardcoded `PieceType[]` |
| R6 | 7-bag fairness: every window `[7k,7k+7)` is a permutation of all 7 | `new Set(window).size===7` for k=0..5 |
| R7 | Bag boundary independence | `pieceAt(s, 6)` and `pieceAt(s,7)` belong to different bags, both valid types |
| R8 | `shuffleBag` consumes deterministic order | seeded `shuffleBag(mulberry32(1))` == golden permutation |
| R9 | Different seeds → different sequence | `pieceAt(1,0..20) !== pieceAt(2,0..20)` (at least one differs) |
| R10 | No `Math.random`/`Date.now` reachable | static: grep test asserts source has none (or ESLint gate) |

#### 2.3 `board.collides.test.ts`
| # | Case | Assertion |
|---|---|---|
| C1 | Empty board, spawn piece | `collides===false` |
| C2 | Left wall: piece at `x<0` | `true` |
| C3 | Right wall: rightmost cell `x>9` | `true` |
| C4 | Floor: any cell `y>19` | `true` |
| C5 | Overlap an occupied cell | `true` |
| C6 | Cell exactly at `x=0` / `x=9` (boundary inside) | `false` (valid) |
| C7 | Negative `y` (above board, spawn) is allowed (not collision) | `false` for `y<0` empty cols |

#### 2.4 `piece.move.test.ts`
| # | Case | Assertion |
|---|---|---|
| M1 | `moveLeft` decrements x when space | `x-1`, immutably (input unchanged) |
| M2 | `moveLeft` blocked at left wall → unchanged | returns original (or `null` per contract) |
| M3 | `moveRight` symmetric | `x+1` / blocked |
| M4 | `moveDown` when space | `y+1` |
| M5 | `moveDown` into floor/pile blocked | unchanged |
| M6 | input object not mutated (frozen-input test) | `Object.freeze(p)` → no throw, new object returned |

#### 2.5 `piece.rotate.test.ts` — SRS + wall kicks
| # | Case | Assertion |
|---|---|---|
| K1 | Each JLSTZ piece `0→R` in open space → `k0(0,0)` applied | rotation index `1`, x/y unchanged |
| K2 | O rotation is no-op | `tryRotateCW(board,O)` returns same shape (state stays renderable-identical) |
| K3 | I-piece wall kick off left wall | rotation that would clip → first valid kick applied (x shifted right) |
| K4 | JLSTZ kick against floor uses `k3 (0,+2)`-style offset | landed piece rotates via a non-k0 kick |
| K5 | All 5 kicks fail → rotation rejected | piece in a tight pocket → `tryRotateCW` returns `null` |
| K6 | Full CW cycle returns to spawn shape | `0→1→2→3→0` shape equals state-0 cells |
| K7 | T-spin pocket: T rotates into slot via late kick | exercises non-first kick index (branch coverage) |

#### 2.6 `board.clearLines.test.ts`
| # | Case | n | Assertion |
|---|---|---|---|
| L1 | No full row | `cleared===0`, board unchanged | 0 |
| L2 | Single full row | `cleared===1`, rows above shift down, top row empty | 1 |
| L3 | Double (2 non-adjacent full rows) | `cleared===2`, correct collapse | 2 |
| L4 | Triple | `cleared===3` | 3 |
| L5 | Tetris (4 stacked full rows) | `cleared===4` | 4 |
| L6 | Penalty row is full but indestructible | NOT cleared (`fullClearableRows` excludes row containing `8`) | — |
| L7 | Mixed: one normal full + one penalty full | only normal clears (`cleared===1`) | — |
| L8 | Immutability | input board not mutated | — |

#### 2.7 `board.penalty.test.ts`
| # | Case | Assertion |
|---|---|---|
| P1 | `addPenaltyLines(b,0)` no-op | board unchanged |
| P2 | `addPenaltyLines(b,1)` | bottom row all `8`; prior stack shifted up by 1 |
| P3 | `addPenaltyLines(b,2)` (from n=3 clear) | rows 18,19 = penalty; former row-19 now at row-17 (spec §5.3 worked example) |
| P4 | Penalty value is `PENALTY===8` everywhere, full width (no hole) | `row.every(c=>c===8)` |
| P5 | Overflow tops out | stack high enough that shifting pushes blocks above `y=0` → those discarded; resulting board causes `isTopOut(next)===true` |
| P6 | Penalty rows survive a `clearLines` pass | apply penalty then clearLines → penalty rows remain |
| P7 | Immutability | input not mutated |

#### 2.8 `board.spectrum.test.ts`
| # | Case | Assertion |
|---|---|---|
| S1 | Empty board | `computeSpectrum` == `[0×10]` |
| S2 | One block at `(col=0,row=19)` | `spec[0]===1`, rest 0 |
| S3 | One block at top `(col=5,row=0)` | `spec[5]===20` |
| S4 | Column with a hole below top block | height = from topmost filled (hole below ignored) — `spec[c]===20-topRow` regardless of gaps |
| S5 | Jagged multi-column board | full vector matches hand-computed |
| S6 | Penalty cells count toward height | `8` cells raise spectrum like any non-empty |
| S7 | Length always 10, entries `0..20` | invariant |

#### 2.9 `board.gameover.test.ts` & `piece.hardDrop.test.ts`
| # | Case | Assertion |
|---|---|---|
| G1 | `isTopOut` false on empty board | spawn fits |
| G2 | `isTopOut` true when spawn cells occupied | stacked to top → collide at spawn |
| H1 | `hardDrop` on empty board | lands on floor: bottom cells at `y=19` |
| H2 | `hardDrop` onto a pile | rests exactly above topmost obstruction |
| H3 | `hardDrop` is idempotent at rest | dropping an already-grounded piece returns same |

#### 2.10 `engine/lock.test.ts` — one-frame grace (spec §3)
| # | Case | Assertion |
|---|---|---|
| LD1 | Falling with space below → `y+1`, `wasGroundedLastFrame=false` | FALLING tick |
| LD2 | First tick grounded → grace granted, NOT locked, flag=true | GROUNDED, not LOCKED |
| LD3 | Second consecutive grounded tick → LOCK | merges to board |
| LD4 | Grounded then move makes it un-grounded → resumes FALLING, flag resets | no lock |
| LD5 | Grounded, move keeps it grounded → still locks next tick (grace NOT re-armed by lateral move) | locks |
| LD6 | Hard drop bypasses grace → immediate lock | LOCKED same tick |

---

### 3. Server Class Tests (no live socket; direct instantiation + mock `io`)

Mock surface (a fake just records emits):
```ts
type Emit = { event: string; payload: unknown };
const makeIo = () => {
  const room: Record<string, Emit[]> = {};
  const io = {
    _sent: [] as Array<{ room?: string; event: string; payload: unknown }>,
    to(r: string) { return { emit: (event: string, payload: unknown) => io._sent.push({ room: r, event, payload }); }; },
    emit(event: string, payload: unknown) { io._sent.push({ event, payload }); },
  };
  return io;
};
```

#### 3.1 `Player.test.ts`
| # | Case | Assertion |
|---|---|---|
| PL1 | `new Player(id,name,socketId)` defaults | `isHost===false`, `isAlive===true`, empty board |
| PL2 | `player.die()` / topOut | `isAlive===false` |
| PL3 | `player.setHost(true)` | `isHost===true` |
| PL4 | `player.applyPenalty(n)` calls shared `addPenaltyLines`, updates board + spectrum | board mutated to penalty rows; `spectrum` recomputed |
| PL5 | `player.reset()` | fresh empty board, `isAlive===true` |

#### 3.2 `Piece.test.ts`
| # | Case | Assertion |
|---|---|---|
| PC1 | `new Piece('T')` spawn state | `type==='T'`, `rotation===0`, spawn x/y from §1.3 |
| PC2 | `piece.cells()` returns 4 board coords | matches `SHAPES.T[0]` translated by origin |
| PC3 | `piece.rotated()` (CW) returns rotated copy | `this` used (OO, allowed server-side); returns new state |
| PC4 | `piece.move(dx,dy)` updates x/y | OO method mutates/returns per contract |

#### 3.3 `Game.test.ts`
| # | Case | Assertion |
|---|---|---|
| GM1 | `new Game(room, io)` | `status==='waiting'`, `players.length===0`, has `seed` only after start |
| GM2 | `addPlayer(p)` first becomes host | `players[0].isHost===true` |
| GM3 | `addPlayer` second is not host | `players[1].isHost===false` |
| GM4 | `addPlayer` while `status==='playing'` rejected | returns false / does not add (spec: no join after start) |
| GM5 | `start()` by host | `status==='playing'`, `seed` assigned, `game:start` emitted with seed to room |
| GM6 | `start()` requires ≥1 player; solo allowed | 1-player start succeeds |
| GM7 | `removePlayer(host)` triggers host migration | next player `isHost===true`; `host:changed` emitted |
| GM8 | `removePlayer` last player | game empties (signal RoomManager to GC) |
| GM9 | `registerLineClear(player, n=3)` distributes `n-1=2` to **others only** | each *other* player board gains 2 penalty rows; the clearer's board unchanged |
| GM10 | `registerLineClear(n=1)` → 0 penalties | no opponent board change |
| GM11 | `playerTopOut(p)` sets `isAlive=false`, re-checks winner | |
| GM12 | `winner()` when exactly one alive (multiplayer ≥2 starters) | returns survivor; `game:over {winnerId}` emitted; `status==='finished'` |
| GM13 | `winner()` solo top-out | `game:over {winnerId:null}` (or self per UI); status finished |
| GM14 | simultaneous last-two die same tick | deterministic draw `winnerId:null` (tested branch) |
| GM15 | `restart()` by host after finished | `status` back to `waiting`/`playing`, boards reset, new `seed` |
| GM16 | `restart()`/`start()` by non-host ignored | status unchanged (auth branch) |
| GM17 | `spectrum:update` emitted on board change | mock io received `{playerId,spectrum}` |

#### 3.4 `RoomManager.test.ts`
| # | Case | Assertion |
|---|---|---|
| RM1 | `getOrCreate('a')` creates Game | `rooms.size===1` |
| RM2 | `getOrCreate('a')` again returns same | identity equal, size still 1 |
| RM3 | Two rooms isolated | penalty/seed in 'a' never touches 'b'; independent piece sequences |
| RM4 | `remove('a')` on empty | `rooms.size` decremented |
| RM5 | Auto-GC empty room after last leave | room removed when `players.length===0` |
| RM6 | `list()` returns active rooms | array of names |

---

### 4. Socket Integration Tests (`socket/integration.test.ts`)

Real in-process server + `socket.io-client`; **node env project**. No browser. Verifies wiring that unit tests deliberately exclude from coverage %.

```ts
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { io as Client, type Socket } from 'socket.io-client';
import { afterEach, beforeEach, expect, it } from 'vitest';

let httpServer: ReturnType<typeof createServer>;
let port: number;
let ioServer: Server;
const connect = (room: string, name: string): Promise<Socket> =>
  new Promise((res) => {
    const c = Client(`http://localhost:${port}`, { forceNew: true });
    c.on('connect', () => { c.emit('join', { room, name }); res(c); });
  });

beforeEach(() => new Promise<void>((done) => {
  httpServer = createServer();
  ioServer = new Server(httpServer);
  registerSocketHandlers(ioServer);            // the unit under integration
  httpServer.listen(() => { port = (httpServer.address() as any).port; done(); });
}));
afterEach(() => { ioServer.close(); httpServer.close(); });
```

| # | Flow | Assertion |
|---|---|---|
| I1 | A joins `room1/alice` → lobby state | A receives `lobby:update` with self as host |
| I2 | B joins same room → both see 2 players, A host | `lobby:update` lists alice(host),bob |
| I3 | Non-host B emits `start` → ignored | no `game:start` received |
| I4 | Host A emits `start` → both get `game:start{seed}` | identical `seed` on both clients (determinism wire-check) |
| I5 | After start, C tries join → `join:rejected` | C does not enter playing game |
| I6 | A clears 3 lines (emit `lock` resulting in clears) → B gets penalty | B receives `penalty {count:2}` / board update |
| I7 | B disconnects mid-game → A declared winner | A receives `game:over{winnerId:alice}` |
| I8 | Host A disconnects in lobby → B becomes host | B receives `host:changed{newHostId:bob}` |
| I9 | Two rooms concurrent | events in room1 never delivered to room2 client |
| I10 | Deep-link static fallback (HTTP, separate test) | `GET /room/alice` → `index.html` (BrowserRouter) |

If full integration proves flaky in CI, **fallback mocking approach**: unit-test each handler by invoking it with a fake `socket`/`io` (as in §3 mock), asserting `socket.join(room)` and `io.to(room).emit(...)` calls — documented as the deterministic alternative; integration kept as a thin smoke layer.

---

### 5. React Component Tests (RTL, jsdom project)

Render against a real Redux store seeded with known state; assert DOM, not implementation.

#### 5.1 `Board.test.tsx`
| # | Case | Assertion |
|---|---|---|
| B1 | Renders exactly 200 cells | `container.querySelectorAll('[data-cell]').length===200` (10×20) |
| B2 | Known board → cell color classes | a cell with value `3` has class `cell-3` (T purple); empty has `cell-0` |
| B3 | No `<canvas>`/`<svg>`/`<table>` in output | `container.querySelector('canvas,svg,table')===null` |
| B4 | Container is CSS grid | computed/inline `display:grid` (or className asserting grid) |

#### 5.2 `Spectrum.test.tsx`
| # | Case | Assertion |
|---|---|---|
| SP1 | Renders 10 column bars from `spectrum` prop | 10 bar elements |
| SP2 | Bar height reflects value | `spectrum[c]=20` → tallest; `0` → empty bar |
| SP3 | Shows opponent name | name text present (never opponent's full board) |

#### 5.3 keyboard / input hook `useKeyboard.test.tsx`
| # | Case | Assertion |
|---|---|---|
| KB1 | `ArrowLeft` dispatches `moveLeft` action | spy store receives action |
| KB2 | `ArrowRight`/`ArrowDown`/`ArrowUp`/`Space` map to move/soft-drop/rotate/hardDrop | each keydown → expected action type |
| KB3 | Unmapped key → no dispatch | no-op |
| KB4 | listener cleaned up on unmount | no dispatch after unmount |

#### 5.4 `Lobby.test.tsx`
| # | Case | Assertion |
|---|---|---|
| LB1 | Host sees **Start** button | host store state → button present |
| LB2 | Non-host does NOT see Start, sees "waiting for host" | button absent |
| LB3 | Click Start dispatches/emits start | handler fires |
| LB4 | Player list renders all names + host badge | names + badge on host |

#### 5.5 `GameOverlay.test.tsx`
| # | Case | Assertion |
|---|---|---|
| OV1 | `status==='finished'`, winner=self → "You win" overlay | overlay shown |
| OV2 | winner=other → "alice wins" | opponent name shown |
| OV3 | solo game over (`winnerId:null`) → "Game Over" | neutral overlay |
| OV4 | host sees **Restart** in overlay; non-host doesn't | conditional control |
| OV5 | overlay absent while `playing` | `queryBy...===null` |

---

### 6. Exact Vitest Config (root `vitest.config.ts`)

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: [
            'packages/server/**/*.{test,spec}.ts',
            'packages/shared/**/*.{test,spec}.ts',
          ],
        },
      },
      {
        extends: true,
        plugins: [(await import('vite-tsconfig-paths')).default()],
        test: {
          name: 'client',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./packages/client/vitest.setup.ts'],
          include: ['packages/client/**/*.{test,spec}.{ts,tsx}'],
        },
      },
    ],
    coverage: {
      provider: 'v8',                       // must equal vitest version (^3.2.0)
      reporter: ['text', 'html', 'lcov'],
      all: true,                            // count untested source files too (honest %)
      include: ['packages/*/src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.{test,spec}.*',
        '**/dist/**',
        '**/*.d.ts',
        '**/index.ts',                      // barrels
        'packages/client/src/main.tsx',     // React root
        'packages/client/src/socket/**',    // socket.io-client wiring (integration-tested)
        'packages/server/src/index.ts',     // httpServer bootstrap
        'packages/server/src/socket/**',    // socket.io event wiring
        'packages/server/src/http/**',      // express static + SPA fallback
      ],
      thresholds: {
        statements: 70,
        functions: 70,
        lines: 70,
        branches: 50,
        // perFile:false (default) → aggregate across all files
      },
    },
  },
});
```
Notes: `all:true` is deliberate — it forces every `src` file into the denominator so the printed number is the **honest** project coverage a 42 evaluator sees, not just "of files that have a test." The pure backbone's ~98% comfortably absorbs the dilution. Socket/index globs are the **only** code excluded; engine + models are never excluded. `@vitest/coverage-v8` must be pinned to the exact `vitest` version or coverage refuses to run.

Client setup (`packages/client/vitest.setup.ts`):
```ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(() => cleanup());
```

---

### 7. Coverage math (why this clears the gate)

| Bucket | ~stmts share | expected cov | weighted |
|---|---|---|---|
| shared (rng+tetrominoes+constants) | ~12% | ~99% | 11.9 |
| client engine (board/piece/lock) | ~30% | ~97% | 29.1 |
| server models (Game/Player/Piece/RoomManager) | ~25% | ~87% | 21.8 |
| client store slices | ~10% | ~82% | 8.2 |
| client components/hooks | ~15% | ~75% | 11.3 |
| (socket/index/http excluded) | ~8% | n/a | — |
| **Total (of included)** | **100%** | — | **~82%** statements |

Branches are the tightest (50% gate): the explicit branch-heavy cases — `clearLines` n∈{0,1,2,3,4}+penalty (L1–L7), penalty top-out (P5), all 5 wall-kick outcomes incl. full-fail (K1–K7), lock-delay 6 transitions (LD1–LD6), host migration + non-host auth (GM7,GM16), winner solo/multi/draw (GM12–GM14) — are specifically chosen to hit the conditional branches, landing branches comfortably above 50%.

---

**Decisions / Risks / Open questions**

- **Decision:** Concentrate coverage on pure shared+engine (near-100%, ~42% of statements alone) so the gate is met even before server/client; exclude only I/O glue (`index.ts`, `socket/**`, `http/**`, `main.tsx`) from thresholds — engine/models never excluded. `all:true` keeps the reported number honest.
- **Decision:** Golden-value lock-in for `rng` (`pieceAt(42,0..20)`) and `tetrominoes` (all 7×4 coordinate sets) turns the determinism contract into regression-proof assertions — the project's highest-risk item.
- **Decision:** Server classes tested by direct instantiation + a recording mock `io` (no live socket); socket.io-client integration is a thin smoke layer for wire-level determinism (`game:start` seed equal on both clients) with a documented per-handler-mock fallback if CI flakes.
- **Risk:** Branches (50%) is the likely failure point; mitigated by deliberately enumerated branch cases (clearLines n-variants, kick all-fail, lock-delay transitions, host migration, winner draw). If still short, add CCW-rotation kick rows and penalty-overflow edge tests.
- **Risk:** Integration tests can be flaky/slow in CI (port binding, async); mitigated by `forceNew`, ephemeral port `listen(0)`, and the mock-handler fallback path.
- **Risk:** `@vitest/coverage-v8` drifting out of lockstep with `vitest` makes coverage refuse to run — pin both to the same `^3.2.0` and dedupe in lockfile.
- **Open question:** Are lock-delay and gravity simulation owned by the **client engine** (`lock.ts`) or the **server `Game`** (authority)? If gravity lives server-side, move LD1–LD6 into a server `Game.tick()` test and keep only pure `step()` in engine — affects which project counts those branches. Needs the networking/authority contract to finalize.
- **Open question:** Exact penalty *timing* (apply on receiver's next lock vs immediately on receipt) must be fixed before writing GM9/I6 assertions, since it changes observable board state ordering.
- **Open question:** Do we test CCW rotation in the mandatory suite? Spec mandatory uses CW only; CCW kick rows exist for bonus — including them now adds easy branch coverage but tests unshipped behavior.

---

## C. Adversarial Review Findings

### correctness critic

Kick tables are correct. Now I have enough verified ground truth. Here are my adversarial findings.

1. **[CRITICAL] Determinism — soft drop / hard drop break index-addressed determinism because the piece STREAM is not synchronized to a clock.** The design claims "every player gets the same pieces in the same positions and coordinates, even at different times" is satisfied by `pieceAt(seed, index)`. But the *content* of the stream is deterministic only if the *index* advances identically. Each client advances `pieceIndex` on its own `commitLock` — which fires at wildly different wall-clock times depending on whether that player soft-drops, hard-drops, or lets gravity run. The spec phrase "same positions and coordinates" refers to the spawn coordinates of each piece *by index* (which ARE identical), so this is actually COMPLIANT for piece content/spawn. **The real bug:** nothing in the design guarantees two clients agree on *which index a given penalty was triggered at* or on board reconciliation ordering. Player A at index 5 and Player B at index 50 both correctly see `pieceAt(seed,5)`=`pieceAt(seed,5)`, so determinism of the *sequence* holds. **FIX:** Explicitly document that "same coordinates" = per-index spawn coords (constant per type), and that index advancement is intentionally per-player and asynchronous. Add a determinism test asserting `pieceAt` is the SOLE source of pieces and that NO code path mutates spawn coords. This is a documentation/test gap, not a logic break — downgrade in practice, but flag because the design conflates "same sequence" with "same wall-clock state."

2. **[CRITICAL] `pieceAt` silently returns `undefined` for negative or out-of-range indices (verified: `pieceAt(42,-1) === undefined`).** `Math.floor(-1/7) = -1`, `-1 % 7 = -1`, so `bag[-1]` is `undefined`. Any code path that computes `pieceIndex - 1` (e.g., the client `commitLock` does `idx = s.pieceIndex + 1` but a reconciliation that rolls back, or a preview queue `nextQueue(seed, from, count)` called with `from` derived from a stale index) can produce `undefined` pieces, which then `spawnPiece(undefined)` → `SPAWN[undefined]` → crash or NaN coords. **FIX:** Guard `pieceAt` with `if (index < 0) throw new RangeError(...)` and assert `bag[inBag] !== undefined` (the `!` non-null assertions in the design HIDE this at compile time but not runtime). Add a test for index 0, large index, and that negative throws.

3. **[CRITICAL] Penalty routing double-counts / desyncs because two different protocol designs are specified and they disagree on the penalty value semantics.** The protocol subsystem says client emits `board:line-clear {linesCleared: n}` and server fans out `penalty:apply {count: n-1}`. The shared subsystem says `PenaltyPayload.lines` is "already-decremented n-1." The server subsystem says `registerLineClear(playerId, n)` computes `penaltyCount = max(0, n-1)`. BUT the client `gameSlice` middleware table says outbound `lines:cleared {cleared}` where `cleared` is the raw clear count, AND separately lists `game/hardDrop` AND `game/tick→lock` BOTH as triggers that emit `lines:cleared`. **A single hard-drop that clears lines dispatches `game/hardDrop` which internally calls `commitLock`** — but the middleware also fires on `game/tick`. If hard drop is implemented as dispatch(hardDrop) and the next tick also sees a lock event, **the same line clear is reported twice**, doubling the penalty sent to opponents. **FIX:** Emit the penalty report exactly once, keyed off the ephemeral `_lockEvent` field being set+consumed (clear it after reading), never off the action type. Pick ONE event name and ONE decrement location (server does `n-1`; client always sends raw `n`). Freeze this in an integration test (I6) asserting a 3-line clear yields exactly one `penalty {count:2}` at the opponent.

4. **[CRITICAL] Penalty lines with NO hole make the receiver's board UNWINNABLE-deterministic but ALSO can desync top-out detection between client and server.** Penalty application is "apply immediately on receipt, before next spawn" on the client (pure `addPenaltyLines`), but the server does NOT simulate boards — it only knows penalty *count*. Top-out from a penalty push-up is detected *client-side* (`isTopOut` on next spawn) and *reported* via `player:topout`. **Race:** if a penalty arrives while the client's active piece is mid-air at a low `y`, the design says "the active falling piece's y is NOT shifted (only the settled board shifts)." So after push-up, the active piece may now *overlap* settled penalty cells. The engine's `collides` would return true for the current pose, but the lock machine only checks `collides(moveDown(p))`. **A piece can be left in an overlapping-but-not-grounded state, and the client may never detect top-out until it tries to lock** — meanwhile gravity `moveDown` returns the same piece (blocked), `isGrounded` true, it locks INTO occupied cells via `lockPiece` which overwrites them. Board diverges from any re-simulation. **FIX:** On penalty application, immediately re-validate the active piece with `collides(board, current)`; if it overlaps, either push the active piece up by `count` rows too (standard garbage behavior) or trigger top-out immediately. Specify this explicitly and test P5 with an active piece present, not just the settled stack.

5. **[HIGH] Lock-delay one-frame grace has an off-by-one / re-arm ambiguity that diverges client simulations under input timing.** Spec rule: grounded this frame → lock next frame; re-arm only if a move un-grounds the piece. The `tick` reducer sets `wasGroundedLastFrame=true` on first grounded tick and locks on the second. BUT input (`moveLeft`/`rotateCW`) is processed *between* ticks via separate reducers that **do not touch `wasGroundedLastFrame`**. The design says "if a move/rotate causes the piece to become not grounded, the flag resets... it gets recomputed next tick." It is NOT recomputed by the move reducer — only `tick` recomputes `isGrounded`. So between a grounded tick (flag=true) and the next tick, a player moves the piece over a hole (now un-grounded): the flag is STILL true. Next `tick` sees `isGrounded=false` → goes to the `else` branch → `wasGroundedLastFrame=false`. OK, that path self-corrects. **The actual bug:** a move that keeps it grounded but shifts it does NOT re-arm, which is correct per spec — but a *rotate via wall-kick* that lifts the piece (kick dy<0) un-grounds it, and the flag isn't cleared until the next tick, creating a one-tick window where a fast second rotate+drop sees stale grounded state. Because clients tick at independent RAF cadence with a fixed-step accumulator, **the number of input events processed between two ticks differs per client**, so lock timing (and thus which cells a piece locks into) can differ. Since boards aren't server-authoritative, two clients CAN end up with different boards from the same inputs. **FIX:** Make `wasGroundedLastFrame` a *derived* value recomputed at the START of every `tick` AND have move/rotate reducers clear it when they change grounded-state, OR make gravity fully server-authoritative (server ticks, broadcasts authoritative lock). Add LD4/LD5 tests that interleave moves between ticks.

6. **[HIGH] Server-vs-client authority for line-clear is ambiguous and the server cannot validate, so a desync between client board and server's implied board is undetectable.** The server stores only `currentPieceIndex` + spectrum, never the board. It "trusts" `linesCleared` and `topout`. The design even claims "the server *can* reconstruct any board on demand from data it already holds" — **this is false.** The server holds `seed` + `currentPieceIndex` but NOT the player's *input history* (moves/rotations/drops). The piece *sequence* is deterministic, but *where each piece is placed* depends on player inputs, which the server never receives (inputs are client-local Redux actions). Therefore the server can NEVER reconstruct a board, so the "documented upgrade path to anti-cheat by re-simulation" is impossible as designed. **FIX:** Either (a) accept pure client-trust and delete the false "can reconstruct" claim, or (b) if anti-cheat is ever wanted, the client must stream its input log (move/rotate/drop per piece index) to the server. For the mandatory part, (a) is fine — but the claim must be corrected or a future implementer will build on a falsehood.

7. **[HIGH] Host-migration race when the host disconnects during `start()`/`restart()`.** `start()` is host-gated by `socket.id === hostId`. If the host's `disconnect` fires and `handleDisconnect` runs `electHost()` *concurrently* with an in-flight `start` ack from that same (dying) host, ordering is undefined. socket.io processes events on a single thread per socket, but `disconnect` and a just-received `start` from the same socket can be queued such that `start` runs first (sets status=running, picks seed), then `disconnect` runs `handleDisconnect` which mid-`running` calls `p.eliminate()` on the host and `electHost()`. Now the game is `running` with a seed, the starter is eliminated, and a new host exists who never pressed start. With 2 starters and host immediately eliminated, `checkWinAfterChange` may declare the other player winner *instantly at game start*. **FIX:** In `start()`, after setting status, verify the host is still connected; reject if not. In `handleDisconnect`, if status just flipped to `running` this tick, treat the disconnect as a normal mid-game elimination but DON'T let it fire `checkWinner` until at least the roster snapshot is stable. Add a test: host disconnects in the same tick as start.

8. **[HIGH] Simultaneous-death "draw" is not actually deterministic across the two ordering models.** `winner()` returns `draw` when `starters>=2 && alive.length===0`. But two `player:topout` events arrive as *separate* socket messages processed sequentially. After the FIRST topout, `alive.length===1` → `winner()` returns `last-standing` with that survivor, status flips to `ended`, `game:over {winnerId: survivor}` is broadcast. The SECOND topout then arrives but `winner()` early-returns `{decided:false, reason:'not-decided'}` because `status !== 'running'`. **So a true simultaneous death is resolved as last-standing for whoever's topout was processed SECOND-to-last, NOT a draw** — the `draw` branch (`alive.length===0`) is only reachable if both eliminations are applied *before* any `checkWinAfterChange` runs, which never happens with per-event processing. The "draw" branch is effectively dead code, and the design's own test GM14 will fail unless it manually eliminates both before checking. **FIX:** Decide the intended semantics. If "last to die wins" is acceptable, delete the draw branch and document it. If genuine simultaneous death should draw, you need a tick-batched elimination model (collect topouts within a tick window, then resolve once). Don't ship a `draw` branch that can't fire in production.

9. **[HIGH] Solo game start can instantly end, and the `starters>=2` win check has an off-by-one for the 2-player-but-one-never-alive case.** `winner()` for solo (`starters===1`) returns `solo-end` when `alive.length===0`. Fine. But consider 2 starters where one disconnects *before topping out* but after start: `handleDisconnect` mid-running does `p.eliminate()` → `alive.length===1` → `last-standing`, correct. Now consider the host starting with players who include a *disconnected-but-not-removed* player (slot kept for reconnect grace per Player design). `start()` does `resetForRound()` setting ALL players `alive=true` including the disconnected one. `starterIds` includes them. Now `alivePlayers()` counts a ghost player who will never act → the game can't reach `alive.length===1` until that ghost is GC'd, **so a 2-player game where one is a disconnected ghost never ends.** **FIX:** `start()` must exclude non-`connected` players from `starterIds` and set ghosts `alive=false` (or remove them). Test: start with one connected + one disconnected slot.

10. **[MEDIUM] Spawn-collision = immediate game over is checked inconsistently between hard drop and normal lock.** `commitLock` checks `engineIsGameOver(board, nextPiece)` and sets gameover if the *next* spawn collides. But the FIRST piece at game start (`startGame` reducer) does `s.current = spawnPiece(pieceAt(seed,0))` with NO collision check. On a fresh board this is safe, but after a `restart` that did not fully clear a board (if `resetForRound` on the server resets but the client `startGame` rebuilds via `createBoard()` — OK), the contract relies on client always rebuilding. If a penalty-laden board were ever reused (bonus modes, or a reconnect resume), the first spawn could silently overlap with no top-out. **FIX:** `startGame` should run `isTopOut` on piece 0 and immediately go to gameover if it collides, mirroring `commitLock`. Cheap insurance; test it.

11. **[MEDIUM] `clearLines` via `Array.filter` corrupts when penalty rows are interleaved with cleared rows, changing board height semantics.** `clearLines` does `kept = board.filter(row => !isFullClearable(row))` then prepends `cleared` empty rows. This is correct for collapse, BUT a full penalty row (`every !== EMPTY` but `includes(PENALTY)`) is correctly KEPT. The issue: `isFullClearable` returns false for a row that is full AND contains even ONE penalty cell. Since penalty lines are full-width all-`8`, that's fine. **But a NORMAL line that a piece completes which happens to sit ON TOP of and merge with... no — penalty rows are separate rows.** The real edge: if a normal piece locks and completes a line in a row that *also* got a penalty cell pushed into it — impossible since penalty rows are whole rows. This is actually correct. **Lower-severity real issue:** `clearLines` preserves penalty rows in place but prepends empties at TOP, so penalty rows "rise" relative to cleared content above them — which is correct gravity. No bug, but the interaction of `clearLines` (prepends at top) and `addPenaltyLines` (appends at bottom, slices `-BOARD_HEIGHT`) must be tested together for the invariant "board always exactly 20 rows." `addPenaltyLines` uses `.slice(-BOARD_HEIGHT)` but `clearLines` builds `[...empty, ...kept]` whose length is always 20 only if `kept.length + cleared === 20` — true by construction. **FIX:** Add a combined invariant test: after any clearLines/addPenaltyLines sequence, `board.length===20 && board.every(r=>r.length===10)`.

12. **[MEDIUM] `addPenaltyLines` discards the TOP rows but the active piece/spawn buffer lives at `y=-1`, so a penalty that fills row 0 should top out but the check is deferred.** `addPenaltyLines` does `survivors = board.slice(n)` (drops top n rows) then appends penalties. If the existing stack reached row 0, those cells are silently discarded by `slice(n)` — meaning **a board that was already topped-out has its evidence erased by the penalty shift**, and the subsequent `isTopOut` on the next spawn might pass because the top rows were cleared by the shift. This LOSES blocks that should have caused game over. **FIX:** Before slicing, check if any of the top `n` rows being discarded are non-empty; if so, the receiver should top out (those blocks can't be pushed off legally). Or: detect overflow and flag top-out. Test P5 explicitly with a stack that reaches the top.

13. **[MEDIUM] The two protocol designs use DIFFERENT event names — the client and server will not connect.** Protocol subsystem uses `join`, `game:start`, `board:line-clear`, `penalty:apply`, `spectrum:update`, `player:topout`. Shared subsystem `EVENTS` uses `room:join`, `game:start`, `player:lineclear`, `game:penalty`, `spectrum:update`, `player:topout`. Server subsystem `C2S/S2C` uses `game:join`, `player:lineclear`, `player:penalty`, `spectrum:update`. Client middleware uses `join`, `lines:cleared`, `penalty`, `game:start:request`. **These are three incompatible event vocabularies.** `game:start` is even used as BOTH a C2S request (server `C2S.START`) and an S2C broadcast (protocol `game:start`) — same string, opposite directions, which will cause the client to receive its own start request echoed or mis-route. **FIX:** Adopt ONE `EVENTS` constant map from `packages/shared` as the single source of truth; delete the ad-hoc string literals in the other three docs. Never reuse one event name for both directions (use `game:start:request` C2S and `game:started` S2C as the shared subsystem does).

14. **[MEDIUM] `restart()` calling `start()` re-runs `Math.random()` so a new seed is correct, but it does NOT validate `status`, allowing a host to restart MID-GAME and desync everyone.** `restart()` checks `isHost` then calls `start()`, which rejects only if `status==='running'`. So restart during `running` is correctly blocked by `start()`'s guard — **but `restart` is documented as valid from `ended|running`**, contradicting `start()`'s `if (this.status === 'running') return false`. So restart-during-running silently no-ops, the host gets a false success path (the socket handler emits START regardless in some code paths). **FIX:** Make `restart()` explicitly allowed only from `ended`; have it reset status to `lobby` first if needed, then `start()`. Ensure the socket handler checks the boolean return before broadcasting `game:start`.

15. **[MEDIUM] `canJoin` allows a reconnecting same-name player during `running`, but `addPlayer` reattaches by name and resets nothing — the reconnected player gets a STALE `currentPieceIndex` and a blank client board, desyncing them permanently.** During `running`, `canJoin(name)` returns true if name exists; `addPlayer` calls `existing.attachSocket(socketId)` and returns. But the client that reconnects runs `startGame`? No — it only re-emits `join`, gets a `room:state`, but **never receives a fresh `game:start` (the seed)** because that already fired. The reconnected client has `seed=null` and cannot derive ANY piece. The protocol's chosen policy is "reconnect during playing = elimination" (option a), which CONTRADICTS `canJoin` returning true for in-game reconnects. **FIX:** Align the two: either reject in-game reconnects (return `JOIN_AFTER_START`, mark eliminated) OR send the seed + current index in the join ack so they can resume. The server subsystem's `canJoin` and the protocol subsystem's "elimination" policy are in direct conflict — pick one and make `canJoin` match.

16. **[LOW] O-piece rotation increments `rotation` index in some code paths but the shape table is identical, so any logic keying off `rotation` (e.g., kick lookups, spectrum debug) for O is harmless but the design is inconsistent.** Shared `rotation.ts` returns `p` unchanged for O (rotation index stays 0). Tetromino doc says "rotation index may still increment but rendering is unchanged — recommend keeping O state = 0." Two recommendations coexist. If server `Piece.rotated()` increments O's rotation but client keeps it 0, a board-state comparison (if ever added) diverges. **FIX:** Mandate O rotation is a strict no-op (rotation stays 0) everywhere; test K2 asserts `rotate(board, O).rotation === 0`.

17. **[LOW] Spectrum is computed from the settled board only, but the design recomputes/broadcasts it on penalty application — the receiver's penalty rows raise spectrum to a misleading value the attacker can't distinguish from real stack.** Not a correctness bug per spec (spectrum is just column heights), but penalty rows being indestructible full-width means a victim's spectrum reads all-10s at the bottom, which is correct. No fix needed; flagged only because the "real-time spectrum" claim must include penalty-induced changes, which the design does cover. Confirm the `spectrum:report` is emitted after `addPenaltyLines`, not only after lock.

18. **[LOW] `hardDrop` and `softDrop` purity is fine, but `hardDrop` followed by `commitLock` in the same reducer means the hard-dropped piece bypasses the one-frame grace — correct per spec — yet the client emits NO distinct event, so if the server ever needs to know lock timing it can't.** Pure determinism is preserved (index advances by 1 regardless of drop type). No fix needed for mandatory; noting that hard-drop and gravity-lock are indistinguishable on the wire, which is acceptable since only `linesCleared` matters for penalties.

**Overall assessment:** The pure shared core (RNG, 7-bag, SRS kick tables) is verifiably correct, but the system has multiple CRITICAL integration-level desync bugs — a double-penalty-report path, an `undefined`-piece on negative index, a false "server can reconstruct boards" anti-cheat claim, three mutually incompatible socket event vocabularies, a non-firing "draw" branch, and penalty/active-piece overlap that corrupts client boards — all of which must be fixed before the deterministic backbone's correctness actually translates into a spec-compliant game.

### completeness critic

Context7 quota is exhausted. I'll proceed with my analysis grounded in the repo state I verified (greenfield) and the internal consistency of the contract, flagging external-version claims as assumptions where I can't re-verify. The contract is internally rich enough that the highest-value findings are its own contradictions and omissions — which I can assess directly.

Here is my exhaustive completeness and spec-compliance audit.

---

1. `[CRITICAL]` **Protocol — two mutually incompatible socket contracts are specified; the bridge cannot work.** The `protocol` subsystem defines events like `join`, `room:state`, `game:start`, `board:line-clear`, `penalty:apply`, `spectrum:update`, `player:topout` with `Ack<T>` callbacks and `ServerToClientEvents`/`ClientToServerEvents` maps in `packages/shared/src/protocol.ts`. The `shared` subsystem defines a **different** `EVENTS` const (`room:join`, `game:start`, `game:action`, `board:update`, `game:penalty`, `player:gameover`, etc.) in `packages/shared/src/types.ts` with **no acks** and a per-step `game:action` input model. The `server` subsystem uses **yet a third** set (`game:join`, `player:lineclear`, `player:spectrum`, `player:topout`, `lobby:update`, `player:penalty`). The `client` subsystem uses a **fourth** (`join`, `lines:cleared`, `board:locked`, `state:reconcile`, `game:start:request`). No two subsystems agree on event names, payload shapes, ack usage, or even the input model (server-authoritative `game:action` vs. client-optimistic `board:locked`+reconcile). **FIX:** Before any code, freeze ONE protocol file (`packages/shared/src/protocol.ts`) as the single source of truth; delete the `EVENTS` map from `types.ts`. Pick one input model (the client-optimistic `board:locked`/`state:reconcile` model is consistent with "client runs pure game logic" and is used by 3 of 4 docs) and make server/client/shared/testing all cite identical strings. This is the #1 thing that fails "fully functional."

2. `[CRITICAL]` **Authority model is internally contradictory: client-authoritative vs. server-authoritative gravity.** The `server` subsystem ships a `loop/GravityLoop.ts` (`setInterval` per Game, 1000ms tick, started in the `start` handler) AND a server-side `game:action` input event — implying the **server** simulates boards and ticks gravity. But the server's own §5 ("server tracks seed + spectrum, NOT full boards") and the `client`/`protocol` subsystems say the **client** runs the gravity loop (`useGameLoop`) and the server stores no boards. A `GravityLoop` that ticks but holds no board has nothing to advance. **FIX:** Decide authority once. Given the spec mandate "client game logic = pure functions" and the no-board server decision, the client owns gravity; **delete `GravityLoop.ts`** and the server `game:action` path, or keep the server authoritative and then the server MUST store boards (contradicting §5). The current mixed design double-implements gravity and will desync. The testing doc's open question ("Are lock-delay/gravity owned by client engine or server Game?") flags exactly this unresolved fork — it must be closed before writing tests, because it determines which project counts the LD1–LD6 branch coverage.

3. `[CRITICAL]` **Determinism hole: per-player penalties make the "same pieces at same coordinates" guarantee FALSE in practice for board outcomes, and the spectrum/penalty timing is unspecified at the wire level.** Pieces are deterministic by index, but the spec's determinism callout is satisfied only for the *piece stream*; the **server-routed penalties** (`penalty:apply count`) are asynchronous and order-dependent, and the contract never defines *when* a received penalty is applied relative to the active piece (the shared `addPenaltyLines` doc says "apply immediately on receipt," the protocol Flow C says client applies on receipt, but the lock machine in `client/gameSlice` has no hook to inject a penalty between ticks safely). If a penalty arrives mid-fall and shifts the settled board up under the active piece, `collides` can retroactively become true and the active piece can overlap garbage with no defined resolution. **FIX:** Specify exactly: penalties queue and flush at the next lock (deterministic, matches "apply before next spawn"); add a `pendingPenalty: number` field to `gameSlice` state and apply it inside `commitLock` before the top-out check. Add a test (missing) for "penalty arrives while a piece is falling → applied at next lock, top-out re-evaluated."

4. `[HIGH]` **Missing module: `loop/GravityLoop.ts` is referenced in the server handler skeleton (`gravityLoops.start(g, io)`, `gravityLoops.stop(g)`) but `gravityLoops` is never defined, constructed, or imported.** The module map lists `loop/GravityLoop.ts` as a *class* `GravityLoop` (per-Game), but the handlers call a singleton-like `gravityLoops` registry with `.start(game, io)`/`.stop(game)`. There is no `GravityLoopRegistry`, no instantiation in `index.ts`, and its lifecycle (stop on `ended`, stop on empty room) is asserted in prose but unwired. **FIX:** Either delete it (per finding #2) or define a concrete `GravityLoopRegistry` class with `Map<room, NodeJS.Timeout>`, instantiate in `index.ts`, pass into `registerSocketHandlers`, and add explicit stop calls on every `ended`/empty-room/disconnect path (timer leak otherwise).

5. `[HIGH]` **`socketMiddleware` outbound emit for line-clear is admitted-incomplete ("impl detail" / `_lockEvent` TODO).** The client doc literally leaves the critical attack path as a comment: "*middleware compares pre/post via a captured snapshot or a dedicated `justLocked` flag (impl detail)*." This is THE penalty trigger; if it doesn't fire, no penalties are ever sent → spec row 9 fails. The `_lockEvent` ephemeral-slice-field pattern is also flagged as "slightly unidiomatic" with no decision. **FIX:** Replace the ephemeral field with an explicit `lockCommitted({ board, cleared, pieceIndex })` action dispatched by `commitLock`; have the middleware listen for that single action type and emit `lines:cleared {cleared}` + `board:locked {board, pieceIndex}`. Forbid emitting from both `hardDrop` and `tick` to avoid double-sends (the doc currently lists both as triggers → duplicate penalty risk).

6. `[HIGH]` **`SPAWN_X`/`SPAWN_Y` import mismatch between shared and client engine.** The client `engine/piece.ts` imports `{ SHAPES, COLORS, SPAWN_X, SPAWN_Y } from '@shared/tetrominoes'`, but the shared `tetrominoes.ts` exports neither `SPAWN_X` nor `SPAWN_Y` (it exports `spawnPiece` and `cellsAt`), and `constants.ts` exports `SPAWN` (a `Record<PieceType,Position>`) and `SPAWN_Y`, not `SPAWN_X`. So `SPAWN_X` is undefined anywhere, and `COLORS`/`spawnPiece` live in different files than imported. **FIX:** Export `SPAWN_X = 3` and `SPAWN_Y = -1` as named constants from `constants.ts`, re-export from the barrel, and make the client engine import the canonical `spawnPiece` from shared rather than redefining it (the contract says client engine "re-exports shared pure functions" but then redefines `spawnPiece` with mismatched imports — pick re-export to stay bit-identical).

7. `[HIGH]` **`Cell` type drift: shared defines `Cell = 0..9` (adds `9` ghost) but multiple subsystems and the spec authority say `Cell = 0..8`.** The Tetromino authority and `types.ts` (in the protocol section) say `Cell = 0|1|...|8`. The shared subsystem's `types.ts` says `0..9` with `9` = ghost. The client `lines.ts`/`penalty.ts` allocate `Array<Cell>` and `clearLines` does `row.includes(PENALTY)` — if ghost `9` ever lands in the authoritative board, `every(c => c !== EMPTY)` would treat it as filled and a ghost-tainted row could clear or block incorrectly. **FIX:** Keep ghost strictly out of the authoritative `Board` (it's render-only via a separate overlay type `RenderCell`). Define `Cell = 0..8` for the authoritative board; introduce `RenderCell = Cell | 9` used ONLY by `selectRenderBoard`/`overlayForRender`. Add an invariant test: no authoritative board cell is ever `9`.

8. `[HIGH]` **No input validation spec for room/player names, yet handlers call `validateRoom`/`validateName` that are never defined.** The server handler skeleton calls `validateRoom(room)` and `validateName(name)` and the error taxonomy has `NAME_INVALID`/`ROOM_NAME_INVALID`, but no rules exist (max length? allowed charset? case sensitivity for uniqueness? empty/whitespace?). `useParams()` is untrusted URL input. Edge cases: empty name (`/room/`), name with `/` or spaces, very long name (DoS), duplicate name differing only by case, room name collision with a reserved route. **FIX:** Specify concretely: `name`/`room` must match `^[A-Za-z0-9_-]{1,16}$`, trimmed, uniqueness case-insensitive within room; reject otherwise with `NAME_INVALID`/`ROOM_NAME_INVALID`. Implement `validateRoom`/`validateName` in `socket/validation.ts` (a real file, currently missing) and add unit tests (cheap branch coverage).

9. `[HIGH]` **`playerId` identity is contradictory across subsystems, breaking reconnect AND host migration tests.** Protocol says `playerId = socket.id` (changes on reconnect; reconnect = elimination). Server `Player` says `id` is a stable `uuid` that "survives reconnect," matched by name, with separate volatile `socketId`. Client `lobby` state stores `myId = socket.id`. So the client's `myId` (socket.id) will **never equal** the server's `Player.id` (uuid) used in `hostId`, `winnerId`, `player:gameover.playerId` — every `selectIsHost = myId === hostId`, "is this me?" check, and opponent-vs-self routing **silently breaks**. **FIX:** Pick ONE id scheme. Use the server-assigned stable `Player.id` (uuid) everywhere; the server must send the client its own `id` on join (the join ack / `room:state` must include `myId`), and the client stores THAT, not `socket.id`. Update `lobby/connected` to take `{ myId }` from the server payload, not from `socket.id`.

10. `[HIGH]` **Reconnect/refresh policy "disconnect during play = elimination" likely fails 42 peer-eval's "fully functional" + the spec's reconnection expectation.** A peer evaluator who refreshes the browser mid-game (extremely common during evaluation) will be instantly eliminated with no resume — this reads as a bug, not a feature, and the spec/BrowserRouter deep-link design implies refresh should rejoin. The contract acknowledges this as an "open question" but ships the harsh option for mandatory. **FIX:** At minimum, in `waiting`/`finished` states a refresh must cleanly rejoin (the contract allows this). For `playing`, add a short reconnect grace (e.g., keep the `Player` slot for ~3–5s on `disconnect`, re-bind on same-name reconnect) before elimination — deterministic enough and far better UX. If kept as instant-eliminate, explicitly document it on screen ("refreshing forfeits the round") so evaluators don't read it as broken.

11. `[HIGH]` **Coverage threshold risk: server `socket/**`, `http/**`, `index.ts`, and client `socket/**`, `main.tsx` are excluded — but `models/` `GravityLoop` and `SocketSession` are NOT, and a large share of branch-heavy code (handlers) is now untested AND uncounted, leaving the *counted* set dominated by code that must individually clear 70/50.** More importantly, **integration tests are the only thing exercising socket handlers**, and the contract flags them as "flaky in CI." If integration is excluded from coverage (it is — `socket/**` excluded) and also flakes out, there is zero verification of the entire networking layer for a "fully functional" gate. **FIX:** Keep the per-handler **mock-`io` unit tests** (the documented fallback) as first-class, NOT just a fallback — they're deterministic and give real confidence even though `socket/**` is coverage-excluded. Also move pure validation/`SocketSession` logic OUT of `socket/**` into a counted location so it contributes to the 70%.

12. `[MEDIUM]` **Vitest `projects` with inline `plugins: [(await import(...)).default()]` requires top-level `await` in `vitest.config.ts` and an `extends: true` semantics that must be verified for 3.2; if wrong, the whole suite won't load and coverage can't run.** Both the stack doc and testing doc use `await import` at config top level. This is plausible in an ESM `.ts` config but is exactly the kind of version-sensitive thing that breaks the gate at the worst time. I could not re-verify against Context7 (quota exhausted) — **flagging as an unverified assumption.** **FIX:** Add a CI smoke step `vitest run --coverage` on the empty scaffold first; if the inline `await import` fails, hoist the plugin import to a top-level `import tsconfigPaths from 'vite-tsconfig-paths'` and reference it directly (avoids top-level await entirely). Pin `@vitest/coverage-v8` to the exact `vitest` version in the lockfile.

13. `[MEDIUM]` **`bundle.js` smoke test is recommended but not in the plan; Vite single-bundle config is fragile.** The risk section says "add a smoke test asserting `dist/bundle.js` exists post-build," but no such test exists in the testing matrix, and `inlineDynamicImports:true` + `manualChunks:undefined` can conflict with `@vitejs/plugin-react`'s preamble or with any future dynamic import, silently producing extra chunks → the spec's literal `bundle.js` requirement fails at eval. **FIX:** Add a post-build assertion (Node script or a Vitest test in a `build` project): `existsSync('packages/client/dist/bundle.js')` AND `dist/index.html` contains exactly one `<script src="/bundle.js">`. Run it in the `build` npm script.

14. `[MEDIUM]` **SPA deep-link refresh on `/<room>/<player>` and asset MIME: the `'/*splat'` fallback returns `index.html` for ALL unmatched paths including `/socket.io/*` if static/io ordering is wrong, and there's no `/favicon.ico`/asset 404 handling.** The fallback after `express.static` is correct in the happy path, but the contract never verifies the actual order at runtime, and a request for a missing asset returns `index.html` with 200 (not 404), which can mask bugs and serve HTML where JS is expected. **FIX:** Add the I10 integration test (`GET /room/alice` → `index.html`) AND a negative test (`GET /bundle.js` → JS content-type, not HTML). Ensure socket.io is attached to the same `httpServer` before `listen`, and that the splat route excludes `/socket.io` (socket.io intercepts the upgrade before Express, so OK, but assert it).

15. `[MEDIUM]` **No `.gitignore` / `.env.example` exist yet, and the repo currently has NO `.gitignore` — a `git add .` would commit `node_modules` and any future `.env`.** The compliance matrix flags this (row 20) but it's still unaddressed in the actual repo (verified: only the PDF is present, no `.gitignore`). Spec: exposing secrets = automatic project failure. **FIX:** Create `.gitignore` (`node_modules`, `dist`, `coverage`, `.env`, `.env.*` except `.env.example`) and a value-free `.env.example` (`PORT=3000`, `CLIENT_ORIGIN=http://localhost:5173`) as the **first commit**, before any code. Add a CI/check `git ls-files | grep -E '\.env$'` must be empty.

16. `[MEDIUM]` **Penalty rule edge: spec says "full-width indestructible, NO hole," but classic-Tetris-trained evaluators expect a hole — and more importantly the contract never confirms this with the team and it materially affects whether garbage is survivable.** Full-width indestructible lines are *unclearable forever*, so they only ever accumulate → in a long multiplayer game everyone tops out from garbage regardless of skill. This is a faithful spec reading but a gameplay risk and an eval-discussion risk. **FIX:** Keep full-width per spec (it's the literal requirement), but (a) add the explicit test that a full penalty row never clears (L6/L7 — present, good), and (b) put a one-line note in the README citing the spec page so evaluators don't flag it as a bug. Confirm with the team before build.

17. `[MEDIUM]` **`computeSpectrum` is documented as recomputed "on every settled-board change" but the client only emits `spectrum:report` after lock/clear/penalty — there is no spectrum update when a player **tops out** or when penalties **reduce** to zero, and dead players' spectra may go stale.** Also, opponents must see the spectrum "in real-time"; if a client tab is RAF-throttled in the background, its `spectrum:report` stalls and opponents see a frozen silhouette. **FIX:** Emit a final `spectrum:report` on top-out; have the server zero/freeze a dead player's spectrum on `player:gameover`. Document that spectrum reflects settled pile only (already specified) and accept background-tab staleness (cosmetic) — but ensure the *server* relays the last known spectrum on any new opponent's join so late-rendered panels aren't empty.

18. `[MEDIUM]` **Host migration heir selection is inconsistent: `electHost` picks `players.find(p => p.connected) ?? players[0]`, but the protocol/compliance docs say "players[0] of remaining roster."** If the first-joined player is momentarily disconnected (grace window) but still in the roster, `electHost` skips them in favor of a later connected player, then a different doc would pick `players[0]`. Two different heirs = nondeterministic host across reconnect races. Also `electHost` is called on `removePlayer` AND `handleDisconnect` AND inside both — possible double-election. **FIX:** Define one rule: heir = earliest-joined **still-present** player (regardless of momentary `connected`), deterministic by insertion order. Make `electHost` idempotent and call it exactly once per leave/disconnect. Add test GM7 variant: host disconnects with a grace-window player still in roster → that player becomes host.

19. `[MEDIUM]` **Solo-mode win/end semantics are ambiguous across docs (`winnerId: null` vs `winnerId: self`) and the UI overlay branch for solo is underspecified.** Server `winner()` returns `solo-end` → `winnerId:null`; client `GameOverlay` OV3 shows neutral "Game Over"; but protocol Flow E.5 says `winnerId:null OR self per UI taste`. Inconsistent → tests GM13/OV3 may assert different things. **FIX:** Fix solo to `winnerId:null, reason:'solo-end'` everywhere; overlay shows "Game Over" + Restart for the (sole, host) player. Lock it in one line in the protocol doc and assert identically in GM13 + OV3 + I-tests.

20. `[MEDIUM]` **`canJoin` reconnect path can throw on `start()` when a name is reclaimed but `addPlayer` runs during `playing`.** `addPlayer` calls `findByName` and reattaches an existing player even while `running`; but the JOIN handler gates on `canJoin` which only allows reconnect of an existing in-game name. If the original player was already eliminated on disconnect (per finding #10's policy), the reattached `Player.alive` is `false`, so the reconnected client joins a `running` game as a dead player with a frozen empty board and no clear UX. **FIX:** Define the reconnect-while-dead state explicitly: either spectator (read-only `room:state` + spectrums) or "wait for next round." Add `Player.spectator`/`connected` handling and a test for "reconnect after mid-game elimination."

21. `[MEDIUM]` **No handling for `start()` with zero connected players or a game where the only player left mid-lobby; `start` allows `players.length >= 1` but doesn't require the starter to be alive/connected.** Also `restart()` just calls `start()` which re-seeds even from `running` (the guard `if (status==='running') return false` in `start` means `restart`→`start` returns false when running — so **restart from a running game silently no-ops**, contradicting the state machine's "running → running via restart"). **FIX:** Give `restart` its own logic (force status to `lobby` then `start`, or bypass the running-guard) so restart works from both `ended` and `running`. Add test GM15 for restart-from-running.

22. `[MEDIUM]` **`erasableSyntaxOnly` + `verbatimModuleSyntax` will hard-error on patterns the contract uses.** The shared `EVENTS` object is fine, but any `import { X }` that's type-only must use `import type`, and the contract's example imports (e.g., server `Piece.ts` `import type {...}` mixed with value imports) are mostly OK — but `RoomStatePayload extends RoomState {}` (empty interface extends) plus the `as const` discipline must be enforced. The real trap: the testing/golden tests reference `PieceType[]` literals and the `Coord = readonly [number,number]` tuples — `noUncheckedIndexedAccess` makes `SHAPES[type][rotation]` possibly-undefined, so every `shapeCells`/`cellsAt`/`pieceAt` (`bag[inBag]!`) needs `!` or guards (the contract uses `!` in rng but NOT consistently in engine `pieceCells`). **FIX:** Audit all array indexing under `noUncheckedIndexedAccess`; add non-null assertions or guards in `pieceCells`, `collides` (`board[row][col]`), `clearLines`, `computeSpectrum` (`board[r][c]`). Without this, `tsc -b` fails and `npm run build` (build-order dependency for server static serving) never produces `dist`.

23. `[MEDIUM]` **Build-order / dev-proxy gap: client dev runs on 5173 with a proxy to 3000, but `game:start` `cors.origin` is set to `CLIENT_ORIGIN`; if a teammate runs production-style (`npm start`) the client is served from 3000 and the dev proxy is absent — fine — but the `.env.example` must define `CLIENT_ORIGIN`, and `config.ts` (referenced, not shown in detail) must default it.** Also `build` order is shared→client→server, and the server's static path `../../client/dist` only exists after the client build; running `npm start` before `npm run build` serves nothing (blank page at eval). **FIX:** Make `npm start` depend on/verify `packages/client/dist/index.html` exists (or have `start` run `build` first / print a clear error). Document the exact eval run sequence (`npm i && npm run build && npm start`) in README.

24. `[LOW]` **Soft-drop model is unresolved (`GameAction` lacks `softDropStart`/`softDropEnd`, but `useKeyboard` dispatches `setSoftDrop(true/false)` and `useGameLoop` reads `softDropActive`).** The shared `GameAction` union has only `softDrop` (discrete step), while the client uses a held-state toggle. If the server-authoritative `game:action` path were used (finding #2), soft-drop-as-toggle has no representation. With client authority it's fine, but the docs disagree. **FIX:** With client authority, drop `softDrop` from any wire action; keep `setSoftDrop` purely local. Remove `game:action` from `ClientToServerEvents` entirely.

25. `[LOW]` **`NextPiece` preview depth `PREVIEW_COUNT` undefined; spec mandates "next" (singular). Defaulting to a queue but `nextQueue` is referenced before definition in `gameSlice`.** Minor, but `nextQueue` and `PREVIEW_COUNT` are used in `startGame`/`commitLock` without being defined or imported. **FIX:** Define `PREVIEW_COUNT = 1` and `nextQueue(seed, from, count)` in `engine/piece.ts`, export, import in the slice. Render exactly one next piece for mandatory.

26. `[LOW]` **No explicit test or handling for "host clicks Start in an empty-of-others solo room then a second player's `join` race arrives in the same tick."** `start()` freezes `starterIds` from current `players`; a join landing microseconds before vs after `start` changes whether it's solo or 2-player (affects win logic `starters>=2`). **FIX:** Server is single-threaded/event-loop atomic, so order is deterministic per socket event — document that `start` and `join` are processed in receipt order, and that a join arriving before `start` is included, after is rejected. Add an integration test for the boundary.

27. `[LOW]` **No keyboard-focus / multi-field concern: arrow keys are bound to `window`; if the room has an input (name entry on `/` landing), arrows scroll/move there too, and `preventDefault` on space/arrows globally can break form fields.** Landing page (`<Landing/>`) is "optional" and unspecified. **FIX:** Bind keyboard only when `enabled = alive && status==='playing'` (already gated in `useKeyboard`) AND guard against active text inputs (`document.activeElement.tagName !== 'INPUT'`) — but that touches `document` (allowed, not `this`). Specify the landing route's join form behavior.

28. `[LOW]` **Spectrum payload includes `name` redundantly on every update (bandwidth) and opponent identity relies on it, but `OpponentView`/`opponents` slice keys by `id`; if `setOpponents` isn't dispatched before a `spectrum:update` arrives (race on fast start), `s.byId[id]` is undefined and the update is silently dropped.** **FIX:** Make `spectrumUpdate` upsert (create the opponent entry if missing using the payload's `id`+`name`) rather than no-op on missing id.

29. `[LOW]` **Testing doc's `Game` constructor signature mismatch: tests call `new Game(room, io)` (GM1) but the server `Game` constructor is `constructor(room: string)` with NO `io` — `Game` returns `PenaltyDistribution`/`WinResult` data and the socket layer emits.** The two designs disagree on whether `Game` knows about `io`. **FIX:** Keep `Game` io-agnostic (server design is cleaner and more testable); rewrite the GM5/GM12/GM17 test assertions to check **returned data** (distribution/winResult) instead of "emitted to mock io," reserving mock-io assertions for the socket-handler unit tests.

30. `[LOW]` **No defined behavior for a `lines:cleared` / `player:topout` report from a player whose game isn't `running` or who is already dead (replay/duplicate/malicious).** `withGame` guards room existence but not `status==='running'` or `player.alive`. A stale/duplicate `player:topout` could re-trigger `checkWinner` and emit a second `game:over`. **FIX:** In each running-state handler, early-return unless `g.status==='running'` and the reporting player `alive`. Add idempotency: `eliminate` on an already-dead player is a no-op (the `find` + `eliminate` path should guard). Cheap branch coverage.

**Overall assessment:** The pure-engine/determinism/shared layer is solid and well-specified, but the four subsystem docs were written independently and **do not share a single protocol, authority model, or player-identity scheme** — those three contradictions (findings #1, #2, #9) plus the unwired `GravityLoop`, the admitted-TODO line-clear emit, and the harsh refresh-eliminates policy are concrete blockers that would cause a 42 "fully functional" evaluation to fail until the protocol and authority model are frozen as one source of truth before any code is written.
