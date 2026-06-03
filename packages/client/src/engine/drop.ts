import type { ActivePiece, Board } from '@shared/types';
import { isGrounded, moveDown } from './movement';

/** Soft drop = one gravity step (returns SAME piece if grounded). PURE. */
export const softDrop = (board: Board, p: ActivePiece): ActivePiece => moveDown(board, p);

/** Drop straight down to the resting position (not yet locked). PURE. */
export const hardDrop = (board: Board, p: ActivePiece): ActivePiece => {
  let cur = p;
  while (!isGrounded(board, cur)) {
    cur = { ...cur, y: cur.y + 1 };
  }
  return cur;
};

/** The landing silhouette (same as hardDrop position) used for the ghost overlay. PURE. */
export const ghostPiece = (board: Board, p: ActivePiece): ActivePiece => hardDrop(board, p);
