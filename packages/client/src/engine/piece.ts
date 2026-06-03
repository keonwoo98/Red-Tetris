import { cellsAt, COLORS } from '@shared/tetrominoes';
import { pieceAt } from '@shared/rng';
import type { ActivePiece, Cell, PieceType } from '@shared/types';

// Re-export the canonical spawn (bit-identical with the server) — single source of truth.
export { spawnPiece } from '@shared/tetrominoes';

/** Absolute occupied cells as {col,row} objects (client-ergonomic view of shared cellsAt). PURE. */
export const pieceCells = (p: ActivePiece): { col: number; row: number }[] =>
  cellsAt(p).map(([col, row]) => ({ col, row }));

/** Color id (1-7) for a piece type. PURE. */
export const pieceColor = (type: PieceType): Cell => COLORS[type];

/**
 * The next `count` piece types starting at absolute index `from`, derived from the seed.
 * All randomness flows from the server seed via `pieceAt`. PURE.
 */
export const nextQueue = (seed: number, from: number, count: number): PieceType[] =>
  Array.from({ length: count }, (_, i) => pieceAt(seed, from + i));
