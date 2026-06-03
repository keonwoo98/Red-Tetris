import { spawnPiece } from '@shared/tetrominoes';
import type { ActivePiece, Board, PieceType } from '@shared/types';
import { collides } from './collision';

/** True if a piece collides at its current position (used right after spawn). PURE. */
export const isGameOver = (board: Board, piece: ActivePiece): boolean => collides(board, piece);

/** True if a freshly spawned piece of `type` cannot enter the board. PURE. */
export const isTopOut = (board: Board, type: PieceType): boolean =>
  collides(board, spawnPiece(type));
