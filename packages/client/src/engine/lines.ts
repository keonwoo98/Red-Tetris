import { BOARD_HEIGHT, EMPTY, PENALTY } from '@shared/constants';
import type { Board } from '@shared/types';
import { emptyRow } from './board';

/**
 * Remove completed lines and collapse the stack. A line clears only if it is full AND
 * contains no penalty cell — indestructible penalty lines (full-width 8s) never clear. PURE.
 */
export const clearLines = (board: Board): { board: Board; cleared: number } => {
  const kept = board.filter((row) => {
    const isFull = row.every((c) => c !== EMPTY);
    const hasPenalty = row.some((c) => c === PENALTY);
    return !(isFull && !hasPenalty);
  });
  const cleared = BOARD_HEIGHT - kept.length;
  const refill = Array.from({ length: cleared }, emptyRow);
  return { board: [...refill, ...kept], cleared };
};
