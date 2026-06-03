import type { ActivePiece, Board } from '@shared/types';
import { collides } from './collision';

/** Move one column left; returns the SAME piece if blocked. PURE. */
export const moveLeft = (board: Board, p: ActivePiece): ActivePiece => {
  const moved: ActivePiece = { ...p, x: p.x - 1 };
  return collides(board, moved) ? p : moved;
};

/** Move one column right; returns the SAME piece if blocked. PURE. */
export const moveRight = (board: Board, p: ActivePiece): ActivePiece => {
  const moved: ActivePiece = { ...p, x: p.x + 1 };
  return collides(board, moved) ? p : moved;
};

/** Move one row down; returns the SAME piece if blocked. PURE. */
export const moveDown = (board: Board, p: ActivePiece): ActivePiece => {
  const moved: ActivePiece = { ...p, y: p.y + 1 };
  return collides(board, moved) ? p : moved;
};

/** True if the piece cannot move down one row (resting on the pile or floor). PURE. */
export const isGrounded = (board: Board, p: ActivePiece): boolean =>
  collides(board, { ...p, y: p.y + 1 });
