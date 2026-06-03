import { SPAWN } from './constants';
import type { ActivePiece, Cell, Coord, PieceType, RotationState } from './types';

// SHAPES[type][rotation] = the 4 occupied (col,row) cells inside the piece's bounding box.
// I/O use a 4×4 box; J/L/S/T/Z use a 3×3 box. Data is the y-down table (origin top-left).
export const SHAPES: Record<PieceType, readonly [Coord, Coord, Coord, Coord][]> = {
  I: [
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ], // 0 spawn
    [
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3],
    ], // 1 R
    [
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2],
    ], // 2
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
    ], // 3 L
  ],
  O: [
    [
      [1, 1],
      [2, 1],
      [1, 2],
      [2, 2],
    ],
    [
      [1, 1],
      [2, 1],
      [1, 2],
      [2, 2],
    ],
    [
      [1, 1],
      [2, 1],
      [1, 2],
      [2, 2],
    ],
    [
      [1, 1],
      [2, 1],
      [1, 2],
      [2, 2],
    ],
  ],
  T: [
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
  ],
  S: [
    [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
    [
      [1, 1],
      [2, 1],
      [0, 2],
      [1, 2],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
  ],
  Z: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
    [
      [2, 0],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    [
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ],
  ],
  J: [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [2, 0],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
    [
      [1, 0],
      [1, 1],
      [0, 2],
      [1, 2],
    ],
  ],
  L: [
    [
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [0, 2],
    ],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
  ],
};

/** Color id per piece (kept identical to constants.COLOR_ID — one source of truth). */
export const COLORS: Record<PieceType, Cell> = { I: 1, O: 2, T: 3, S: 4, Z: 5, J: 6, L: 7 };

// ---- SRS wall-kick tables, y-down (pre-converted from the standard y-up literature) ----
// Key: `${from}>${to}` (e.g. '0>1'). Value: 5 candidate (dx,dy) offsets; first collision-free wins.
export const KICKS_JLSTZ: Record<string, readonly Coord[]> = {
  '0>1': [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  '1>0': [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  '1>2': [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  '2>1': [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  '2>3': [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  '3>2': [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  '3>0': [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  '0>3': [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
};

export const KICKS_I: Record<string, readonly Coord[]> = {
  '0>1': [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, 1],
    [1, -2],
  ],
  '1>0': [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, -1],
    [-1, 2],
  ],
  '1>2': [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, -2],
    [2, 1],
  ],
  '2>1': [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, 2],
    [-2, -1],
  ],
  '2>3': [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, -1],
    [-1, 2],
  ],
  '3>2': [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, 1],
    [1, -2],
  ],
  '3>0': [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, 2],
    [-2, -1],
  ],
  '0>3': [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, -2],
    [2, 1],
  ],
};

// ---- pure accessors ----

/** Wall-kick lookup key for a rotation transition, e.g. (0,1) → '0>1'. PURE. */
export const kickKey = (from: RotationState, to: RotationState): string => `${from}>${to}`;

/** The 4 box-local cells for a piece in a rotation state. PURE (treat result as readonly). */
export const shapeCells = (type: PieceType, rot: RotationState): readonly Coord[] =>
  SHAPES[type][rot]!;

/** Candidate wall kicks for a rotation transition. O never kicks; I and JLSTZ use distinct tables. PURE. */
export const kicksFor = (
  type: PieceType,
  from: RotationState,
  to: RotationState,
): readonly Coord[] => {
  if (type === 'O') return [[0, 0]];
  const table = type === 'I' ? KICKS_I : KICKS_JLSTZ;
  return table[kickKey(from, to)] ?? [[0, 0]];
};

/** Absolute board cells a piece currently occupies. PURE. */
export const cellsAt = (p: ActivePiece): Coord[] =>
  SHAPES[p.type][p.rotation]!.map(([c, r]) => [p.x + c, p.y + r] as Coord);

/** A fresh piece at its spawn origin, rotation 0. PURE. */
export const spawnPiece = (type: PieceType): ActivePiece => ({
  type,
  rotation: 0,
  x: SPAWN[type]!.x,
  y: SPAWN[type]!.y,
});
