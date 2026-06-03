import { BOARD_HEIGHT, BOARD_WIDTH, EMPTY } from '@shared/constants';
import { cellsAt } from '@shared/tetrominoes';
import type { ActivePiece, Board } from '@shared/types';

/**
 * True if the piece overlaps a wall, the floor, or a settled cell.
 * row < 0 is allowed (the spawn area above the visible board) as long as the column is in range.
 * PURE.
 */
export const collides = (board: Board, p: ActivePiece): boolean => {
  for (const [col, row] of cellsAt(p)) {
    if (col < 0 || col >= BOARD_WIDTH) return true;
    if (row >= BOARD_HEIGHT) return true;
    if (row >= 0 && board[row]![col] !== EMPTY) return true;
  }
  return false;
};
