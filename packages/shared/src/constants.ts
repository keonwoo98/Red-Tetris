import type { Cell, PieceType, Position } from './types.js';

export const BOARD_WIDTH = 10 as const;
export const BOARD_HEIGHT = 20 as const;
export const SPECTRUM_LENGTH = 10 as const;

export const EMPTY = 0 as const;
export const PENALTY = 8 as const; // indestructible garbage (authoritative)
export const GHOST = 9 as const; // RENDER-ONLY; never in an authoritative Board

export const GRAVITY_MS = 1000 as const; // constant gravity (mandatory, level 0)
export const SOFT_DROP_FACTOR = 20 as const;
export const SOFT_DROP_MS = 50 as const; // GRAVITY_MS / SOFT_DROP_FACTOR
export const LOCK_DELAY_FRAMES = 1 as const; // one-frame grace ("immobile only on the next frame")

export const SPAWN_X = 3 as const;
export const SPAWN_Y = -1 as const;
export const PREVIEW_COUNT = 5 as const; // next-queue depth (guideline standard)

/** Per-piece spawn origin (box top-left placed on the board), y-down. */
export const SPAWN: Record<PieceType, Position> = {
  I: { x: 3, y: -1 },
  O: { x: 3, y: -1 },
  T: { x: 3, y: -1 },
  S: { x: 3, y: -1 },
  Z: { x: 3, y: -1 },
  J: { x: 3, y: -1 },
  L: { x: 3, y: -1 },
};

/** Color id per piece type (1-7). Matches `tetrominoes.COLORS`. */
export const COLOR_ID: Record<PieceType, Cell> = { I: 1, O: 2, T: 3, S: 4, Z: 5, J: 6, L: 7 };

/** Cell id → CSS color. 0 transparent, 1-7 piece colors, 8 penalty grey, 9 ghost white. */
export const COLOR_HEX: Record<number, string> = {
  0: 'transparent',
  1: '#00FFFF',
  2: '#FFFF00',
  3: '#A000F0',
  4: '#00F000',
  5: '#F00000',
  6: '#0000F0',
  7: '#F0A000',
  8: '#808080',
  9: '#FFFFFF',
};

// ---- bonus: scoring, game modes, feature flags ----

/** Base points by number of lines cleared at once (index 0..4), multiplied by the current level. */
export const SCORE_TABLE = [0, 100, 300, 500, 800] as const;
export const LINES_PER_LEVEL = 10 as const;

/** Game modes (bonus). `classic` is the mandatory behaviour. */
export type GameMode = 'classic' | 'invisible' | 'rising';

/** Rising-gravity mode: gravity speeds up every level, clamped. */
export const RISING_GRAVITY_MIN_MS = 120 as const;
export const RISING_GRAVITY_STEP_MS = 80 as const;

/** Client build-time feature flags (bonus features are additive; classic play ignores them). */
export const FEATURES = {
  SCORING: true,
  GAME_MODES: true,
  FRP: true,
} as const;

