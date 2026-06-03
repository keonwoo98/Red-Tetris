import { BOARD_HEIGHT, BOARD_WIDTH, EMPTY, PENALTY } from '@shared/constants';
import type { Board, Cell } from '@shared/types';
import { cloneBoard } from './board';

const penaltyRow = (): Cell[] => Array.from({ length: BOARD_WIDTH }, () => PENALTY as Cell);

/**
 * Add `n` indestructible full-width penalty rows at the bottom, pushing the stack up.
 * If any of the `n` rows shoved off the top held blocks, the receiver tops out. PURE.
 */
export const addPenaltyLines = (board: Board, n: number): { board: Board; toppedOut: boolean } => {
  if (n <= 0) return { board: cloneBoard(board), toppedOut: false };
  const lift = Math.min(n, BOARD_HEIGHT);
  const shovedOff = board.slice(0, lift);
  const toppedOut = shovedOff.some((row) => row.some((c) => c !== EMPTY));
  const survivors = board.slice(lift).map((row) => [...row]);
  const rows = Array.from({ length: lift }, penaltyRow);
  return { board: [...survivors, ...rows], toppedOut };
};
