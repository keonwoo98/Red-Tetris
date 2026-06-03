import { BOARD_HEIGHT, BOARD_WIDTH, EMPTY } from '@shared/constants';
import type { Board, Cell } from '@shared/types';

/** A fresh empty row (length 10). PURE. */
export const emptyRow = (): Cell[] => Array.from({ length: BOARD_WIDTH }, () => EMPTY as Cell);

/** A fresh empty 20×10 board. PURE. */
export const createBoard = (): Board => Array.from({ length: BOARD_HEIGHT }, emptyRow);

/** A deep copy of a board (rows cloned). PURE. */
export const cloneBoard = (b: Board): Board => b.map((row) => [...row]);

/** True if (col,row) is inside the board (row<0 is "above board", not in-bounds). PURE. */
export const inBounds = (col: number, row: number): boolean =>
  col >= 0 && col < BOARD_WIDTH && row >= 0 && row < BOARD_HEIGHT;
