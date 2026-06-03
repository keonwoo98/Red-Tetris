import { BOARD_HEIGHT, BOARD_WIDTH } from '@shared/constants';
import { cellsAt } from '@shared/tetrominoes';
import type { ActivePiece, Board } from '@shared/types';
import { cloneBoard } from './board';
import { isGrounded } from './movement';
import { pieceColor } from './piece';

/** Merge a piece into a NEW board; cells with row<0 (above the board) are dropped. PURE. */
export const lockPiece = (board: Board, p: ActivePiece): Board => {
  const next = cloneBoard(board);
  const color = pieceColor(p.type);
  for (const [col, row] of cellsAt(p)) {
    if (row >= 0 && row < BOARD_HEIGHT && col >= 0 && col < BOARD_WIDTH) {
      next[row]![col] = color;
    }
  }
  return next;
};

export interface LockState {
  piece: ActivePiece;
  wasGroundedLastFrame: boolean;
}

export type LockOutcome =
  | { kind: 'falling'; state: LockState }
  | { kind: 'grounded'; state: LockState }
  | { kind: 'lock' };

/**
 * One frame of the lock state machine implementing "immobile only on the next frame":
 * - not grounded → fall one row, disarm.
 * - grounded for the first time → stay, arm (one-frame grace for last-moment adjustments).
 * - grounded again (was grounded last frame) → lock (caller runs commitLock).
 * `isGrounded` is recomputed every step, so a move/rotate that un-grounds the piece re-arms it. PURE.
 */
export const lockStep = (board: Board, s: LockState): LockOutcome => {
  if (!isGrounded(board, s.piece)) {
    return {
      kind: 'falling',
      state: { piece: { ...s.piece, y: s.piece.y + 1 }, wasGroundedLastFrame: false },
    };
  }
  if (s.wasGroundedLastFrame) {
    return { kind: 'lock' };
  }
  return { kind: 'grounded', state: { piece: s.piece, wasGroundedLastFrame: true } };
};
