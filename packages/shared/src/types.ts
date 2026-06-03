// @red-tetris/shared — engine-level base types.
// Pure, framework-agnostic. Coordinates are y-down, origin (0,0) top-left,
// x ∈ 0..9 (column), y ∈ 0..19 (row).

/** Authoritative board cell: 0 empty, 1-7 piece colors, 8 indestructible penalty. */
export type Cell = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Render-only cell: authoritative cells plus 9 (ghost) used ONLY in the client overlay. */
export type RenderCell = Cell | 9;

/** A filled piece color id (no empty, no penalty). */
export type FilledColor = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** A box-local or board cell coordinate: [column, row]. */
export type Coord = readonly [col: number, row: number];

/** An absolute board position. */
export interface Position {
  readonly x: number;
  readonly y: number;
}

/** The playing field: board[row][col], 20 rows × 10 cols. Engine returns NEW boards (never mutates). */
export type Board = Cell[][];

/** Per-column highest-block heights, length 10, each 0..20. */
export type Spectrum = number[];

/** The seven tetromino kinds. */
export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

/** Rotation state index (SRS): 0 spawn, 1 = R (CW), 2, 3 = L. */
export type RotationState = 0 | 1 | 2 | 3;

/** A live falling piece. Immutable; engine functions return new instances. */
export interface ActivePiece {
  readonly type: PieceType;
  readonly rotation: RotationState;
  readonly x: number;
  readonly y: number;
  readonly grounded?: boolean;
}
