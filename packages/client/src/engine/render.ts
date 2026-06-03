import { BOARD_HEIGHT, BOARD_WIDTH, EMPTY, GHOST } from '@shared/constants';
import { cellsAt } from '@shared/tetrominoes';
import type { ActivePiece, Board, RenderCell } from '@shared/types';
import { pieceColor } from './piece';

/**
 * Build a render grid: the authoritative board plus the ghost (9, only on empty cells)
 * and the current piece (its color, drawn on top). The authoritative `board` never
 * contains 9 — the ghost lives only here. PURE.
 */
export const overlayForRender = (
  board: Board,
  current: ActivePiece | null,
  ghost: ActivePiece | null,
): RenderCell[][] => {
  const grid: RenderCell[][] = board.map((row) => [...row] as RenderCell[]);
  if (ghost) {
    for (const [col, row] of cellsAt(ghost)) {
      if (row >= 0 && row < BOARD_HEIGHT && col >= 0 && col < BOARD_WIDTH && grid[row]![col] === EMPTY) {
        grid[row]![col] = GHOST;
      }
    }
  }
  if (current) {
    const color = pieceColor(current.type);
    for (const [col, row] of cellsAt(current)) {
      if (row >= 0 && row < BOARD_HEIGHT && col >= 0 && col < BOARD_WIDTH) {
        grid[row]![col] = color;
      }
    }
  }
  return grid;
};
